import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { GoogleGenAI } from '@google/genai';
import { createPoolFromEnv, describeDatabaseSource, verifyPoolConnection } from './db.js';
import { runMigrations } from './migrate.js';

const app = express();
const port = Number(process.env.PORT || 10000);
const pool = createPoolFromEnv();
const BCRYPT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

const ROLES = ['admin', 'waiter', 'kitchen', 'excursion', 'client'];
const STAFF_ROLES = ['admin', 'waiter', 'kitchen', 'excursion'];
const OPERATIONAL_ROLES = ['admin', 'waiter', 'kitchen', 'excursion'];

const ROLE_LABELS = {
  admin: 'Dueño',
  waiter: 'Mesonero',
  kitchen: 'Cocina',
  excursion: 'Excursiones',
  client: 'Cliente',
};

if (!pool) {
  console.error(
    'PostgreSQL no configurado. Define DATABASE_URL o PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD en el entorno.'
  );
} else {
  console.log(`PostgreSQL configurado via ${describeDatabaseSource()}.`);
}

const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: false,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 24);
const RESET_TOKEN_TTL_MINUTES = 30;

function fail(res, status, message) {
  return res.status(status).json({ message });
}

// ----------------------------------------------------------------sesiones
function readBearerToken(req) {
  const header = String(req.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function createSession(userId) {
  const rawToken = crypto.randomBytes(32).toString('hex');
  await pool.query(
    "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES ($1,$2,NOW()+($3 || ' hours')::interval)",
    [userId, hashToken(rawToken), SESSION_TTL_HOURS]
  );
  return rawToken;
}

async function getAuthenticatedUser(req) {
  if (!pool) return null;
  const rawToken = readBearerToken(req);
  if (!rawToken) return null;
  const { rows } = await pool.query(
    "SELECT u.* FROM auth_sessions s JOIN app_users u ON u.id = s.user_id WHERE s.token_hash=$1 AND s.expires_at>NOW() AND u.status='active' LIMIT 1",
    [hashToken(rawToken)]
  );
  return rows[0] || null;
}

async function requireAuth(req, res, next) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) return fail(res, 401, 'Autenticación requerida.');
    req.authUser = user;
    return next();
  } catch {
    return fail(res, 401, 'Sesión inválida o vencida.');
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.authUser || !roles.includes(req.authUser.role)) {
      return fail(res, 403, 'No tienes permisos para esta operación.');
    }
    return next();
  };
}

function toClientUser(row) {
  if (!row) return null;
  return {
    id: row.external_id || row.id,
    name: row.name,
    phone: row.phone || null,
    email: row.email,
    role: row.role,
    roleLabel: ROLE_LABELS[row.role] || row.role,
    zone: row.zone || null,
    avatar: row.avatar || null,
    activeOrdersCount: row.active_orders_count || 0,
    assignedToldoIds: row.assigned_toldo_ids || [],
    boatName: row.boat_name || null,
    createdAt: row.created_at,
    lastLogin: row.last_login,
    status: row.status,
    notes: row.notes || null,
  };
}

function sessionResponse(user, token) {
  return {
    token,
    user: { ...toClientUser(user), sessionToken: token },
    expiresInHours: SESSION_TTL_HOURS,
  };
}

const mailer =
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT || 587) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      })
    : null;

function appBaseUrl() {
  const explicit = String(process.env.APP_URL || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  const firstOrigin = allowedOrigins.find((origin) => origin !== '*');
  return firstOrigin ? firstOrigin.replace(/\/$/, '') : '';
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function findUser(identifier) {
  const value = String(identifier || '').trim();
  if (!value) return null;
  const byExternalId = await pool.query('SELECT * FROM app_users WHERE external_id=$1 LIMIT 1', [value]);
  if (byExternalId.rowCount) return byExternalId.rows[0];
  if (!UUID_PATTERN.test(value)) return null;
  const byUuid = await pool.query('SELECT * FROM app_users WHERE id=$1::uuid LIMIT 1', [value]);
  return byUuid.rowCount ? byUuid.rows[0] : null;
}

// ------------------------------------------------------- limitador de intentos
// El limite se ancla al correo de la cuenta: varios dispositivos pueden salir
// por la misma IP publica del local sin bloquearse entre si.
const attempts = new Map();
function rateLimit(windowMs, max, keyBuilder) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}:${keyBuilder ? keyBuilder(req) : 'all'}`;
    const now = Date.now();
    const entry = attempts.get(key);
    if (!entry || now > entry.resetAt) {
      attempts.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return fail(res, 429, 'Demasiados intentos. Espera un momento e inténtalo de nuevo.');
    return next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of attempts) if (now > entry.resetAt) attempts.delete(key);
}, 60_000).unref();

// --------------------------------------------------------------- arranque
async function bootstrap() {
  if (!pool) return;
  try {
    await verifyPoolConnection(pool);
    await runMigrations(pool);
    await pool.query('DELETE FROM auth_sessions WHERE expires_at <= NOW()');
    await pool.query('DELETE FROM password_reset_tokens WHERE expires_at <= NOW()');
    await ensureOwner();
    console.log('Database ready.');
  } catch (error) {
    console.error('Database initialization failed:', error.message);
  }
}

async function ensureOwner() {
  const email = normalizeEmail(process.env.OWNER_EMAIL);
  const password = String(process.env.OWNER_INITIAL_PASSWORD || '');
  if (!email || !password) {
    console.warn('OWNER_EMAIL / OWNER_INITIAL_PASSWORD no configurados: no se crea la cuenta de dueño.');
    return;
  }
  const { rowCount } = await pool.query('SELECT 1 FROM app_users WHERE email=$1 LIMIT 1', [email]);
  if (rowCount) {
    await pool.query(
      "UPDATE app_users SET role='admin', status='active', updated_at=NOW() WHERE email=$1 AND (role<>'admin' OR status<>'active')",
      [email]
    );
    return;
  }
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await pool.query(
    "INSERT INTO app_users (name, phone, email, role, password_hash, status) VALUES ($1,$2,$3,'admin',$4,'active')",
    [process.env.OWNER_NAME || 'Emmanuel Mejías', process.env.OWNER_PHONE || null, email, passwordHash]
  );
  console.log(`Owner account created for ${email}.`);
}

// ------------------------------------------------------------------ estado
app.get('/health', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok: false, database: false, source: describeDatabaseSource() });
  try {
    await pool.query('SELECT 1');
    return res.json({ ok: true, database: true, source: describeDatabaseSource() });
  } catch {
    return res.status(503).json({ ok: false, database: false, source: describeDatabaseSource() });
  }
});

function publicState(rawState) {
  if (!rawState) return null;
  return {
    menuItems: rawState.menuItems || [],
    spots: rawState.spots || [],
    excursion: rawState.excursion || null,
    bcvRate: typeof rawState.bcvRate === 'number' ? rawState.bcvRate : null,
  };
}

function stateForRole(rawState, user) {
  if (!rawState) return null;
  if (!user) return publicState(rawState);
  if (user.role === 'client') {
    const ownerId = user.external_id || user.id;
    const ownOrders = (rawState.orders || []).filter(
      (order) => order && order.clientUserId && order.clientUserId === ownerId
    );
    return { ...publicState(rawState), orders: ownOrders };
  }
  return rawState;
}

app.get('/api/state', async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  try {
    const authenticatedUser = await getAuthenticatedUser(req);
    const [stateResult, users] = await Promise.all([
      pool.query('SELECT state, version, updated_at FROM app_state WHERE id=1'),
      authenticatedUser
        ? pool.query(
            'SELECT id, external_id, name, phone, email, role, status, zone, avatar, active_orders_count, assigned_toldo_ids, boat_name, created_at, notes, last_login FROM app_users ORDER BY created_at ASC'
          )
        : Promise.resolve({ rows: [] }),
    ]);
    const row = stateResult.rows[0];
    return res.json({
      initialized: Boolean(row),
      authenticated: Boolean(authenticatedUser),
      version: row?.version || 0,
      updatedAt: row?.updated_at || null,
      state: stateForRole(row?.state || null, authenticatedUser),
      users: users.rows.map(toClientUser),
    });
  } catch {
    return fail(res, 500, 'No se pudo cargar el estado de la aplicación.');
  }
});

const OPERATIONS_GUARD = [requireAuth, requireRole(...OPERATIONAL_ROLES)];

app.put('/api/state', ...OPERATIONS_GUARD, async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const state = req.body?.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return fail(res, 400, 'Estado inválido.');
  try {
    const result = await pool.query(
      'INSERT INTO app_state (id,state) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state, version=app_state.version+1, updated_at=NOW() RETURNING version,updated_at',
      [JSON.stringify(state)]
    );
    return res.json({ ok: true, version: result.rows[0].version, updatedAt: result.rows[0].updated_at });
  } catch {
    return fail(res, 500, 'No se pudo guardar el estado.');
  }
});

app.patch('/api/state', requireAuth, requireRole('admin'), async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const patch = req.body?.state;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return fail(res, 400, 'Actualización inválida.');
  try {
    const result = await pool.query(
      'INSERT INTO app_state (id,state) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET state=app_state.state || EXCLUDED.state, version=app_state.version+1, updated_at=NOW() RETURNING version,updated_at',
      [JSON.stringify(patch)]
    );
    return res.json({ ok: true, version: result.rows[0].version, updatedAt: result.rows[0].updated_at });
  } catch {
    return fail(res, 500, 'No se pudo actualizar el estado.');
  }
});

// ------------------------------------------------------------- pedidos de cliente
app.post('/api/orders', requireAuth, requireRole('client'), async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const order = req.body?.order;
  if (!order || typeof order !== 'object' || Array.isArray(order) || !Array.isArray(order.items) || !order.items.length) {
    return fail(res, 400, 'Pedido inválido.');
  }
  const ownerId = req.authUser.external_id || req.authUser.id;
  const safeOrder = { ...order, id: String(order.id || `ord-${crypto.randomBytes(6).toString('hex')}`), clientUserId: ownerId };
  try {
    const result = await pool.query(
      `INSERT INTO app_state (id,state) VALUES (1, jsonb_build_object('orders', jsonb_build_array($1::jsonb)))
       ON CONFLICT (id) DO UPDATE SET
         state = jsonb_set(COALESCE(app_state.state,'{}'::jsonb), '{orders}',
           COALESCE(app_state.state->'orders','[]'::jsonb) || jsonb_build_array($1::jsonb)),
         version = app_state.version + 1, updated_at = NOW()
       RETURNING state->'orders' AS orders`,
      [JSON.stringify(safeOrder)]
    );
    return res.status(201).json({ ok: true, order: safeOrder, orders: result.rows[0]?.orders || [] });
  } catch {
    return fail(res, 500, 'No se pudo registrar el pedido.');
  }
});

app.patch('/api/orders/:orderId', requireAuth, async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const patch = req.body?.order;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return fail(res, 400, 'Actualización inválida.');
  const ownerId = req.authUser.external_id || req.authUser.id;
  try {
    const { rows } = await pool.query(
      "SELECT state->'orders' AS orders FROM app_state WHERE id=1"
    );
    const orders = rows[0]?.orders || [];
    const existing = orders.find((order) => order && order.id === req.params.orderId);
    if (!existing) return fail(res, 404, 'Pedido no encontrado.');
    const isOwnerOfOrder = existing.clientUserId && existing.clientUserId === ownerId;
    if (!isOwnerOfOrder && !OPERATIONAL_ROLES.includes(req.authUser.role)) {
      return fail(res, 403, 'No tienes permisos para este pedido.');
    }
    const merged = { ...existing, ...patch, id: existing.id };
    await pool.query(
      `UPDATE app_state SET
         state = jsonb_set(COALESCE(state,'{}'::jsonb), '{orders}',
           (SELECT COALESCE(jsonb_agg(CASE WHEN o->>'id' = $1 THEN $2::jsonb ELSE o END ORDER BY ord), '[]'::jsonb)
            FROM jsonb_array_elements(COALESCE(state->'orders','[]'::jsonb)) WITH ORDINALITY AS t(o, ord))),
         version = version + 1, updated_at = NOW()
       WHERE id = 1`,
      [existing.id, JSON.stringify(merged)]
    );
    return res.json({ ok: true, order: merged });
  } catch {
    return fail(res, 500, 'No se pudo actualizar el pedido.');
  }
});

// ------------------------------------------------------------------ usuarios
app.get('/api/staff', requireAuth, requireRole('admin'), async (_req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const { rows } = await pool.query(
    'SELECT id, external_id, name, phone, email, role, status, zone, avatar, active_orders_count, assigned_toldo_ids, boat_name, created_at, notes, last_login FROM app_users ORDER BY created_at ASC'
  );
  return res.json({ ok: true, users: rows.map(toClientUser) });
});

app.post('/api/staff', requireAuth, requireRole('admin'), async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const name = String(req.body?.name || '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  const role = String(req.body?.role || '').trim();
  if (!name || !email) return fail(res, 400, 'Nombre y correo son obligatorios.');
  if (!ROLES.includes(role)) return fail(res, 400, 'Rol no válido.');
  if (role === 'client') return fail(res, 400, 'Las cuentas de cliente se registran solas desde la pantalla de acceso.');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(res, 400, `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Correo no válido.');
  try {
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO app_users (external_id, name, phone, email, role, password_hash, status, zone, boat_name, avatar, notes)
       VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,$9,$10)
       ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name, phone=EXCLUDED.phone, role=EXCLUDED.role,
         password_hash=EXCLUDED.password_hash, status='active', zone=EXCLUDED.zone, boat_name=EXCLUDED.boat_name,
         avatar=EXCLUDED.avatar, notes=EXCLUDED.notes, updated_at=NOW()
       RETURNING *`,
      [
        `u-${crypto.randomBytes(6).toString('hex')}`,
        name,
        String(req.body?.phone || '').trim() || null,
        email,
        role,
        passwordHash,
        String(req.body?.zone || '').trim() || null,
        String(req.body?.boatName || '').trim() || null,
        name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0]?.toUpperCase() || '')
          .join('') || 'VDV',
        String(req.body?.notes || '').trim() || null,
      ]
    );
    return res.status(201).json({ ok: true, user: toClientUser(result.rows[0]) });
  } catch (error) {
    if (error?.code === '23505') return fail(res, 409, 'Ese correo ya está registrado.');
    return fail(res, 500, 'No se pudo crear la cuenta.');
  }
});

app.patch('/api/staff/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const body = req.body || {};
  const target = await findUser(req.params.userId);
  if (!target) return fail(res, 404, 'Cuenta no encontrada.');
  const role = body.role === undefined ? target.role : String(body.role).trim();
  if (!ROLES.includes(role)) return fail(res, 400, 'Rol no válido.');
  const status = body.status === undefined ? target.status : String(body.status).trim();
  if (!['active', 'suspended'].includes(status)) return fail(res, 400, 'Estado no válido.');
  if (target.id === req.authUser.id && (role !== 'admin' || status !== 'active')) {
    return fail(res, 400, 'No puedes quitarte a ti mismo el acceso de dueño.');
  }
  if (target.role === 'admin' && (role !== 'admin' || status !== 'active')) {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM app_users WHERE role='admin' AND status='active'");
    if (rows[0].total <= 1) return fail(res, 400, 'Debe existir al menos un dueño activo.');
  }
  try {
    const result = await pool.query(
      `UPDATE app_users SET name=COALESCE($2,name), phone=COALESCE($3,phone), role=$4, status=$5,
         zone=COALESCE($6,zone), boat_name=COALESCE($7,boat_name), notes=COALESCE($8,notes), updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        target.id,
        body.name === undefined ? null : String(body.name).trim() || null,
        body.phone === undefined ? null : String(body.phone).trim() || null,
        role,
        status,
        body.zone === undefined ? null : String(body.zone).trim() || null,
        body.boatName === undefined ? null : String(body.boatName).trim() || null,
        body.notes === undefined ? null : String(body.notes).trim() || null,
      ]
    );
    if (status !== 'active') await pool.query('DELETE FROM auth_sessions WHERE user_id=$1', [target.id]);
    return res.json({ ok: true, user: toClientUser(result.rows[0]) });
  } catch {
    return fail(res, 500, 'No se pudo actualizar la cuenta.');
  }
});

app.post('/api/staff/:userId/password', requireAuth, requireRole('admin'), async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const password = String(req.body?.password || '');
  if (password.length < MIN_PASSWORD_LENGTH) {
    return fail(res, 400, `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  }
  const current = await findUser(req.params.userId);
  if (!current) return fail(res, 404, 'Cuenta no encontrada.');
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await pool.query('UPDATE app_users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [passwordHash, current.id]);
  await pool.query('DELETE FROM auth_sessions WHERE user_id=$1', [current.id]);
  return res.json({ ok: true });
});

app.delete('/api/staff/:userId', requireAuth, requireRole('admin'), async (req, res) => {
  if (!pool) return fail(res, 503, 'Base de datos no disponible.');
  const target = await findUser(req.params.userId);
  if (!target) return fail(res, 404, 'Cuenta no encontrada.');
  if (target.id === req.authUser.id) return fail(res, 400, 'No puedes eliminar tu propia cuenta.');
  if (target.role === 'admin') {
    const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM app_users WHERE role='admin' AND status='active'");
    if (rows[0].total <= 1) return fail(res, 400, 'Debe existir al menos un dueño activo.');
  }
  await pool.query('DELETE FROM app_users WHERE id=$1', [target.id]);
  return res.json({ ok: true });
});

// --------------------------------------------------------------- autenticacion
app.post(
  '/api/auth/register',
  rateLimit(15 * 60 * 1000, 10),
  async (req, res) => {
    if (!pool) return fail(res, 503, 'Registro no disponible.');
    const name = String(req.body?.name || '').trim();
    const email = normalizeEmail(req.body?.email);
    const phone = String(req.body?.phone || '').trim();
    const password = String(req.body?.password || '');
    if (!name || !email) return fail(res, 400, 'Nombre y correo son obligatorios.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, 'Correo no válido.');
    if (password.length < MIN_PASSWORD_LENGTH) {
      return fail(res, 400, `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    }
    try {
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const avatar =
        name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((word) => word[0]?.toUpperCase() || '')
          .join('') || 'CL';
      const result = await pool.query(
        `INSERT INTO app_users (external_id, name, phone, email, role, password_hash, status, avatar, notes)
         VALUES ($1,$2,$3,$4,'client',$5,'active',$6,$7)
         ON CONFLICT (email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           name = CASE WHEN app_users.role='client' THEN EXCLUDED.name ELSE app_users.name END,
           phone = COALESCE(EXCLUDED.phone, app_users.phone),
           status = CASE WHEN app_users.role='client' THEN 'active' ELSE app_users.status END,
           updated_at = NOW()
         RETURNING *`,
        [`u-${crypto.randomBytes(6).toString('hex')}`, name, phone || null, email, passwordHash, avatar, 'Registro desde la aplicación.']
      );
      const user = result.rows[0];
      if (user.role !== 'client') return fail(res, 409, 'Ese correo ya está registrado. Inicia sesión con tu clave.');
      await pool.query('UPDATE app_users SET last_login=NOW() WHERE id=$1', [user.id]);
      user.last_login = new Date().toISOString();
      const token = await createSession(user.id);
      return res.status(201).json(sessionResponse(user, token));
    } catch (error) {
      if (error?.code === '23505') return fail(res, 409, 'Ese correo ya está registrado.');
      return fail(res, 500, 'No se pudo crear la cuenta.');
    }
  }
);

app.post('/api/auth/login', rateLimit(15 * 60 * 1000, 10, (req) => normalizeEmail(req.body?.email) || 'anon'), async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password || '');
  if (!email || !password) return fail(res, 400, 'Correo y clave son obligatorios.');
  if (!pool) return fail(res, 503, 'Autenticación no disponible.');
  const { rows } = await pool.query('SELECT * FROM app_users WHERE email=$1 LIMIT 1', [email]);
  const user = rows[0];
  const valid = Boolean(user && user.status === 'active' && user.password_hash) && (await bcrypt.compare(password, user.password_hash));
  if (!valid) return fail(res, 401, 'Correo o clave incorrectos.');
  await pool.query('UPDATE app_users SET last_login=NOW(), updated_at=NOW() WHERE id=$1', [user.id]);
  user.last_login = new Date().toISOString();
  const token = await createSession(user.id);
  return res.json(sessionResponse(user, token));
});

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const rawToken = readBearerToken(req);
  if (rawToken && pool) await pool.query('DELETE FROM auth_sessions WHERE token_hash=$1', [hashToken(rawToken)]);
  return res.json({ ok: true });
});

app.get('/api/me', requireAuth, async (req, res) => {
  return res.json({ user: toClientUser(req.authUser) });
});

app.post('/api/auth/request-reset', rateLimit(15 * 60 * 1000, 5, (req) => normalizeEmail(req.body?.email) || 'anon'), async (req, res) => {
  const email = normalizeEmail(req.body?.email);
  if (!email) return fail(res, 400, 'Indica tu correo.');
  if (!pool) return fail(res, 503, 'Servicio de recuperación no disponible.');
  const { rows } = await pool.query("SELECT id FROM app_users WHERE email=$1 AND status='active' LIMIT 1", [email]);
  if (rows[0]) {
    const raw = crypto.randomBytes(32).toString('hex');
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1', [rows[0].id]);
    await pool.query(
      "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1,$2,NOW()+($3 || ' minutes')::interval)",
      [rows[0].id, hashToken(raw), RESET_TOKEN_TTL_MINUTES]
    );
    const baseUrl = appBaseUrl();
    const resetUrl = baseUrl ? `${baseUrl}/?resetToken=${encodeURIComponent(raw)}` : '';
    if (mailer && resetUrl) {
      await mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'Recuperación de acceso — Virgen del Valle',
        text: `Solicitaste recuperar tu acceso. Abre este enlace dentro de ${RESET_TOKEN_TTL_MINUTES} minutos: ${resetUrl}`,
        html: `<p>Solicitaste recuperar tu acceso a Virgen del Valle.</p><p><a href="${resetUrl}">Restablecer clave</a></p><p>El enlace vence en ${RESET_TOKEN_TTL_MINUTES} minutos.</p>`,
      });
    } else {
      console.warn(
        `[recovery] SMTP o APP_URL sin configurar. Enlace temporal para ${email} (${RESET_TOKEN_TTL_MINUTES} min): ${resetUrl || '(sin APP_URL configurado)' }`
      );
    }
  }
  return res.json({ message: 'Si la cuenta existe, se generó un enlace de recuperación.' });
});

app.post('/api/auth/reset-password', rateLimit(15 * 60 * 1000, 10), async (req, res) => {
  const token = String(req.body?.token || '');
  const password = String(req.body?.password || '');
  if (token.length < 20) return fail(res, 400, 'Enlace de recuperación inválido.');
  if (password.length < MIN_PASSWORD_LENGTH) return fail(res, 400, `La clave debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
  if (!pool) return fail(res, 503, 'Servicio de recuperación no disponible.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND expires_at>NOW() AND used_at IS NULL LIMIT 1',
      [hashToken(token)]
    );
    if (!rows[0]) {
      await client.query('ROLLBACK');
      return fail(res, 400, 'Enlace de recuperación inválido o vencido.');
    }
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await client.query('UPDATE app_users SET password_hash=$1, updated_at=NOW() WHERE id=$2', [passwordHash, rows[0].user_id]);
    await client.query('DELETE FROM auth_sessions WHERE user_id=$1', [rows[0].user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1', [rows[0].id]);
    await client.query('COMMIT');
    return res.json({ message: 'Clave actualizada correctamente.' });
  } catch {
    await client.query('ROLLBACK');
    return fail(res, 500, 'No se pudo actualizar la clave.');
  } finally {
    client.release();
  }
});

// --------------------------------------------------- verificacion de comprobantes
// La clave de Gemini se mantiene en el servidor: nunca viaja dentro del APK ni del PWA.
let geminiClient = null;
function getGeminiClient() {
  if (geminiClient) return geminiClient;
  const apiKey = String(process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) return null;
  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

const manualReview = (note) => ({
  isValid: false,
  confidenceScore: 0,
  requiresManualReview: true,
  notes: note,
});

app.post('/api/ai/validate-payment', requireAuth, requireRole(...OPERATIONAL_ROLES), async (req, res) => {
  if (!pool) return fail(res, 503, 'Servicio de validación no disponible.');
  const imageBase64 = String(req.body?.imageBase64 || '');
  const expectedRef = String(req.body?.expectedRef || '').trim();
  const expectedAmountBs = Number(req.body?.expectedAmountBs || 0);
  if (!imageBase64) return fail(res, 400, 'Falta el comprobante.');

  const client = getGeminiClient();
  if (!client) {
    return res.json({
      result: manualReview('Verificación automática no configurada (falta GEMINI_API_KEY en el servidor). Confirma el pago manualmente.'),
    });
  }
  try {
    const prompt = `Analiza este comprobante bancario venezolano de Pago Móvil o Zelle.
Devuelve solo JSON con esta forma:
{"reference":"referencia detectada","amountBs":numero,"bankOrigin":"banco emisor","phone":"telefono","isLikelyValid":true|false}
Referencia esperada: ${expectedRef}. Monto esperado: ${expectedAmountBs} Bs.`;
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
              },
            },
          ],
        },
      ],
    });
    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.json({ result: manualReview('No se pudo interpretar el comprobante. Confírmalo manualmente.') });
    }
    const parsed = JSON.parse(jsonMatch[0]);
    const referenceMatches = !expectedRef || String(parsed.reference || '').includes(expectedRef);
    const amountMatches = !expectedAmountBs || Math.abs(Number(parsed.amountBs) - expectedAmountBs) < 0.01;
    return res.json({
      result: {
        isValid: Boolean(parsed.isLikelyValid && referenceMatches && amountMatches),
        extractedReference: parsed.reference || null,
        extractedAmountBs: Number(parsed.amountBs) || null,
        extractedBank: parsed.bankOrigin || null,
        extractedPhone: parsed.phone || null,
        confidenceScore: 0.9,
        requiresManualReview: !referenceMatches || !amountMatches,
        notes:
          referenceMatches && amountMatches
            ? 'Lectura del comprobante coincide con la referencia y el monto esperados.'
            : 'La referencia o el monto del comprobante no coinciden con la orden. Revisión manual requerida.',
      },
    });
  } catch (error) {
    console.error('Gemini validation failed:', error.message);
    return res.json({ result: manualReview('El servicio de lectura no respondió. Confirma el pago manualmente.') });
  }
});

app.use((_req, res) => fail(res, 404, 'Ruta no encontrada.'));

// Un error puntual nunca debe tumbar el servicio en produccion.
app.use((error, _req, res, _next) => {
  console.error('Unhandled request error:', error.message);
  return fail(res, 500, 'Error interno del servidor.');
});

process.on('unhandledRejection', (reason) => console.error('Unhandled rejection:', reason));
process.on('uncaughtException', (error) => console.error('Uncaught exception:', error.message));

bootstrap();

app.listen(port, '0.0.0.0', () => console.log(`API listening on 0.0.0.0:${port}`));
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 10000);
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) console.warn('DATABASE_URL is not configured; API will start but DB-backed auth will be unavailable.');

const pool = databaseUrl ? new Pool({
  connectionString: databaseUrl,
  max: Number(process.env.DATABASE_POOL_MAX || 5),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: databaseUrl.includes('sslmode=disable') ? undefined : { rejectUnauthorized: false },
}) : null;

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(v => v.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');

function toClientUser(row) {
  return {
    id: row.external_id || row.id, name: row.name, phone: row.phone, email: row.email, role: row.role,
    zone: row.zone, avatar: row.avatar, activeOrdersCount: row.active_orders_count || 0,
    assignedToldoIds: row.assigned_toldo_ids || [], boatName: row.boat_name,
    approvedByOwner: row.approved_by_owner, approvedAt: row.approved_at,
    createdAt: row.created_at, status: row.status, notes: row.notes, lastLogin: row.last_login,
  };
}

async function ensureSchema() {
  if (!pool) return;
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      external_id TEXT UNIQUE,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      password_hash TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
      token_hash TEXT UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);
    CREATE TABLE IF NOT EXISTS app_state (
      id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      state JSONB NOT NULL DEFAULT '{}'::jsonb,
      version BIGINT NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query('ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;');
  await pool.query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS pin_hash TEXT;');
  await pool.query('ALTER TABLE app_users ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;');
}

async function ensureOwner() {
  if (!pool) return;
  const email = normalizeEmail(process.env.OWNER_EMAIL);
  const password = process.env.OWNER_INITIAL_PASSWORD;
  if (!email || !password) {
    console.warn('OWNER_EMAIL/OWNER_INITIAL_PASSWORD not configured; owner seed skipped.');
    return;
  }
  const existing = await pool.query('SELECT id FROM app_users WHERE email=$1 LIMIT 1', [email]);
  if (existing.rowCount) return;
  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    'INSERT INTO app_users (name, phone, email, role, password_hash, status) VALUES ($1,$2,$3,$4,$5,$6)',
    [process.env.OWNER_NAME || 'Emmanuel Mejías', process.env.OWNER_PHONE || '04127939128', email, 'admin', passwordHash, 'active']
  );
  console.log(`Owner account created: ${email}`);
}

app.get('/health', async (_req, res) => {
  if (!pool) return res.status(503).json({ ok:false, database:false });
  try { await pool.query('SELECT 1'); return res.json({ ok:true, database:true }); }
  catch { return res.status(503).json({ ok:false, database:false }); }
});

app.get('/api/state', async (_req,res) => {
  if (!pool) return res.status(503).json({ message:'Base de datos no disponible.' });
  try {
    const result = await pool.query('SELECT state, version, updated_at FROM app_state WHERE id=1');
    const users = await pool.query('SELECT id,name,phone,email,role,status,zone,avatar,active_orders_count,assigned_toldo_ids,boat_name,approved_by_owner,approved_at,created_at,notes,last_login FROM app_users ORDER BY created_at ASC');
    return res.json({
      initialized: Boolean(result.rows[0]),
      version: result.rows[0]?.version || 0,
      updatedAt: result.rows[0]?.updated_at || null,
      state: result.rows[0]?.state || null,
      users: users.rows.map(toClientUser),
    });
  } catch {
    return res.status(500).json({ message:'No se pudo cargar el estado de la aplicación.' });
  }
});

app.put('/api/state', async (req,res) => {
  if (!pool) return res.status(503).json({ message:'Base de datos no disponible.' });
  const state = req.body?.state;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return res.status(400).json({ message:'Estado inválido.' });
  try {
    const result = await pool.query(
      'INSERT INTO app_state (id,state) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET state=EXCLUDED.state,version=app_state.version+1,updated_at=NOW() RETURNING version,updated_at',
      [JSON.stringify(state)]
    );
    return res.json({ ok:true, version:result.rows[0].version, updatedAt:result.rows[0].updated_at });
  } catch {
    return res.status(500).json({ message:'No se pudo guardar el estado.' });
  }
});

app.patch('/api/state', async (req,res) => {
  if (!pool) return res.status(503).json({ message:'Base de datos no disponible.' });
  const patch = req.body?.state;
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return res.status(400).json({ message:'Actualización inválida.' });
  try {
    const result = await pool.query(
      'INSERT INTO app_state (id,state) VALUES (1,$1) ON CONFLICT (id) DO UPDATE SET state=app_state.state || EXCLUDED.state,version=app_state.version+1,updated_at=NOW() RETURNING version,updated_at',
      [JSON.stringify(patch)]
    );
    return res.json({ ok:true, version:result.rows[0].version, updatedAt:result.rows[0].updated_at });
  } catch {
    return res.status(500).json({ message:'No se pudo actualizar el estado.' });
  }
});

app.post('/api/users/sync', async (req,res) => {
  if (!pool) return res.status(503).json({ message:'Base de datos no disponible.' });
  const users = Array.isArray(req.body?.users) ? req.body.users : [];
  if (!users.length) return res.status(400).json({ message:'No hay usuarios.' });
  try {
    for (const u of users) {
      const email = normalizeEmail(u.email);
      if (!email) continue;
      const pinHash = u.pin ? await bcrypt.hash(String(u.pin), 12) : null;
      await pool.query(
        'INSERT INTO app_users (external_id,name,phone,email,role,pin_hash,status,zone,avatar,active_orders_count,assigned_toldo_ids,boat_name,approved_by_owner,approved_at,created_at,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16) ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,role=EXCLUDED.role,pin_hash=COALESCE(EXCLUDED.pin_hash,app_users.pin_hash),status=EXCLUDED.status,zone=EXCLUDED.zone,avatar=EXCLUDED.avatar,active_orders_count=EXCLUDED.active_orders_count,assigned_toldo_ids=EXCLUDED.assigned_toldo_ids,boat_name=EXCLUDED.boat_name,approved_by_owner=EXCLUDED.approved_by_owner,approved_at=EXCLUDED.approved_at,notes=EXCLUDED.notes',
        [String(u.id || ''),u.name,u.phone || null,email,u.role,pinHash,u.status || 'active',u.zone || null,u.avatar || null,Number(u.activeOrdersCount || 0),JSON.stringify(u.assignedToldoIds || []),u.boatName || null,Boolean(u.approvedByOwner),u.approvedAt || null,u.createdAt || new Date().toISOString(),u.notes || null]
      );
    }
    const emails = users.map((u) => normalizeEmail(u.email)).filter(Boolean);
    if (emails.length) await pool.query("DELETE FROM app_users WHERE email <> ALL($1::text[]) AND email <> $2", [emails, normalizeEmail(process.env.OWNER_EMAIL)]);
    const result = await pool.query('SELECT * FROM app_users ORDER BY created_at ASC');
    return res.json({ ok:true, users: result.rows.map(toClientUser) });
  } catch {
    return res.status(500).json({ message:'No se pudieron sincronizar los usuarios.' });
  }
});

app.post('/api/auth/pin-login', async (req,res) => {
  const email=normalizeEmail(req.body?.email);
  const pin=String(req.body?.pin || '');
  if (!email || !pin) return res.status(400).json({ message:'Usuario y PIN son obligatorios.' });
  if (!pool) return res.status(503).json({ message:'Autenticación no disponible.' });
  const result=await pool.query('SELECT id,name,phone,email,role,status,zone,avatar,active_orders_count,assigned_toldo_ids,boat_name,approved_by_owner,approved_at,created_at,notes,pin_hash FROM app_users WHERE email=$1 LIMIT 1',[email]);
  const user=result.rows[0];
  if (!user || user.status !== 'active' || !user.pin_hash || !(await bcrypt.compare(pin,user.pin_hash))) {
    return res.status(401).json({ message:'Usuario o PIN incorrectos.' });
  }
  await pool.query('UPDATE app_users SET last_login=NOW(),updated_at=NOW() WHERE id=$1',[user.id]);
  delete user.pin_hash;
  return res.json({ user: toClientUser(user) });
});

app.post('/api/auth/login', async (req,res) => {
  const email=normalizeEmail(req.body?.email);
  const password=String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ message:'Correo y clave son obligatorios.' });
  if (!pool) return res.status(503).json({ message:'Autenticación de producción no disponible.' });
  const {rows}=await pool.query('SELECT * FROM app_users WHERE email=$1 LIMIT 1',[email]);
  const user=rows[0];
  if (!user || user.status !== 'active' || !user.password_hash || !(await bcrypt.compare(password,user.password_hash))) {
    return res.status(401).json({ message:'Correo o clave incorrectos.' });
  }
  delete user.password_hash;
  delete user.pin_hash;
  return res.json({ user:toClientUser(user) });
});

app.post('/api/auth/request-reset', async (req,res) => {
  const email=normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ message:'Indica tu correo.' });
  if (!pool) return res.status(503).json({ message:'Servicio de recuperación no disponible.' });
  const {rows}=await pool.query('SELECT id FROM app_users WHERE email=$1 AND status=\'active\' LIMIT 1',[email]);
  // Always return a generic response to avoid account enumeration.
  if (rows[0]) {
    const raw=crypto.randomBytes(32).toString('hex');
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id=$1',[rows[0].id]);
    await pool.query(
      'INSERT INTO password_reset_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,NOW()+INTERVAL \'30 minutes\')',
      [rows[0].id,hashToken(raw)]
    );
    // Email delivery is intentionally left to configured SMTP credentials.
    console.log('Password reset request recorded.');
  }
  return res.json({ message:'Si la cuenta existe, se generó un enlace de recuperación.' });
});

app.post('/api/auth/reset-password', async (req,res) => {
  const token=String(req.body?.token || '');
  const password=String(req.body?.password || '');
  if (token.length < 20 || password.length < 8) return res.status(400).json({ message:'Token o clave inválidos.' });
  if (!pool) return res.status(503).json({ message:'Servicio de recuperación no disponible.' });
  const client=await pool.connect();
  try {
    await client.query('BEGIN');
    const {rows}=await client.query(
      'SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND expires_at>NOW() AND used_at IS NULL LIMIT 1',
      [hashToken(token)]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(400).json({message:'Enlace de recuperación inválido o vencido.'}); }
    const passwordHash=await bcrypt.hash(password,12);
    await client.query('UPDATE app_users SET password_hash=$1,updated_at=NOW() WHERE id=$2',[passwordHash,rows[0].user_id]);
    await client.query('UPDATE password_reset_tokens SET used_at=NOW() WHERE id=$1',[rows[0].id]);
    await client.query('COMMIT');
    return res.json({message:'Clave actualizada correctamente.'});
  } catch {
    await client.query('ROLLBACK');
    return res.status(500).json({message:'No se pudo actualizar la clave.'});
  } finally { client.release(); }
});

ensureSchema().then(ensureOwner).catch(err => console.error('Database initialization failed:', err));

app.listen(port,'0.0.0.0',()=>console.log(`API listening on 0.0.0.0:${port}`));

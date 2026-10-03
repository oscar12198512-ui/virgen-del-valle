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
  ssl: /render\.com|amazonaws\.com|neon\.tech/i.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
}) : null;

const allowedOrigins = (process.env.CORS_ORIGIN || '*').split(',').map(v => v.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.includes('*') ? true : allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');

async function ensureSchema() {
  if (!pool) return;
  await pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'client',
      password_hash TEXT NOT NULL,
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
  `);
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

app.post('/api/auth/login', async (req,res) => {
  const email=normalizeEmail(req.body?.email);
  const password=String(req.body?.password || '');
  if (!email || !password) return res.status(400).json({ message:'Correo y clave son obligatorios.' });
  if (!pool) return res.status(503).json({ message:'Autenticación de producción no disponible.' });
  const {rows}=await pool.query('SELECT id,name,phone,email,role,status,password_hash FROM app_users WHERE email=$1 LIMIT 1',[email]);
  const user=rows[0];
  if (!user || user.status !== 'active' || !(await bcrypt.compare(password,user.password_hash))) {
    return res.status(401).json({ message:'Correo o clave incorrectos.' });
  }
  return res.json({ user:{id:user.id,name:user.name,phone:user.phone,email:user.email,role:user.role,status:user.status} });
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
    console.log(`Password reset token generated for ${email}: ${raw}`);
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

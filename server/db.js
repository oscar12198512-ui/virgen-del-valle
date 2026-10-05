import pg from 'pg';

const { Pool } = pg;

const TRUTHY = new Set(['1', 'true', 'yes', 'on', 'require', 'verify-ca', 'verify-full', 'prefer']);

/**
 * Render expone la base de datos linked con dos mechanisms:
 *  - `fromDatabase.property: connectionString` -> DATABASE_URL
 *  - `fromDatabase.property: host|port|database|user|password` -> PGHOST/PGPORT/...
 * Se aceptan ambos para no depender de una sola forma de configuracion.
 */
export function resolveDatabaseConfig(env = process.env) {
  const connectionString = String(env.DATABASE_URL || '').trim();
  const explicit = {
    host: String(env.PGHOST || '').trim(),
    port: Number(env.PGPORT || 5432) || 5432,
    database: String(env.PGDATABASE || '').trim(),
    user: String(env.PGUSER || '').trim(),
    password: String(env.PGPASSWORD || ''),
  };
  const hasExplicitFields = Boolean(explicit.host && explicit.database && explicit.user && explicit.password);

  const sslMode = String(env.PGSSLMODE || '').trim().toLowerCase();
  const urlRequestsSsl = /sslmode=(require|verify-ca|verify-full|prefer)/i.test(connectionString);
  const sslRequested = TRUTHY.has(sslMode) || (sslRequestedExplicitly(env) && sslMode !== 'disable');

  if (!connectionString && !hasExplicitFields) return null;

  const base = {
    max: Number(env.DATABASE_POOL_MAX || 5),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    allowExitOnIdle: true,
  };

  const config = connectionString ? { ...base, connectionString } : { ...base, ...explicit };
  // El certificado de Render es autofirmado: se valida el canal, no la cadena.
  const useSsl = sslRequested || (sslMode !== 'disable' && urlRequestsSsl);
  return useSsl ? { ...config, ssl: { rejectUnauthorized: false } } : config;
}

function sslRequestedExplicitly(env) {
  return ['PGSSL', 'DATABASE_SSL'].some((key) => TRUTHY.has(String(env[key] || '').trim().toLowerCase()));
}

export function createPoolFromEnv(env = process.env) {
  const config = resolveDatabaseConfig(env);
  if (!config) return null;
  return new Pool(config);
}

export function describeDatabaseSource(env = process.env) {
  if (String(env.DATABASE_URL || '').trim()) return 'DATABASE_URL';
  if (String(env.PGHOST || '').trim()) return 'PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD';
  return 'sin configurar';
}

/**
 * Valida la conexion. Si el servidor rechaza TLS se reintenta sin SSL, porque la
 * red interna de Render no expone certificado y la local tampoco lo requiere.
 */
export async function verifyPoolConnection(pool) {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    if (pool.options && pool.options.ssl && !pool.__sslRetried) {
      pool.__sslRetried = true;
      pool.options.ssl = undefined;
      pool.options.sslmode = undefined;
      console.warn('Conexion TLS rechazada por el servidor; reintentando sin SSL.');
      await pool.query('SELECT 1');
      return true;
    }
    throw error;
  }
}
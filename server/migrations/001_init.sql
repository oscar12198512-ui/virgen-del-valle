-- Virgen del Valle / Playa Buche - esquema canonico de PostgreSQL.
-- Es idempotente: se puede ejecutar en cada arranque del servidor.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Cuentas de la aplicacion. El rol determina la interfaz y los permisos.
CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  zone TEXT,
  avatar TEXT,
  active_orders_count INTEGER NOT NULL DEFAULT 0,
  assigned_toldo_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  boat_name TEXT,
  notes TEXT,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compatibilidad con instalaciones anteriores (columnas retiradas del modelo actual).
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS active_orders_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS assigned_toldo_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS boat_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Restricciones de unicidad garantizadas aunque la tabla ya existiera.
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_external_id ON app_users(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);

-- Enlaces de recuperacion de clave (se guarda solo el hash SHA-256).
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_token_hash ON password_reset_tokens(token_hash);

-- Sesiones autenticadas (se guarda solo el hash SHA-256 del token).
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- Estado operativo unico de la aplicacion.
CREATE TABLE IF NOT EXISTS app_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Marcadores de mantenimiento (evitan repetir tareas de una sola vez).
CREATE TABLE IF NOT EXISTS system_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
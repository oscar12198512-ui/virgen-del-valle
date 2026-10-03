-- Virgen del Valle: Aiven PostgreSQL application persistence
-- Keeps operational application state in PostgreSQL while the domain model
-- is progressively normalized into dedicated tables.
CREATE TABLE IF NOT EXISTS app_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS pin_hash TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS external_id TEXT UNIQUE;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS zone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS active_orders_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS assigned_toldo_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS boat_name TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS approved_by_owner BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

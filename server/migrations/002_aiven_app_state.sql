-- Virgen del Valle: Aiven PostgreSQL application persistence
-- Keeps operational application state in PostgreSQL while the domain model
-- is progressively normalized into dedicated tables.
CREATE TABLE IF NOT EXISTS app_state (
  id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS pin_hash TEXT;

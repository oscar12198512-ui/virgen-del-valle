import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function runMigrations(pool) {
  if (!pool) return false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Bloqueo consultivo de transacción para evitar ejecuciones concurrentes de réplicas en Render
    await client.query('SELECT pg_advisory_xact_lock(7429184)');

    // Tabla canónica de control de versiones de migraciones
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const files = (await fs.readdir(migrationsDir))
      .filter((name) => name.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [file]);
      if (rowCount > 0) {
        continue;
      }
      const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      console.log(`Migration applied: ${file}`);
    }

    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error durante la ejecución de migraciones:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const { createPoolFromEnv } = await import('./db.js');
  const pool = createPoolFromEnv();
  if (!pool) {
    console.error('PostgreSQL no esta configurado. Revisa DATABASE_URL o PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD.');
    process.exit(1);
  }
  try {
    await runMigrations(pool);
    console.log('Migraciones completadas.');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}
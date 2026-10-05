import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

export async function runMigrations(pool) {
  if (!pool) return false;
  const files = (await fs.readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8');
    await pool.query(sql);
    console.log(`Migration applied: ${file}`);
  }
  return true;
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
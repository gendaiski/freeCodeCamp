/** Forward-only SQL migrations from db/migrations, tracked in schema_migrations. */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { pool } from '../core/db.js';

const here = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(here, '../../../../db/migrations');

export async function migrate(opts: { reset?: boolean; log?: (s: string) => void } = {}): Promise<string[]> {
  const log = opts.log ?? (() => {});
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    if (opts.reset) {
      log('resetting schema public');
      await client.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    }
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name as string));
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = readFileSync(resolve(MIGRATIONS_DIR, f), 'utf8');
      log(`applying ${f}`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        applied.push(f);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`migration ${f} failed: ${(e as Error).message}`);
      }
    }
  } finally {
    client.release();
  }
  return applied;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const reset = process.argv.includes('--reset');
  migrate({ reset, log: console.log })
    .then((a) => { console.log(a.length ? `applied: ${a.join(', ')}` : 'up to date'); return pool.end(); })
    .catch((e) => { console.error(e); process.exit(1); });
}

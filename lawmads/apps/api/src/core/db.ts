import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));   // NUMERIC → number
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)));     // BIGINT  → number

export const pool = new Pool({ connectionString: config.databaseUrl, max: 10 });

export type Queryable = pg.Pool | pg.PoolClient;

export async function query<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = [], q: Queryable = pool): Promise<T[]> {
  const res = await q.query<T>(text, params);
  return res.rows;
}
export async function one<T extends pg.QueryResultRow = any>(text: string, params: unknown[] = [], q: Queryable = pool): Promise<T | null> {
  const rows = await query<T>(text, params, q);
  return rows[0] ?? null;
}
export async function withTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

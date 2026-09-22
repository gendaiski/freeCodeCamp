import { query } from './db.js';

export async function audit(actor: string | null, action: string, target: string | null, meta: Record<string, unknown> = {}, ip: string | null = null): Promise<void> {
  await query('INSERT INTO audit_log(actor, action, target, meta, ip) VALUES ($1,$2,$3,$4,$5)', [actor, action, target, JSON.stringify(meta), ip]);
}

import { query, type Queryable, pool } from '../../core/db.js';
import { computeStreak } from '@lawmads/shared';

export interface AwardInput { userId: string; kind: 'tech' | 'law'; amount: number; sourceType: string; sourceId: string; programCode?: string | null; title: string; scoreLabel?: string | null; itemKind?: string | null }

/** Idempotent: the (user, kind, source) unique key means a re-award is a no-op. Returns true when new. */
export async function awardCredits(a: AwardInput, q: Queryable = pool): Promise<boolean> {
  if (a.amount <= 0) return false;
  const rows = await query(`INSERT INTO credit_ledger(user_id,kind,amount,source_type,source_id,program_code,title,score_label,item_kind)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (user_id, kind, source_type, source_id) DO NOTHING RETURNING id`,
    [a.userId, a.kind, a.amount, a.sourceType, a.sourceId, a.programCode ?? null, a.title, a.scoreLabel ?? null, a.itemKind ?? null], q);
  return rows.length > 0;
}
export async function touchActivity(userId: string, q: Queryable = pool): Promise<void> {
  await query(`INSERT INTO activity_days(user_id, day) VALUES ($1, CURRENT_DATE) ON CONFLICT DO NOTHING`, [userId], q);
}
export async function creditTotals(userId: string): Promise<{ tech: number; law: number; weekTech: number; weekLaw: number }> {
  const r = await query<{ kind: string; total: number; week: number }>(`SELECT kind, COALESCE(SUM(amount),0)::int AS total, COALESCE(SUM(amount) FILTER (WHERE created_at > now() - interval '7 days'),0)::int AS week FROM credit_ledger WHERE user_id=$1 GROUP BY kind`, [userId]);
  const g = (k: string) => r.find((x) => x.kind === k);
  return { tech: g('tech')?.total ?? 0, law: g('law')?.total ?? 0, weekTech: g('tech')?.week ?? 0, weekLaw: g('law')?.week ?? 0 };
}
export async function streak(userId: string): Promise<{ days: number; week: boolean[] }> {
  const rows = await query<{ day: string }>(`SELECT to_char(day,'YYYY-MM-DD') AS day FROM activity_days WHERE user_id=$1 AND day > CURRENT_DATE - 60`, [userId]);
  const set = new Set(rows.map((r) => r.day));
  const today = new Date().toISOString().slice(0, 10);
  // Mon..Sun of the current week
  const d = new Date(today + 'T00:00:00Z');
  const dow = (d.getUTCDay() + 6) % 7;
  const week: boolean[] = [];
  for (let i = 0; i < 7; i++) { const x = new Date(d); x.setUTCDate(d.getUTCDate() - dow + i); week.push(set.has(x.toISOString().slice(0, 10))); }
  return { days: computeStreak([...set], today), week };
}

/** Dual-credit rules. Every graded item writes to the ledger through these constants. */
export type CreditKind = 'tech' | 'law';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export const CREDIT_RULES = {
  exerciseByDifficulty: { beginner: 3, intermediate: 5, advanced: 10 } as Record<Difficulty, number>,
  quizPass: 2,             // tech, on ≥ pass mark
  lawModule: 4,            // law, per completed law lesson
  lawExam: 8,              // law, per passed track exam
  capstone: { tech: 8, law: 8 },
  badgeExamLaw: 6          // law credits for a passed jurisdiction badge
} as const;

export interface CredentialRequirement { tech: number; law: number }
export interface CredentialProgress {
  tech: { earned: number; required: number; pct: number };
  law: { earned: number; required: number; pct: number };
  complete: boolean;
  missing: { tech: number; law: number };
}

/** A credential only issues when both halves are complete — the structural guarantee. */
export function credentialProgress(earned: { tech: number; law: number }, req: CredentialRequirement): CredentialProgress {
  const pct = (e: number, r: number) => (r <= 0 ? 100 : Math.min(100, Math.round((e / r) * 100)));
  const missing = { tech: Math.max(0, req.tech - earned.tech), law: Math.max(0, req.law - earned.law) };
  return {
    tech: { earned: earned.tech, required: req.tech, pct: pct(earned.tech, req.tech) },
    law: { earned: earned.law, required: req.law, pct: pct(earned.law, req.law) },
    complete: missing.tech === 0 && missing.law === 0,
    missing
  };
}

/** Streak: consecutive active days ending today (or yesterday, so a streak survives until midnight). */
export function computeStreak(activeDays: readonly string[], today: string): number {
  const set = new Set(activeDays);
  const d = new Date(today + 'T00:00:00Z');
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (!set.has(iso(d))) d.setUTCDate(d.getUTCDate() - 1);
  let n = 0;
  while (set.has(iso(d))) { n++; d.setUTCDate(d.getUTCDate() - 1); }
  return n;
}

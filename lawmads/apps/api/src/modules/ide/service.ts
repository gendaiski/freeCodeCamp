import { LANGUAGES, findLanguage, type SubmissionStatus } from '@lawmads/shared';
import { one, query } from '../../core/db.js';
import { config } from '../../core/config.js';
import { redis, ensureRedis } from '../../core/redis.js';
import { badRequest, forbidden, notFound, tooMany } from '../../core/errors.js';
import { isStaff, type Principal } from '../../core/auth.js';
import { getExecutor } from './executor.js';
import { dispatch, gradeStructuralPreview } from './grading.js';
import type { StructuralRule } from './structural.js';

const memQuota = new Map<string, number>();
async function quotaKey(userId: string) { const d = new Date(); return `quota:${userId}:${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`; }
export async function checkQuota(p: Principal): Promise<void> {
  if (p.plan !== 'plan_free' || config.freeTierRuntimeMinutes <= 0 || isStaff(p)) return;
  const key = await quotaKey(p.id);
  const used = (await ensureRedis()) ? Number(await redis.get(key) ?? 0) : (memQuota.get(key) ?? 0);
  if (used >= config.freeTierRuntimeMinutes * 60_000) throw tooMany(`Free-tier runtime quota (${config.freeTierRuntimeMinutes} min/month) exceeded — upgrade to Lawmad Pro`);
}
export async function chargeQuota(p: Principal, ms: number): Promise<void> {
  if (p.plan !== 'plan_free' || ms <= 0) return;
  const key = await quotaKey(p.id);
  if (await ensureRedis()) { await redis.incrby(key, Math.max(1, Math.round(ms))); await redis.expire(key, 40 * 86400); }
  else memQuota.set(key, (memQuota.get(key) ?? 0) + ms);
}

export async function listLanguages(userId?: string) {
  const counts = await query<{ language: string; total: number }>(`SELECT language, COUNT(*)::int AS total FROM exercises WHERE published GROUP BY language`);
  const done = userId ? await query<{ language: string, solved: number }>(`SELECT e.language, COUNT(*)::int AS solved FROM exercise_progress p JOIN exercises e ON e.id=p.exercise_id WHERE p.user_id=$1 AND p.completed GROUP BY e.language`, [userId]) : [];
  const attempts = userId ? await one<{ n: number }>(`SELECT COALESCE(SUM(attempts),0)::int AS n FROM exercise_progress WHERE user_id=$1`, [userId]) : null;
  const ex = getExecutor();
  return {
    executor: ex.name,
    attempts: attempts?.n ?? 0,
    languages: LANGUAGES.map((l) => ({ ...l, exercises: counts.find((c) => c.language === l.slug)?.total ?? 0, solved: done.find((d) => d.language === l.slug)?.solved ?? 0, runnable: l.grading !== 'stdio' || ex.supports(l) }))
  };
}

interface ExerciseRow { id: string; slug: string; title: string; language: string; ordinal: number; difficulty: string; instructions_md: string; checks: string[]; starter_code: string; solution_code: string; hints: string[]; structural_rules: StructuralRule[]; reveal_solution_after: number; tech_credits: number; published: boolean; time_limit_sec: number | null; memory_limit_kb: number | null }

export async function getExercise(idOrSlug: string): Promise<ExerciseRow> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(idOrSlug);
  const ex = await one<ExerciseRow>(`SELECT * FROM exercises WHERE ${isUuid ? 'id' : 'slug'}=$1`, [idOrSlug]);
  if (!ex) throw notFound('Exercise');
  return ex;
}

export async function studentProjection(ex: ExerciseRow, user?: Principal) {
  if (!ex.published && !isStaff(user)) throw forbidden('Exercise is not published');
  const samples = await query<{ name: string; input: string; expected_output: string }>('SELECT name,input,expected_output FROM test_cases WHERE exercise_id=$1 AND hidden=false ORDER BY ordinal', [ex.id]);
  const hiddenCount = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM test_cases WHERE exercise_id=$1 AND hidden=true', [ex.id]);
  const progress = user ? await one<{ best_score: number; attempts: number; failed_attempts: number; completed: boolean }>('SELECT best_score,attempts,failed_attempts,completed FROM exercise_progress WHERE user_id=$1 AND exercise_id=$2', [user.id, ex.id]) : null;
  const lang = findLanguage(ex.language)!;
  const siblings = await query<{ id: string; slug: string; ordinal: number; title: string; completed: boolean | null }>(
    `SELECT e.id, e.slug, e.ordinal, e.title, p.completed FROM exercises e LEFT JOIN exercise_progress p ON p.exercise_id=e.id AND p.user_id=$2 WHERE e.language=$1 AND e.published ORDER BY e.ordinal`, [ex.language, user?.id ?? null]);
  return {
    id: ex.id, slug: ex.slug, title: ex.title, language: lang, ordinal: ex.ordinal, difficulty: ex.difficulty, instructions_md: ex.instructions_md, checks: ex.checks,
    starter_code: ex.starter_code, reveal_solution_after: ex.reveal_solution_after, tech_credits: ex.tech_credits, hint_count: ex.hints.length,
    sample_tests: samples, hidden_tests: hiddenCount?.n ?? 0, grading: lang.grading, structural_checks: (ex.structural_rules ?? []).map((r) => r.message),
    progress: progress ? { bestScore: progress.best_score, attempts: progress.attempts, failedAttempts: progress.failed_attempts, completed: progress.completed, solutionUnlocked: progress.failed_attempts >= ex.reveal_solution_after || isStaff(user) } : { bestScore: 0, attempts: 0, failedAttempts: 0, completed: false, solutionUnlocked: isStaff(user) },
    siblings: siblings.map((s) => ({ id: s.id, slug: s.slug, ordinal: s.ordinal, title: s.title, completed: Boolean(s.completed) }))
  };
}

export async function listExercises(language: string | undefined, user?: Principal) {
  const rows = await query<ExerciseRow & { completed: boolean | null; best_score: number | null; attempts: number | null }>(
    `SELECT e.*, p.completed, p.best_score, p.attempts FROM exercises e LEFT JOIN exercise_progress p ON p.exercise_id=e.id AND p.user_id=$2 WHERE e.published AND ($1::text IS NULL OR e.language=$1) ORDER BY e.language, e.ordinal`, [language ?? null, user?.id ?? null]);
  return rows.map((r) => ({ id: r.id, slug: r.slug, title: r.title, language: r.language, ordinal: r.ordinal, difficulty: r.difficulty, tech_credits: r.tech_credits, completed: Boolean(r.completed), bestScore: r.best_score ?? 0, attempts: r.attempts ?? 0 }));
}

export async function hint(ex: ExerciseRow, level: number) {
  const hints = ex.hints ?? [];
  const i = Math.min(Math.max(0, level), hints.length - 1);
  if (hints.length === 0) return { hint: 'No hints for this exercise — re-read the checks list.', level: 0, total: 0 };
  return { hint: hints[i], level: i, total: hints.length };
}

export async function solution(ex: ExerciseRow, user: Principal) {
  if (!isStaff(user)) {
    const p = await one<{ failed_attempts: number; completed: boolean }>('SELECT failed_attempts, completed FROM exercise_progress WHERE user_id=$1 AND exercise_id=$2', [user.id, ex.id]);
    const failed = p?.failed_attempts ?? 0;
    if (!p?.completed && failed < ex.reveal_solution_after) throw forbidden(`The solution unlocks after ${ex.reveal_solution_after} failed submissions (${failed} so far)`);
  }
  return { solution_code: ex.solution_code };
}

export async function run(ex: ExerciseRow, code: string, stdin: string, user: Principal) {
  const lang = findLanguage(ex.language);
  if (!lang) throw badRequest('Unknown language');
  if (lang.grading !== 'stdio') {
    const preview = await gradeStructuralPreview(ex.structural_rules ?? [], code);
    return { status: 'graded', stdout: '', stderr: '', compile_output: '', time_ms: 0, memory_kb: null, checks: preview.checks, score: preview.score, passed: preview.passed, note: lang.grading === 'browser' ? 'HTML renders in the Live Preview; checks are structural.' : 'Structural checks only — Submit to grade.' };
  }
  await checkQuota(user);
  const r = await getExecutor().run({ language: lang, code, stdin, timeLimitSec: ex.time_limit_sec, memoryKb: ex.memory_limit_kb });
  await chargeQuota(user, r.timeMs ?? 500);
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, compile_output: r.compileOutput, time_ms: r.timeMs, memory_kb: r.memoryKb, message: r.message ?? null };
}

export async function submit(ex: ExerciseRow, code: string, user: Principal): Promise<{ submissionId: string; status: SubmissionStatus }> {
  if (!ex.published && !isStaff(user)) throw forbidden('Exercise is not published');
  if (code.length > 200_000) throw badRequest('Code too large');
  await checkQuota(user);
  const row = (await query<{ id: string }>(`INSERT INTO submissions(user_id, exercise_id, kind, code) VALUES ($1,$2,'submit',$3) RETURNING id`, [user.id, ex.id, code]))[0]!;
  // Fire-and-forget: the pipeline finalizes; clients poll GET /submissions/:id.
  setImmediate(() => { dispatch(row.id).catch((e) => console.error('dispatch failed', e)); });
  return { submissionId: row.id, status: 'queued' };
}

export async function getSubmission(id: string, user: Principal) {
  const s = await one<any>(`SELECT s.*, e.slug AS exercise_slug, e.title AS exercise_title, e.tech_credits FROM submissions s JOIN exercises e ON e.id=s.exercise_id WHERE s.id=$1`, [id]);
  if (!s) throw notFound('Submission');
  if (s.user_id !== user.id && !isStaff(user)) throw forbidden();
  const progress = await one<{ credited: boolean; failed_attempts: number; completed: boolean }>('SELECT credited, failed_attempts, completed FROM exercise_progress WHERE user_id=$1 AND exercise_id=$2', [s.user_id, s.exercise_id]);
  return { id: s.id, exercise_id: s.exercise_id, exercise_slug: s.exercise_slug, exercise_title: s.exercise_title, kind: s.kind, status: s.status, score: s.score, passed: s.passed, runtime_ms: s.runtime_ms, detail: s.detail, created_at: s.created_at, graded_at: s.graded_at, credits: s.passed ? s.tech_credits : 0, solutionUnlocked: (progress?.failed_attempts ?? 0) >= 3 || Boolean(progress?.completed) };
}

/**
 * The judged-submission pipeline (Phase-1 semantics preserved):
 *  submit → one job per test case → resolve each → weighted score → atomic finalize (status guard)
 *  → exercise_progress → Tech Credits → curriculum item → LMS sync event. Reconciliation sweep for
 *  Judge0 callbacks that never arrive.
 */
import { computeScore, outputsMatch, findLanguage, isTerminal, type SubmissionStatus } from '@lawmads/shared';
import { one, query, withTx, pool } from '../../core/db.js';
import { config } from '../../core/config.js';
import { logger } from '../../core/logger.js';
import { getExecutor, type ExecResult } from './executor.js';
import { evaluateStructural, type StructuralRule } from './structural.js';
import { awardCredits, touchActivity } from '../learning/credits.js';
import { audit } from '../../core/audit.js';
import { hmacHex } from '../../core/crypto.js';

interface SubmissionRow { id: string; user_id: string; exercise_id: string; code: string; status: SubmissionStatus }
interface ExerciseRow { id: string; slug: string; title: string; language: string; time_limit_sec: number | null; memory_limit_kb: number | null; structural_rules: StructuralRule[]; tech_credits: number; course_ref: string | null; lesson_ref: string | null }
interface TestRow { id: string; name: string; input: string; expected_output: string; weight: number; hidden: boolean }

export async function dispatch(submissionId: string): Promise<void> {
  const sub = await one<SubmissionRow>('SELECT id,user_id,exercise_id,code,status FROM submissions WHERE id=$1', [submissionId]);
  if (!sub || sub.status !== 'queued') return;
  const ex = await one<ExerciseRow>('SELECT id,slug,title,language,time_limit_sec,memory_limit_kb,structural_rules,tech_credits,course_ref,lesson_ref FROM exercises WHERE id=$1', [sub.exercise_id]);
  if (!ex) return;
  const lang = findLanguage(ex.language);
  if (!lang) return;
  await query(`UPDATE submissions SET status='processing' WHERE id=$1 AND status='queued'`, [submissionId]);

  if (lang.grading !== 'stdio') {
    const outcomes = evaluateStructural(ex.structural_rules ?? [], sub.code);
    const score = computeScore(outcomes);
    await finalize(submissionId, { status: 'graded', score: score.score, passed: score.passed, runtimeMs: 0, detail: { checks: outcomes } });
    return;
  }

  const tests = await query<TestRow>('SELECT id,name,input,expected_output,weight,hidden FROM test_cases WHERE exercise_id=$1 ORDER BY ordinal', [ex.id]);
  if (tests.length === 0) { await finalize(submissionId, { status: 'error', score: 0, passed: false, runtimeMs: null, detail: { message: 'Exercise has no test cases' } }); return; }
  const stRows = await query<{ id: string; test_case_id: string }>(
    `INSERT INTO submission_tests(submission_id, test_case_id) SELECT $1, unnest($2::uuid[]) RETURNING id, test_case_id`, [submissionId, tests.map((t) => t.id)]);
  const executor = getExecutor();

  if (executor.name === 'judge0' && executor.submitAsync) {
    for (const st of stRows) {
      const t = tests.find((x) => x.id === st.test_case_id)!;
      try {
        const { token } = await executor.submitAsync({ language: lang, code: sub.code, stdin: t.input, timeLimitSec: ex.time_limit_sec, memoryKb: ex.memory_limit_kb }, `${config.judge0.callbackBase}/api/v1/ide/judge0/callback?st=${st.id}`);
        await query('UPDATE submission_tests SET judge0_token=$1, status=$2 WHERE id=$3', [token, 'processing', st.id]);
      } catch (e) {
        await resolveTest(st.id, { status: 'error', stdout: '', stderr: String(e), compileOutput: '', timeMs: null, memoryKb: null });
      }
    }
    return;
  }
  // Local executor: run sequentially in-process (dev/test only).
  for (const st of stRows) {
    const t = tests.find((x) => x.id === st.test_case_id)!;
    const result = await executor.run({ language: lang, code: sub.code, stdin: t.input, timeLimitSec: ex.time_limit_sec, memoryKb: ex.memory_limit_kb });
    await resolveTest(st.id, result);
  }
}

/** Resolve one test (from a callback, a poll, or the local runner) and finalize when all are settled. */
export async function resolveTest(stId: string, result: ExecResult): Promise<void> {
  const st = await one<{ id: string; submission_id: string; test_case_id: string; status: SubmissionStatus }>('SELECT id,submission_id,test_case_id,status FROM submission_tests WHERE id=$1', [stId]);
  if (!st || isTerminal(st.status)) return; // idempotent
  const tc = await one<TestRow>('SELECT id,name,input,expected_output,weight,hidden FROM test_cases WHERE id=$1', [st.test_case_id]);
  const passed = result.status === 'graded' && tc ? outputsMatch(tc.expected_output, result.stdout) : false;
  await query(`UPDATE submission_tests SET status=$1, passed=$2, actual_output=$3, runtime_ms=$4, detail=$5, resolved_at=now() WHERE id=$6 AND status NOT IN ('graded','error','time_limit','runtime_error','compile_error')`,
    [result.status, passed, result.stdout.slice(0, 20000), result.timeMs, JSON.stringify({ stderr: result.stderr.slice(0, 4000), compile_output: result.compileOutput.slice(0, 4000), message: result.message ?? null }), stId]);
  await tryFinalize(st.submission_id);
}

async function tryFinalize(submissionId: string): Promise<void> {
  const rows = await query<{ status: SubmissionStatus; passed: boolean | null; weight: number; runtime_ms: number | null; name: string; hidden: boolean; actual_output: string | null; expected_output: string; detail: any }>(
    `SELECT st.status, st.passed, tc.weight, st.runtime_ms, tc.name, tc.hidden, st.actual_output, tc.expected_output, st.detail FROM submission_tests st JOIN test_cases tc ON tc.id=st.test_case_id WHERE st.submission_id=$1 ORDER BY tc.ordinal`, [submissionId]);
  if (rows.length === 0 || rows.some((r) => !isTerminal(r.status))) return;
  const score = computeScore(rows.map((r) => ({ weight: r.weight, passed: r.passed })));
  const worst = rows.find((r) => r.status !== 'graded');
  const status: SubmissionStatus = worst ? worst.status : 'graded';
  const runtimeMs = rows.reduce((a, r) => a + (r.runtime_ms ?? 0), 0);
  const detail = {
    tests: rows.map((r) => ({ name: r.name, hidden: r.hidden, passed: Boolean(r.passed), status: r.status, expected: r.hidden ? undefined : r.expected_output, actual: r.hidden ? undefined : (r.actual_output ?? '').slice(0, 2000) })),
    stderr: rows.map((r) => r.detail?.stderr).find(Boolean) ?? '',
    compile_output: rows.map((r) => r.detail?.compile_output).find(Boolean) ?? ''
  };
  await finalize(submissionId, { status, score: score.score, passed: score.passed, runtimeMs, detail });
}

async function finalize(submissionId: string, r: { status: SubmissionStatus; score: number; passed: boolean; runtimeMs: number | null; detail: unknown }): Promise<void> {
  const changed = await withTx(async (c) => {
    // Status guard: exactly one finalizer wins under concurrent callbacks.
    const upd = await c.query<SubmissionRow & { exercise_id: string }>(
      `UPDATE submissions SET status=$1, score=$2, passed=$3, runtime_ms=$4, detail=$5, graded_at=now() WHERE id=$6 AND status IN ('queued','processing') RETURNING id, user_id, exercise_id, code, status`,
      [r.status, r.score, r.passed, r.runtimeMs, JSON.stringify(r.detail), submissionId]);
    const sub = upd.rows[0];
    if (!sub) return null;
    const ex = (await c.query<ExerciseRow>('SELECT id,slug,title,language,time_limit_sec,memory_limit_kb,structural_rules,tech_credits,course_ref,lesson_ref FROM exercises WHERE id=$1', [sub.exercise_id])).rows[0]!;
    const prog = await c.query<{ completed: boolean; credited: boolean }>(
      `INSERT INTO exercise_progress(user_id, exercise_id, best_score, attempts, failed_attempts, completed, last_submission_id, updated_at)
       VALUES ($1,$2,$3,1,$4,$5,$6,now())
       ON CONFLICT (user_id, exercise_id) DO UPDATE SET
         best_score = GREATEST(exercise_progress.best_score, EXCLUDED.best_score),
         attempts = exercise_progress.attempts + 1,
         failed_attempts = exercise_progress.failed_attempts + EXCLUDED.failed_attempts,
         completed = exercise_progress.completed OR EXCLUDED.completed,
         last_submission_id = EXCLUDED.last_submission_id, updated_at = now()
       RETURNING completed, credited`,
      [sub.user_id, sub.exercise_id, r.score, r.passed ? 0 : 1, r.passed, submissionId]);
    let credited = false;
    if (r.passed && !prog.rows[0]!.credited) {
      credited = await awardCredits({ userId: sub.user_id, kind: 'tech', amount: ex.tech_credits, sourceType: 'exercise', sourceId: ex.slug, title: ex.title, scoreLabel: `${Math.round(r.score)}%`, itemKind: 'IDE Exercise' }, c);
      await c.query('UPDATE exercise_progress SET credited=true WHERE user_id=$1 AND exercise_id=$2', [sub.user_id, sub.exercise_id]);
      // Mark any curriculum item that points at this exercise as done.
      await c.query(`INSERT INTO item_progress(user_id, item_id, status, score, completed_at)
        SELECT $1, id, 'done', $2, now() FROM curriculum_items WHERE exercise_id=$3
        ON CONFLICT (user_id, item_id) DO UPDATE SET status='done', score=EXCLUDED.score, completed_at=now()`, [sub.user_id, r.score, sub.exercise_id]);
    }
    await touchActivity(sub.user_id, c);
    await c.query(`INSERT INTO events(topic, payload) VALUES ('submission.graded', $1)`, [JSON.stringify({ submissionId, userId: sub.user_id, exerciseId: ex.id, exerciseSlug: ex.slug, score: r.score, passed: r.passed, courseRef: ex.course_ref, lessonRef: ex.lesson_ref })]);
    return { sub, ex, credited, creditsAwarded: credited ? ex.tech_credits : 0 };
  });
  if (!changed) return;
  await audit(changed.sub.user_id, 'submission.graded', submissionId, { exercise: changed.ex.slug, score: r.score, passed: r.passed, credits: changed.creditsAwarded });
  logger.info({ submissionId, score: r.score, passed: r.passed }, 'submission graded');
}

/** Phase-1 bridge: push graded results to WordPress/Tutor when configured (HMAC-signed). */
export async function processOutbox(): Promise<number> {
  const events = await query<{ id: number; topic: string; payload: any; attempts: number }>(`SELECT id, topic, payload, attempts FROM events WHERE processed_at IS NULL AND attempts < 5 ORDER BY id LIMIT 50`);
  let n = 0;
  for (const ev of events) {
    try {
      if (ev.topic === 'submission.graded' && config.wp.gradeEndpoint) {
        const u = await one<{ wp_user_id: string | null }>('SELECT wp_user_id FROM users WHERE id=$1', [ev.payload.userId]);
        if (u?.wp_user_id) {
          const body = JSON.stringify({ userId: Number(u.wp_user_id), exerciseId: ev.payload.exerciseId, lessonRef: ev.payload.lessonRef, courseRef: ev.payload.courseRef, score: ev.payload.score, passed: ev.payload.passed });
          const res = await fetch(config.wp.gradeEndpoint, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Lawmads-Signature': hmacHex(body), ...(config.wp.appUser ? { authorization: 'Basic ' + Buffer.from(`${config.wp.appUser}:${config.wp.appPassword}`).toString('base64') } : {}) }, body });
          if (!res.ok) throw new Error(`wp grade ${res.status}`);
          await query('UPDATE submissions SET synced_to_lms=true WHERE id=$1', [ev.payload.submissionId]);
        }
      }
      await query('UPDATE events SET processed_at=now() WHERE id=$1', [ev.id]);
      n++;
    } catch (e) {
      await query('UPDATE events SET attempts=attempts+1 WHERE id=$1', [ev.id]);
      logger.warn({ event: ev.id, err: String(e) }, 'outbox event failed');
    }
  }
  return n;
}

/** Poll Judge0 for tokens whose callback never arrived. */
export async function reconcile(): Promise<number> {
  const ex = getExecutor();
  if (ex.name !== 'judge0' || !ex.fetch) return 0;
  const stale = await query<{ id: string; judge0_token: string }>(`SELECT id, judge0_token FROM submission_tests WHERE judge0_token IS NOT NULL AND status IN ('queued','processing') AND created_at < now() - interval '15 seconds' LIMIT 100`);
  let n = 0;
  for (const st of stale) {
    const r = await ex.fetch(st.judge0_token).catch(() => null);
    if (r) { await resolveTest(st.id, r); n++; }
  }
  return n;
}

export async function gradeStructuralPreview(rules: StructuralRule[], code: string) {
  const outcomes = evaluateStructural(rules, code);
  return { checks: outcomes, ...computeScore(outcomes) };
}
export { pool };

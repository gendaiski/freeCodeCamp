/** Language-agnostic weighted grading (carried over from Phase-1 grading-service). */
export interface GradedTest { weight: number; passed: boolean | null }

export interface ScoreResult { score: number; passed: boolean; total: number; passedCount: number }

/** Whitespace/newline-tolerant output comparison. */
export function normalizeOutput(s: string | null | undefined): string {
  return (s ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n+$/g, '')
    .trim();
}

export function outputsMatch(expected: string, actual: string): boolean {
  return normalizeOutput(expected) === normalizeOutput(actual);
}

/** Weighted score in [0,100], 2 dp. `passed` requires every weighted case to pass. */
export function computeScore(tests: readonly GradedTest[]): ScoreResult {
  const totalWeight = tests.reduce((a, t) => a + Math.max(0, t.weight), 0);
  if (tests.length === 0 || totalWeight === 0) return { score: 0, passed: false, total: tests.length, passedCount: 0 };
  const earned = tests.reduce((a, t) => a + (t.passed ? Math.max(0, t.weight) : 0), 0);
  const score = Math.round((earned / totalWeight) * 10000) / 100;
  const passedCount = tests.filter((t) => t.passed).length;
  return { score, passed: passedCount === tests.length, total: tests.length, passedCount };
}

export type SubmissionStatus = 'queued' | 'processing' | 'graded' | 'error' | 'time_limit' | 'runtime_error' | 'compile_error';

/** Map a Judge0 status id to our lifecycle state. */
export function mapJudge0Status(id: number): SubmissionStatus {
  if (id === 1) return 'queued';
  if (id === 2) return 'processing';
  if (id === 3 || id === 4) return 'graded';        // accepted / wrong answer → graded by comparison
  if (id === 5) return 'time_limit';
  if (id === 6) return 'compile_error';
  if (id >= 7 && id <= 12) return 'runtime_error';
  return 'error';
}

export const TERMINAL_STATUSES: readonly SubmissionStatus[] = ['graded', 'error', 'time_limit', 'runtime_error', 'compile_error'];
export function isTerminal(s: SubmissionStatus): boolean { return TERMINAL_STATUSES.includes(s); }

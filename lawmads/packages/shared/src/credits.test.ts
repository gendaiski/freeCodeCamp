import { test } from 'node:test';
import assert from 'node:assert/strict';
import { credentialProgress, computeStreak } from './credits.js';

test('credential needs both halves', () => {
  const p = credentialProgress({ tech: 12, law: 7 }, { tech: 12, law: 10 });
  assert.equal(p.complete, false);
  assert.deepEqual(p.missing, { tech: 0, law: 3 });
  assert.equal(p.tech.pct, 100);
  assert.equal(credentialProgress({ tech: 12, law: 10 }, { tech: 12, law: 10 }).complete, true);
});
test('streak counts consecutive days and survives until midnight', () => {
  const days = ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21', '2026-09-22'];
  assert.equal(computeStreak(days, '2026-09-22'), 7);
  assert.equal(computeStreak(days, '2026-09-23'), 7);
  assert.equal(computeStreak(days, '2026-09-24'), 0);
  assert.equal(computeStreak(['2026-09-20', '2026-09-22'], '2026-09-22'), 1);
});

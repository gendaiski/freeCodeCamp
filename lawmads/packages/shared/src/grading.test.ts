import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, normalizeOutput, outputsMatch, mapJudge0Status } from './grading.js';

test('weighted score and pass flag', () => {
  const r = computeScore([{ weight: 1, passed: true }, { weight: 1, passed: true }, { weight: 2, passed: false }]);
  assert.equal(r.score, 50);
  assert.equal(r.passed, false);
  assert.equal(computeScore([{ weight: 1, passed: true }]).passed, true);
  assert.equal(computeScore([]).score, 0);
});
test('output normalisation tolerates CRLF and trailing whitespace', () => {
  assert.equal(normalizeOutput('a \r\nb\r\n\n'), 'a\nb');
  assert.ok(outputsMatch('Carol\nAlice', 'Carol\r\nAlice\r\n'));
  assert.ok(!outputsMatch('7', '8'));
});
test('judge0 status mapping', () => {
  assert.equal(mapJudge0Status(3), 'graded');
  assert.equal(mapJudge0Status(4), 'graded');
  assert.equal(mapJudge0Status(5), 'time_limit');
  assert.equal(mapJudge0Status(6), 'compile_error');
  assert.equal(mapJudge0Status(11), 'runtime_error');
  assert.equal(mapJudge0Status(13), 'error');
});

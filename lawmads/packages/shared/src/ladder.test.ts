import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeLadder } from './ladder.js';

test('one jurisdiction + craft is Local; without craft is none', () => {
  assert.equal(computeLadder({ jurisdictions: ['EG'], hasCraft: true, hasCapstone: false }).tier, 'local');
  assert.equal(computeLadder({ jurisdictions: ['EG'], hasCraft: false, hasCapstone: false }).tier, 'none');
});
test('Egypt + UAE is Regional (same region); Egypt + UK is International', () => {
  assert.equal(computeLadder({ jurisdictions: ['EG', 'AE'], hasCraft: true, hasCapstone: false }).tier, 'regional');
  assert.equal(computeLadder({ jurisdictions: ['eg', 'GB'], hasCraft: true, hasCapstone: false }).tier, 'international');
});
test('three is Global; four needs capstone for Master', () => {
  const g = computeLadder({ jurisdictions: ['EG', 'AE', 'GB'], hasCraft: true, hasCapstone: false });
  assert.equal(g.tier, 'global');
  assert.equal(g.next?.tier, 'master');
  assert.equal(computeLadder({ jurisdictions: ['EG', 'AE', 'GB', 'DE'], hasCraft: true, hasCapstone: false }).tier, 'global');
  assert.equal(computeLadder({ jurisdictions: ['EG', 'AE', 'GB', 'DE'], hasCraft: true, hasCapstone: true }).tier, 'master');
});
test('duplicates are ignored and certificate requirement can be switched on', () => {
  assert.equal(computeLadder({ jurisdictions: ['EG', 'EG'], hasCraft: true, hasCapstone: false }).jurisdictions, 1);
  assert.equal(computeLadder({ jurisdictions: ['EG', 'AE'], hasCraft: true, hasCapstone: false, certificates: 0 }, { requireCertificates: true }).tier, 'local');
  assert.equal(computeLadder({ jurisdictions: ['EG', 'AE'], hasCraft: true, hasCapstone: false, certificates: 1 }, { requireCertificates: true }).tier, 'regional');
});

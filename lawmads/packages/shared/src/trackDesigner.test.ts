import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qualify } from './trackDesigner.js';

test('requires exactly two distinct jurisdictions and a craft', () => {
  assert.equal(qualify({ jurisdictions: ['EG'], craft: 'LUID' }).ok, false);
  assert.equal(qualify({ jurisdictions: ['EG', 'EG'], craft: 'LUID' }).ok, false);
  assert.equal(qualify({ jurisdictions: ['EG', 'AE'], craft: 'NOPE' }).ok, false);
});
test('Egypt + UK + LUID is the rarest cross-border dual-system profile with a credential', () => {
  const r = qualify({ jurisdictions: ['EG', 'GB'], craft: 'LUID' });
  assert.equal(r.ok, true);
  assert.equal(r.tier, 'international');
  assert.equal(r.pairing.kind, 'cross-border');
  assert.equal(r.rarity, 'rarest');
  assert.equal(r.credentialIssues, true);
  assert.match(r.qualifiesAs, /International Lawmad/);
});
test('tools-only craft issues no credential and says so', () => {
  const r = qualify({ jurisdictions: ['EG', 'AE'], craft: 'FIGMA' });
  assert.equal(r.credentialIssues, false);
  assert.ok(r.doesNotQualifyTo.some((s) => /issue nothing/.test(s)));
  assert.equal(r.tier, 'regional');
});

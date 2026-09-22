import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quote, FOUNDING_PROMO, formatUsd } from './pricing.js';

test('LUID checkout with DELTA30 matches the wireframe: $390 − $117 = $273', () => {
  const q = quote({ sku: 'certificate', promo: FOUNDING_PROMO });
  assert.equal(q.listCents, 39000);
  assert.equal(q.discount.cents, 11700);
  assert.equal(q.totalCents, 27300);
  assert.equal(q.dueTodayCents, 27300);
});
test('discounts do not stack — the better one wins', () => {
  const q = quote({ sku: 'certificate', promo: FOUNDING_PROMO, isStudent: true });
  assert.equal(q.discount.kind, 'promo');
  assert.equal(q.totalCents, 27300);
  const s = quote({ sku: 'certificate', isStudent: true });
  assert.equal(s.discount.kind, 'student');
  assert.equal(s.totalCents, 27300);
});
test('3 × $140 installments on the list price; due today is one installment', () => {
  const q = quote({ sku: 'certificate', installments: true });
  assert.deepEqual(q.installments, { count: 3, eachCents: 14000 });
  assert.equal(q.totalCents, 42000);
  assert.equal(q.dueTodayCents, 14000);
});
test('badge bundle anchors at 9 × $79 and enterprise enforces minimum seats', () => {
  const b = quote({ sku: 'badge_bundle' });
  assert.equal(b.listCents, 29900);
  assert.throws(() => quote({ sku: 'enterprise_seat', quantity: 3 }));
  assert.equal(quote({ sku: 'enterprise_seat', quantity: 10 }).totalCents, 59000);
});
test('formatUsd', () => {
  assert.equal(formatUsd(39000), '$390');
  assert.equal(formatUsd(-11700), '−$117');
  assert.equal(formatUsd(1350), '$13.50');
});

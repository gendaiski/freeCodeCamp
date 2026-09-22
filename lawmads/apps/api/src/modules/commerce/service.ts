import { SKUS, quote as quoteSku, type Sku, type PromoDef, ENTERPRISE_MIN_SEATS } from '@lawmads/shared';
import { one, query, withTx } from '../../core/db.js';
import { badRequest, notFound, forbidden, conflict } from '../../core/errors.js';
import { audit } from '../../core/audit.js';
import { config } from '../../core/config.js';
import { getPaymentProvider } from './payments.js';

export async function plans() {
  return {
    plans: [
      { sku: 'plan_free', name: 'Lawmad Free', priceCents: 0, period: 'forever', features: ['Community membership', 'Selected open lessons', 'IDE playground (limited runtime)', 'Public Lawmad profile'], cta: 'Start Free' },
      { sku: 'plan_pro_annual', name: 'Lawmad Pro', priceCents: 1900, period: 'mo · billed annually', monthlyCents: 2900, features: ['All courses & quizzes', 'Full IDE — 18 languages, auto-graded labs', 'Legal drafting exercises', 'Law Database Research tier included (annual)', '+ $9/mo Intelligent Editor add-on', 'Student discount 30% — $13/mo with academic email'], cta: 'Go Pro →', popular: true },
      { sku: 'certificate', name: 'Certifications', priceCents: 39000, diplomaCents: 89000, period: 'one-time', features: ['Professional Certificate® programs', 'Capstone review & assessment', 'Digitally signed + QR verification', 'Installments available', 'Career Certificates $1,490', 'Badge exams $79/jurisdiction · all nine for $299'], cta: 'Browse Programs' },
      { sku: 'enterprise_seat', name: 'Firms & Enterprise', priceCents: 5900, period: 'user/mo · min 10 seats', features: ['Firm-branded cohorts & reporting', 'Editor Firm seats (white-label)', 'Database API access', 'Dedicated success manager'], cta: 'Talk to Us' }
    ],
    offers: [
      { tag: 'BEST VALUE', name: 'AI Track Pass', sku: 'ai_track_pass', priceCents: 169000, anchorCents: 208000, blurb: 'All AI + Agentic programs. Claude, MCP, n8n, and Cursor in one bundle.', chips: ['CL', 'CL+', 'MCP', 'n8n', 'Cur'], dark: true },
      { tag: 'STUDENTS', name: 'Student Monthly', sku: 'plan_student_monthly', priceCents: 1300, anchorCents: 1900, blurb: 'Full platform access. All video lessons, exercises, and the legal editor.', note: 'per month · cancel any time' },
      { tag: 'BADGES', name: 'Jurisdiction Bundle', sku: 'badge_bundle', priceCents: 29900, anchorCents: 71100, blurb: 'All nine jurisdiction badge exams in one bundle.' }
    ],
    skus: SKUS, enterpriseMinSeats: ENTERPRISE_MIN_SEATS, regionalPricing: 'Regional purchasing-power pricing available in Egypt & MENA · All certificates digitally signed & QR-verifiable worldwide'
  };
}

async function loadPromo(code?: string | null): Promise<PromoDef | null> {
  if (!code) return null;
  const p = await one<any>(`SELECT * FROM promo_codes WHERE upper(code)=upper($1) AND active AND (expires_at IS NULL OR expires_at > now()) AND (max_redemptions IS NULL OR redemptions < max_redemptions)`, [code]);
  if (!p) throw badRequest('Promo code is invalid or exhausted');
  return { code: p.code, percentOff: p.percent_off, appliesTo: p.applies_to ?? 'all', maxRedemptions: p.max_redemptions ?? undefined };
}
export interface QuoteReq { sku: string; ref?: string | null; quantity?: number; promo?: string | null; installments?: boolean }
export async function quote(userId: string | null, r: QuoteReq) {
  if (!(r.sku in SKUS)) throw badRequest('Unknown SKU');
  const sku = r.sku as Sku;
  const u = userId ? await one<any>('SELECT academic_verified, plan FROM users WHERE id=$1', [userId]) : null;
  const promo = await loadPromo(r.promo);
  const quantity = r.quantity ?? 1;
  let label: string | null = null;
  if (sku === 'certificate' || sku === 'diploma' || sku === 'career_certificate' || sku === 'course_certificate' || sku.startsWith('ai_')) {
    if (r.ref) { const p = await one<any>('SELECT code, name, sku, price_cents FROM programs WHERE upper(code)=upper($1)', [r.ref]); if (!p) throw notFound('Program'); label = `${p.code}® — ${p.name}`; }
  } else if (sku === 'badge_exam') {
    if (!r.ref) throw badRequest('Choose a jurisdiction');
    const j = await one<any>('SELECT code, name FROM jurisdictions WHERE upper(code)=upper($1)', [r.ref]); if (!j) throw notFound('Jurisdiction'); label = `${j.name} badge exam`;
  } else if (sku.startsWith('shop_')) {
    const p = await one<any>('SELECT slug, name FROM products WHERE slug=$1', [r.ref ?? '']); if (!p) throw notFound('Product'); label = p.name;
  }
  const q = quoteSku({ sku, quantity, promo, isStudent: Boolean(u?.academic_verified), installments: Boolean(r.installments) });
  if (label) q.lines[0]!.label = label + (quantity > 1 ? ` × ${quantity}` : '');
  return { ...q, ref: r.ref ?? null, refundWindowDays: 14, testCard: config.payments.provider === 'mock' ? '4242 4242 4242 4242' : null };
}

export interface CheckoutReq extends QuoteReq { card?: { number: string; expiry: string; cvc: string; name?: string } | null; paymentMethodId?: string | null }
export async function checkout(userId: string, r: CheckoutReq) {
  const q = await quote(userId, r);
  const provider = getPaymentProvider();
  const order = await withTx(async (c) => {
    const o = await c.query(`INSERT INTO orders(user_id, status, subtotal_cents, discount_cents, total_cents, due_today_cents, promo_code, installments, quote, provider) VALUES ($1,'pending',$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [userId, q.listCents, q.discount.cents, q.totalCents, q.dueTodayCents, q.discount.kind === 'promo' ? q.discount.code : null, q.installments ? JSON.stringify(q.installments) : null, JSON.stringify(q), provider.name]);
    const ord = o.rows[0];
    await c.query(`INSERT INTO order_items(order_id, sku, ref, quantity, unit_cents, label) VALUES ($1,$2,$3,$4,$5,$6)`, [ord.id, q.sku, q.ref, q.quantity, Math.round(q.listCents / q.quantity), q.lines[0]!.label]);
    return ord;
  });
  const charge = await provider.charge({ amountCents: q.dueTodayCents, currency: 'USD', orderId: order.id, card: r.card ?? null, paymentMethodId: r.paymentMethodId ?? null });
  await withTx(async (c) => {
    await c.query(`INSERT INTO payments(order_id, amount_cents, status, provider, provider_ref, card_last4) VALUES ($1,$2,$3,$4,$5,$6)`, [order.id, q.dueTodayCents, charge.ok ? 'succeeded' : 'failed', provider.name, charge.ref, charge.last4]);
    if (!charge.ok) { await c.query(`UPDATE orders SET status='failed' WHERE id=$1`, [order.id]); return; }
    await c.query(`UPDATE orders SET status='paid', paid_at=now(), provider_ref=$2 WHERE id=$1`, [order.id, charge.ref]);
    if (q.discount.kind === 'promo') await c.query(`UPDATE promo_codes SET redemptions=redemptions+1 WHERE code=$1`, [q.discount.code]);
    if (q.installments) for (let i = 1; i < q.installments.count; i++) await c.query(`INSERT INTO installment_schedules(order_id, ordinal, amount_cents, due_at) VALUES ($1,$2,$3, now() + ($4 || ' months')::interval)`, [order.id, i + 1, q.installments.eachCents, i]);
    await fulfil(c, userId, q.sku, q.ref, q.quantity, order.id);
  });
  if (!charge.ok) throw badRequest(charge.message ?? 'Payment declined');
  await audit(userId, 'order.paid', order.id, { sku: q.sku, ref: q.ref, total: q.totalCents });
  return { orderId: order.id, status: 'paid', totalCents: q.totalCents, dueTodayCents: q.dueTodayCents, receipt: { last4: charge.last4, ref: charge.ref } , fulfilment: fulfilmentSummary(q.sku, q.ref) };
}
function fulfilmentSummary(sku: Sku, ref: string | null) {
  if (['certificate', 'diploma', 'career_certificate', 'course_certificate', 'ai_cfb', 'ai_cm', 'ai_aai'].includes(sku)) return { kind: 'enrollment', ref, next: `/programs/${(ref ?? '').toLowerCase()}` };
  if (sku === 'badge_exam' || sku === 'badge_bundle') return { kind: 'badge-entitlement', ref, next: ref ? `/badges/${ref.toLowerCase()}` : '/badges' };
  if (sku.startsWith('plan_') || sku.startsWith('db_') || sku.startsWith('editor_') || sku === 'addon_editor_student' || sku === 'enterprise_seat') return { kind: 'subscription', ref: sku, next: '/dashboard' };
  if (sku === 'ai_track_pass') return { kind: 'enrollment', ref: 'AI track', next: '/programs?track=ai-automation' };
  return { kind: 'order', ref, next: '/shop' };
}
async function fulfil(c: any, userId: string, sku: Sku, ref: string | null, quantity: number, orderId: string) {
  const def = SKUS[sku];
  if (['certificate', 'diploma', 'career_certificate', 'course_certificate', 'ai_cfb', 'ai_cm', 'ai_aai'].includes(sku) && ref) {
    await c.query(`INSERT INTO enrollments(user_id, program_code, order_id) VALUES ($1, upper($2), $3) ON CONFLICT (user_id, program_code) DO NOTHING`, [userId, ref, orderId]);
    const first = await c.query(`SELECT ci.id FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE pt.program_code=upper($1) ORDER BY pt.ordinal, ci.ordinal LIMIT 1`, [ref]);
    if (first.rows[0]) await c.query(`INSERT INTO item_progress(user_id, item_id, status) VALUES ($1,$2,'now') ON CONFLICT DO NOTHING`, [userId, first.rows[0].id]);
  } else if (sku === 'ai_track_pass') {
    for (const code of ['CFB', 'LNA', 'AICP', 'CM', 'AAI']) await c.query(`INSERT INTO enrollments(user_id, program_code, order_id) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`, [userId, code, orderId]);
  } else if (def.billing === 'monthly' || def.billing === 'annual' || def.billing === 'per_seat_monthly') {
    const months = def.billing === 'annual' ? 12 : 1;
    await c.query(`INSERT INTO subscriptions(user_id, sku, status, order_id, current_period_end) VALUES ($1,$2,'active',$3, now() + ($4 || ' months')::interval)`, [userId, sku, orderId, months]);
    if (sku.startsWith('plan_')) await c.query(`UPDATE users SET plan=$1 WHERE id=$2`, [sku, userId]);
    if (sku === 'plan_pro_annual') await c.query(`INSERT INTO subscriptions(user_id, sku, status, order_id, current_period_end) VALUES ($1,'db_research','active',$2, now() + interval '12 months')`, [userId, orderId]);
  }
  void quantity;
}
export async function orders(userId: string) {
  return query<any>(`SELECT o.id, o.status, o.total_cents, o.due_today_cents, o.discount_cents, o.promo_code, o.installments, o.created_at, o.paid_at, json_agg(json_build_object('sku', i.sku, 'ref', i.ref, 'label', i.label, 'quantity', i.quantity, 'unitCents', i.unit_cents)) AS items FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.user_id=$1 GROUP BY o.id ORDER BY o.created_at DESC`, [userId]);
}
export async function refund(userId: string, orderId: string, actor: string) {
  const o = await one<any>('SELECT * FROM orders WHERE id=$1', [orderId]);
  if (!o) throw notFound('Order');
  if (o.user_id !== userId && actor !== 'admin') throw forbidden();
  if (o.status !== 'paid') throw conflict('Order is not refundable');
  if (Date.now() - new Date(o.paid_at).getTime() > 14 * 86400_000 && actor !== 'admin') throw forbidden('The 14-day refund window has closed');
  const r = await getPaymentProvider().refund(o.provider_ref, o.due_today_cents);
  await withTx(async (c) => {
    await c.query(`UPDATE orders SET status='refunded' WHERE id=$1`, [orderId]);
    await c.query(`INSERT INTO payments(order_id, amount_cents, status, provider, provider_ref) VALUES ($1,$2,'refunded',$3,$4)`, [orderId, -o.due_today_cents, o.provider, r.ref]);
    await c.query(`UPDATE enrollments SET status='cancelled' WHERE order_id=$1`, [orderId]);
    await c.query(`UPDATE subscriptions SET status='cancelled' WHERE order_id=$1`, [orderId]);
  });
  await audit(actor === 'admin' ? 'admin' : userId, 'order.refund', orderId, {});
  return { ok: true };
}
export async function book(input: { userId: string | null; fullName: string; email: string; interest: string; slot: string; channel: 'video' | 'whatsapp'; notes?: string }) {
  const slot = new Date(input.slot);
  if (Number.isNaN(slot.getTime()) || slot.getTime() < Date.now() - 60_000) throw badRequest('Choose a future slot');
  const r = await query(`INSERT INTO bookings(user_id, full_name, email, interest, slot, channel, notes) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, slot, channel, status`, [input.userId, input.fullName, input.email, input.interest, slot.toISOString(), input.channel, input.notes ?? null]);
  return r[0];
}
export function slots(): Array<{ label: string; at: string }> {
  const out: Array<{ label: string; at: string }> = [];
  const now = new Date();
  const mk = (dayOffset: number, hour: number, minute: number) => { const d = new Date(now); d.setUTCDate(now.getUTCDate() + dayOffset); d.setUTCHours(hour, minute, 0, 0); return d; };
  const candidates = [mk(0, 16, 30), mk(0, 18, 0), mk(1, 11, 0), mk(1, 15, 30), mk(2, 10, 0), mk(2, 14, 30)];
  for (const d of candidates) {
    if (d.getTime() < now.getTime()) continue;
    const day = d.getUTCDate() === now.getUTCDate() ? 'Today' : d.getUTCDate() === now.getUTCDate() + 1 ? 'Tomorrow' : d.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' });
    out.push({ label: `${day} ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}`, at: d.toISOString() });
    if (out.length === 4) break;
  }
  return out;
}

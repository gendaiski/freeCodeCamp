/** Payment provider abstraction: MockProvider (dev/test, accepts the 4242 test card) and a Stripe adapter skeleton. */
import { config } from '../../core/config.js';
import { randomToken } from '../../core/crypto.js';

export interface ChargeReq { amountCents: number; currency: string; orderId: string; card: { number: string; expiry: string; cvc: string; name?: string } | null; paymentMethodId: string | null }
export interface ChargeResult { ok: boolean; ref: string; last4: string | null; message?: string }
export interface PaymentProvider { name: 'mock' | 'stripe'; charge(r: ChargeReq): Promise<ChargeResult>; refund(ref: string | null, amountCents: number): Promise<{ ref: string }> }

export class MockProvider implements PaymentProvider {
  name = 'mock' as const;
  async charge(r: ChargeReq): Promise<ChargeResult> {
    if (r.amountCents === 0) return { ok: true, ref: `mock_free_${randomToken(6)}`, last4: null };
    const n = (r.card?.number ?? '').replace(/\s+/g, '');
    if (!/^\d{12,19}$/.test(n)) return { ok: false, ref: `mock_declined_${randomToken(6)}`, last4: null, message: 'Enter a valid card number (test card: 4242 4242 4242 4242)' };
    if (!luhn(n)) return { ok: false, ref: `mock_declined_${randomToken(6)}`, last4: n.slice(-4), message: 'Card number failed validation' };
    if (n.endsWith('0002')) return { ok: false, ref: `mock_declined_${randomToken(6)}`, last4: n.slice(-4), message: 'Card declined (test decline)' };
    if (!/^\d{2}\s*\/\s*\d{2,4}$/.test(r.card?.expiry ?? '')) return { ok: false, ref: `mock_declined_${randomToken(6)}`, last4: n.slice(-4), message: 'Expiry must be MM/YY' };
    if (!/^\d{3,4}$/.test(r.card?.cvc ?? '')) return { ok: false, ref: `mock_declined_${randomToken(6)}`, last4: n.slice(-4), message: 'CVC must be 3 or 4 digits' };
    return { ok: true, ref: `mock_ch_${randomToken(8)}`, last4: n.slice(-4) };
  }
  async refund(_ref: string | null): Promise<{ ref: string }> { return { ref: `mock_re_${randomToken(8)}` }; }
}
function luhn(n: string): boolean { let s = 0, alt = false; for (let i = n.length - 1; i >= 0; i--) { let d = Number(n[i]); if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; } return s % 10 === 0; }

/** Stripe adapter: PaymentIntents via the REST API (no SDK dependency). Card details never touch this server — the web app tokenises with Stripe.js and sends paymentMethodId. */
export class StripeProvider implements PaymentProvider {
  name = 'stripe' as const;
  private async call(path: string, body: Record<string, string>): Promise<any> {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, { method: 'POST', headers: { authorization: `Bearer ${config.payments.stripeSecretKey}`, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body) });
    const j: any = await res.json();
    if (!res.ok) throw new Error(j?.error?.message ?? `stripe ${res.status}`);
    return j;
  }
  async charge(r: ChargeReq): Promise<ChargeResult> {
    if (r.amountCents === 0) return { ok: true, ref: 'free', last4: null };
    if (!r.paymentMethodId) return { ok: false, ref: '', last4: null, message: 'paymentMethodId required (tokenise with Stripe.js)' };
    const pi = await this.call('payment_intents', { amount: String(r.amountCents), currency: r.currency.toLowerCase(), payment_method: r.paymentMethodId, confirm: 'true', 'metadata[orderId]': r.orderId, 'automatic_payment_methods[enabled]': 'true', 'automatic_payment_methods[allow_redirects]': 'never' });
    return { ok: pi.status === 'succeeded', ref: pi.id, last4: pi.charges?.data?.[0]?.payment_method_details?.card?.last4 ?? null, message: pi.status !== 'succeeded' ? `Payment ${pi.status}` : undefined };
  }
  async refund(ref: string | null, amountCents: number): Promise<{ ref: string }> {
    if (!ref) throw new Error('missing payment reference');
    const re = await this.call('refunds', { payment_intent: ref, amount: String(amountCents) });
    return { ref: re.id };
  }
}
let provider: PaymentProvider | null = null;
export function getPaymentProvider(): PaymentProvider {
  if (!provider) provider = config.payments.provider === 'stripe' && config.payments.stripeSecretKey ? new StripeProvider() : new MockProvider();
  return provider;
}

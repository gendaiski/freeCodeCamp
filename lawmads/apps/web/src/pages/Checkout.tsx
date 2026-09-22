import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { usd } from '../lib/format';
import { BackBar, Field, Loading } from '../components/ui';
export default function Checkout() {
  const { sku = '' } = useParams(); const [sp] = useSearchParams(); const nav = useNavigate(); const { refreshUser } = useAuth();
  const ref = sp.get('ref'); const [promo, setPromo] = useState(sp.get('promo') ?? ''); const [applied, setApplied] = useState(sp.get('promo') ?? '');
  const [installments, setInstallments] = useState(false); const [quantity, setQuantity] = useState(Number(sp.get('qty')) || (sku === 'enterprise_seat' ? 10 : 1));
  const [quote, setQuote] = useState<any>(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const [card, setCard] = useState({ number: '', expiry: '', cvc: '', name: '' });
  useEffect(() => { setErr(''); post('/commerce/quote', { sku, ref, promo: applied || null, installments, quantity }).then(setQuote).catch((e) => { setErr(e.message); setQuote(null); }); }, [sku, ref, applied, installments, quantity]);
  const pay = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); try { const r = await post('/commerce/checkout', { sku, ref, promo: applied || null, installments, quantity, card: quote.dueTodayCents > 0 ? card : null }); await refreshUser(); nav(`/dashboard?paid=${r.orderId}`, { state: r }); } catch (x: any) { setErr(x.message); } setBusy(false); };
  return (
    <>
      <BackBar crumbs={[['Pricing', '/pricing'], ['Checkout']]} />
      <section className="section"><div className="wrap">
        <span className="eyebrow">Enrollment</span><h1 style={{ fontSize: 'clamp(28px,4vw,44px)' }}>Checkout — {quote?.lines[0]?.label ?? sku}</h1>
        {!quote && !err ? <Loading /> : <div className="split split--wide" style={{ marginTop: 28 }}>
          <form className="form" onSubmit={pay}>
            <h3>Payment</h3>
            {quote?.installments !== undefined && (sku === 'certificate' || sku === 'diploma' || sku === 'career_certificate') && <div className="filters"><button type="button" className={`filter${!installments ? ' filter--active' : ''}`} onClick={() => setInstallments(false)}>One-time — {usd(quote?.listCents)}</button><button type="button" className={`filter${installments ? ' filter--active' : ''}`} onClick={() => setInstallments(true)}>Installments</button></div>}
            {sku === 'enterprise_seat' && <Field label="Seats (min 10)"><input type="number" min={10} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} /></Field>}
            {quote && quote.dueTodayCents > 0 && <>
              <Field label="Card number"><input required inputMode="numeric" placeholder="4242 4242 4242 4242" value={card.number} onChange={(e) => setCard({ ...card, number: e.target.value })} /></Field>
              <div className="field-row"><Field label="Expiry"><input required placeholder="MM/YY" value={card.expiry} onChange={(e) => setCard({ ...card, expiry: e.target.value })} /></Field><Field label="CVC"><input required placeholder="123" value={card.cvc} onChange={(e) => setCard({ ...card, cvc: e.target.value })} /></Field></div>
            </>}
            <Field label="Promo code" hint={applied ? `${applied} applied — ${quote?.discount?.kind === 'promo' ? `${usd(quote.discount.cents)} off` : 'not applicable to this item'}` : undefined}><div style={{ display: 'flex', gap: 8 }}><input value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} placeholder="DELTA30" /><button type="button" className="btn btn--outline" onClick={() => setApplied(promo)}>Apply</button></div></Field>
            {quote?.testCard && <div className="notice">Test card: {quote.testCard} · any future expiry · any CVC</div>}
            {err && <div className="alert">{err}</div>}
            <button className="btn btn--lg" disabled={busy || !quote}>{busy ? 'Processing…' : `Complete ${sku.startsWith('plan_') ? 'subscription' : 'enrolment'} →`}</button>
            <p className="muted" style={{ fontSize: 13 }}>Secured payment · 14-day refund policy · student discount auto-applied with academic email</p>
          </form>
          <aside className="card card--flat">
            <h3>Order summary</h3>
            {quote?.lines.map((l: any, i: number) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><span>{l.label}</span><span>{usd(l.cents)}</span></div>)}
            <hr className="hr" />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: 20 }}><span>Total due today</span><span>{usd(quote?.dueTodayCents ?? 0)}</span></div>
            {quote?.installments && <div className="muted" style={{ fontSize: 13 }}>{quote.installments.count} × {usd(quote.installments.eachCents)} · total {usd(quote.totalCents)}</div>}
            <ul className="list check" style={{ fontSize: 13, marginTop: 8 }}><li>Auto-graded IDE labs included</li><li>Digitally signed, QR-verifiable certificate</li><li>Counts toward the Regional Lawmad badge</li></ul>
            <Link to="/pricing" className="link" style={{ fontSize: 13 }}>Change plan</Link>
          </aside>
        </div>}
      </div></section>
    </>
  );
}

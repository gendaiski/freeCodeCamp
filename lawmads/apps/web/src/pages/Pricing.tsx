import { Link } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { usd } from '../lib/format';
import { PageHead, Section, Loading } from '../components/ui';
export default function Pricing() {
  const p = useApi<any>('/commerce/plans');
  return (
    <>
      <PageHead eyebrow="Pricing" title={<>Subscribe to learn everything.<br />Pay once for credentials that verify forever.</>} />
      <Section>
        {!p.data ? <Loading /> : <div className="cards cards--4">{p.data.plans.map((pl: any) => (
          <div key={pl.sku} className="card" style={pl.popular ? { border: '2px solid var(--ink)' } : {}}>
            {pl.popular && <span className="tag tag--corner">Most popular</span>}
            <h3>{pl.name}</h3>
            <div style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.03em' }}>{pl.priceCents === 0 ? '$0' : pl.sku === 'certificate' ? `${usd(pl.priceCents)} certificate` : usd(pl.priceCents)}{pl.diplomaCents && <div style={{ fontSize: 18 }}>{usd(pl.diplomaCents)} diploma</div>}<div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{pl.period}{pl.monthlyCents ? ` · ${usd(pl.monthlyCents)} monthly` : ''}</div></div>
            <ul className="list" style={{ fontSize: 14 }}>{pl.features.map((f: string) => <li key={f}>{f}</li>)}</ul>
            <Link to={pl.sku === 'certificate' ? '/programs' : pl.sku === 'enterprise_seat' ? '/schedule' : pl.sku === 'plan_free' ? '/get-started' : `/checkout/${pl.sku}`} className={`btn btn--block${pl.popular ? '' : ' btn--outline'}`} style={{ marginTop: 'auto' }}>{pl.cta}</Link>
          </div>))}</div>}
        <p className="muted" style={{ textAlign: 'center', marginTop: 24, fontSize: 14 }}>{p.data?.regionalPricing}</p>
        <div className="callout" style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><div><strong>Not sure what to buy?</strong><div className="muted">Build the combination first. The qualification builder prices the whole path — craft plus badges — and tells you exactly what it certifies.</div></div><Link to="/track-designer" className="btn">Design your track →</Link></div>
      </Section>
    </>
  );
}

import { Link } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { usd } from '../lib/format';
import { PageHead, Section, Loading } from '../components/ui';
export default function Shop() {
  const p = useApi<any>('/shop/products');
  return (
    <>
      <PageHead eyebrow="Community" title="The Lawmads E-Shop" sub="The classic cotton tee, plus monthly community-designed drops. Tees Projects: winning designers earn a royalty on every featured tee sold." />
      <Section>{!p.data ? <Loading /> : <div className="cards">{p.data.products.map((x: any) => <div key={x.slug} className="card"><span style={{ fontSize: 40, fontFamily: 'var(--mono)', fontWeight: 800 }}>{x.icon}</span><span className="tag">{x.tag}{x.designer ? ` · by ${x.designer}` : ''}</span><h3>{x.name}</h3><p className="muted" style={{ fontSize: 14 }}>{x.blurb}</p><div className="meta"><span style={{ fontWeight: 900, fontSize: 20, color: 'var(--ink)' }}>{usd(x.priceCents)}</span><Link to={`/checkout/${x.sku}?ref=${x.slug}`} className="btn btn--sm" style={{ marginInlineStart: 'auto' }}>Add to cart →</Link></div></div>)}</div>}
        <div className="callout" style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}><div><strong>🏆 Tees Projects — submit your design</strong><div className="muted">Community vote picks the monthly drop. Winner earns a royalty on every sale.</div></div><Link to="/community#tees" className="btn">Submit in Community →</Link></div>
      </Section>
    </>
  );
}

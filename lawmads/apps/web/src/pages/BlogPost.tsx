import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { post } from '../lib/api';
import { dateLong } from '../lib/format';
import { BackBar, Loading, ErrorBox } from '../components/ui';
import Markdown from '../components/Markdown';
export default function BlogPost() {
  const { slug = '' } = useParams(); const p = useApi<any>(`/content/blog/${slug}`); const [email, setEmail] = useState(''); const [done, setDone] = useState(false);
  const d = p.data; if (p.loading) return <Loading />; if (p.error || !d) return <div className="wrap section"><ErrorBox error={p.error} /></div>;
  return (
    <>
      <BackBar crumbs={[['Blog & News', '/blog'], [d.title]]} />
      <article className="wrap wrap--narrow section"><span className="eyebrow">{d.category}</span><h1 style={{ fontSize: 'clamp(30px,4.5vw,52px)' }}>{d.title}</h1><p className="muted" style={{ marginTop: 12 }}>{d.author} · {dateLong(d.publishedAt)} · {d.readMinutes} min read</p><Markdown md={d.bodyMd.replace(/^# .*\n/, '')} className="lead" />
        <div className="card card--stone card--flat" style={{ marginTop: 40 }}><span className="tag">The Delta Brief</span><h3>The weekly letter on law × technology — a 5-minute read for the Delta Generation.</h3>{done ? <span className="chip chip--green">✓ Subscribed</span> : <div style={{ display: 'flex', gap: 8 }}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@firm.law" style={{ flex: 1, padding: 10, border: '1px solid var(--line2)' }} /><button className="btn" onClick={() => post('/content/newsletter', { email }).then(() => setDone(true))}>Subscribe →</button></div>}</div>
        <h3 style={{ marginTop: 40 }}>Keep reading</h3><div className="cards" style={{ marginTop: 12 }}>{d.related.map((r: any) => <Link key={r.slug} to={`/blog/${r.slug}`} className="card"><span className="tag">{r.category}</span><h3 style={{ fontSize: 17 }}>{r.title}</h3><div className="meta"><span>{r.readMinutes} min</span></div></Link>)}</div>
      </article>
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { dateLong } from '../lib/format';
import { PageHead, Section, Filters, Loading, Stat } from '../components/ui';
export default function Blog() {
  const [cat, setCat] = useState('all'); const b = useApi<any>('/content/blog');
  const d = b.data; if (!d) return <Loading />;
  const list = d.posts.filter((p: any) => cat === 'all' || p.category === cat);
  return (
    <>
      <PageHead eyebrow="Blog & News" title="Legal Tech Insights & Platform Updates" sub={`${d.stats.posts} posts across four categories — trends, deep dives, research and platform releases. A new piece every week.`}><div className="stats" style={{ marginTop: 24 }}><Stat value={d.stats.posts} label="Blog posts" /><Stat value={d.stats.categories} label="Topics covered" /><Stat value={d.stats.cadence} label="New content" /><Stat value={`${d.stats.avgRead}min`} label="Average read" /></div></PageHead>
      <Section><Filters items={[['all', 'All posts'], ...d.categories.map(([k, l]: [string, string]) => [k, l] as [string, string])]} active={cat} onChange={setCat} /><div className="cards" style={{ marginTop: 20 }}>{list.map((p: any) => <Link key={p.slug} to={`/blog/${p.slug}`} className="card"><span className="arrowlink">→</span><span className="tag">{d.categories.find(([k]: [string]) => k === p.category)?.[1] ?? p.category}</span><h3>{p.title}</h3><p className="muted" style={{ fontSize: 14 }}>{p.excerpt}</p><div className="meta"><span>{p.author}</span><span>{dateLong(p.publishedAt)}</span><span>{p.readMinutes} min read</span></div></Link>)}</div></Section>
    </>
  );
}

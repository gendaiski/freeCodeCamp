import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { PageHead, Section, Filters, Loading } from '../components/ui';
export default function Courses() {
  const [cat, setCat] = useState('all');
  const c = useApi<{ courses: any[] }>('/catalog/courses');
  const list = (c.data?.courses ?? []).filter((x) => cat === 'all' || x.category === cat);
  return (
    <>
      <PageHead eyebrow="Courses" title={`${c.data?.courses.length ?? ''} courses. Design, code, data and AI.`} sub="Standalone courses you can take on their own, or stack into a full Lawmads certification. Every course is graded in the IDE and earns Tech Credits." />
      <Section>
        <Filters items={[['all', 'All courses'], ['design', 'Design'], ['development', 'Development'], ['data', 'Data & AI'], ['specialized', 'Specialized']]} active={cat} onChange={setCat} />
        <p style={{ marginTop: 16 }}><Link to="/programs" className="link">— browse the full certification programs →</Link></p>
        {c.loading ? <Loading /> : <div className="cards" style={{ marginTop: 20 }}>{list.map((x) => <Link key={x.slug} to={`/courses/${x.slug}`} className="card"><span className="arrowlink">→</span><span className="tag">{x.category}</span><h3>{x.title}</h3><p className="muted">{x.blurb}</p><div className="meta"><span>{x.hours}h</span><span>{x.level}</span>{x.programCode && <span>→ {x.programCode}®</span>}</div></Link>)}</div>}
      </Section>
    </>
  );
}

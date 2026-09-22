import { Link, useParams } from 'react-router-dom';
import { useApi, useToast } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { post } from '../lib/api';
import { BackBar, Loading, ErrorBox, Toast } from '../components/ui';
export default function Course() {
  const { slug = '' } = useParams(); const { user } = useAuth(); const { toast, show } = useToast();
  const c = useApi<any>(`/catalog/courses/${slug}`, [user?.id]);
  const d = c.data;
  if (c.loading) return <Loading />;
  if (c.error || !d) return <div className="wrap section"><ErrorBox error={c.error} /></div>;
  const start = async () => { try { await post(`/me/courses/${d.slug}/enroll`); show('Course started — it is in your dashboard'); c.reload(); } catch (e: any) { show(e.message, 'error'); } };
  return (
    <>
      <BackBar crumbs={[['Courses', '/courses'], [d.title]]} />
      <section className="section"><div className="wrap split split--wide">
        <div>
          <span className="eyebrow">{d.category} course{d.programName ? ` · part of ${d.programName}` : ''}</span>
          <h1 style={{ fontSize: 'clamp(32px,4.5vw,52px)' }}>{d.title}</h1>
          <p className="lead" style={{ marginTop: 14 }}>{d.blurb}</p>
          <h3 style={{ marginTop: 32 }}>What you walk away with</h3>
          <ul className="list check"><li>Working {d.language ? d.language : 'craft'} fundamentals, graded in the IDE</li><li>Tech Credits written to your transcript</li><li>The law of the craft — one module, examined</li></ul>
          <h3 style={{ marginTop: 32 }}>Syllabus</h3>
          <div className="accordion"><details open><summary>Course modules ▾</summary><div className="rows">{d.modules.map((m: any, i: number) => <div key={i} className="row"><span className={`kind kind--${m.kind}`}>{m.kind.toUpperCase()}</span><span>{m.title}</span><span className="dur">{m.minutes} min</span><span /></div>)}</div></details></div>
          <p className="muted" style={{ marginTop: 12 }}>Every exercise in this course is auto-graded in the Lawmads IDE. Passing test cases writes Tech Credits straight to your transcript.</p>
        </div>
        <aside className="card card--flat" style={{ position: 'sticky', top: 90 }}>
          <span className="tag">Included</span><div style={{ fontWeight: 900, fontSize: 22 }}>with Lawmad Pro · $19/mo</div>
          <dl className="kv"><dt>Hours</dt><dd>{d.hours} of video & labs</dd><dt>Level</dt><dd>{d.level}</dd><dt>Graded</dt><dd>Auto-graded IDE exercises</dd><dt>Counts toward</dt><dd>{d.programCode ? `${d.programCode}® certification` : 'Course certificate'}</dd></dl>
          {user ? <button className="btn btn--block" onClick={start}>{d.enrolled ? 'Continue this course →' : 'Start this course →'}</button> : <Link to="/get-started" className="btn btn--block">Start this course →</Link>}
          {d.tryExercise && <Link to={`/ide/${d.language}/${d.tryExercise.slug}`} className="btn btn--outline btn--block">Try an exercise first</Link>}
          <Link to="/track-designer" className="link" style={{ fontSize: 14 }}>◈ Pair it with 2 jurisdictions</Link>
        </aside>
      </div></section>
      <Toast toast={toast} />
    </>
  );
}

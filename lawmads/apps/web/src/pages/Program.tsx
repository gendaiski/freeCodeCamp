import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { usd } from '../lib/format';
import { BackBar, Loading, ErrorBox, Progress } from '../components/ui';
import type { ProgramDetailDto, CurriculumItemDto } from '@lawmads/shared';

const KIND: Record<string, string> = { video: 'VIDEO', quiz: 'QUIZ', lab: 'LAB', law: 'LAW', exam: 'EXAM', project: 'PROJECT', capstone: 'CAPSTONE' };
export function itemLink(programCode: string, it: CurriculumItemDto): string | null {
  if (it.lessonId) return `/learn/${programCode.toLowerCase()}/${it.lessonId}`;
  if (it.quizId) return `/quiz/${it.quizId}`;
  if (it.exerciseId) return `/ide/${it.exerciseId.split('-')[0]}/${it.exerciseId}`;
  return null;
}
export default function Program() {
  const { code = '' } = useParams();
  const { user } = useAuth();
  const p = useApi<ProgramDetailDto>(`/catalog/programs/${code}`, [user?.id]);
  const d = p.data;
  if (p.loading) return <Loading />;
  if (p.error || !d) return <div className="wrap section"><ErrorBox error={p.error} /></div>;
  const firstLesson = d.tracks.flatMap((t) => t.items).find((i) => i.lessonId);
  const isCert = d.kind === 'certificate' || d.kind === 'course_certificate';
  return (
    <>
      <BackBar crumbs={[['Programs', '/programs'], [d.name]]} />
      <div className="pagehead">
        <div className="wrap">
          <span className="eyebrow">{d.trackName} Track</span>
          <h1 style={{ fontSize: 'clamp(32px,4.5vw,56px)' }}>{d.name} — <span className="red">{d.code}{isCert ? '®' : ''}</span></h1>
          <p className="lead" style={{ marginTop: 14 }}>{d.overview}</p>
          <div className="pills"><span className="pill">⏱ {d.weeks} weeks</span><span className="pill">{d.level}</span><span className="pill">{d.techCredits} Tech / {d.lawCredits} Law Credits</span><span className="pill">{d.tools.join(' · ')}</span><span className="pill">{d.lawAreas.join(' · ')}</span></div>
          {d.enrolled && d.progressPct !== null && <div style={{ marginTop: 20, maxWidth: 420 }}><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Your progress</span><span>{d.progressPct}%</span></div><Progress pct={d.progressPct} tone="red" /></div>}
        </div>
      </div>
      <section className="section"><div className="wrap split split--wide">
        <div>
          <span className="eyebrow">Curriculum</span><h2 style={{ marginBottom: 24 }}>Three tracks. One capstone.</h2>
          <div className="accordion">
            {d.tracks.map((t, ti) => (
              <details key={t.code} open={ti === 0}>
                <summary>{t.name}</summary>
                <div className="rows" style={{ marginBottom: 12 }}>
                  {t.items.map((it) => { const to = itemLink(d.code, it); const inner = <><span className={`kind kind--${it.kind}`}>{KIND[it.kind]}</span><span>{it.title}</span><span className="dur">{it.minutes ? `${it.minutes} min` : it.meta ?? ''}</span><span className="red" style={{ fontWeight: 700, fontSize: 13 }}>{it.status === 'done' ? '✓' : to ? (it.kind === 'lab' ? 'Open in IDE →' : 'Open →') : ''}</span></>; return to ? <Link key={it.id} to={to} className={`row ${it.status ?? ''}`}>{inner}</Link> : <div key={it.id} className={`row ${it.status ?? ''}`}>{inner}</div>; })}
                </div>
              </details>
            ))}
          </div>
          <h3 style={{ marginTop: 40 }}>Career Outcomes</h3><p className="muted">{d.careerOutcomes}</p>
          <h3 style={{ marginTop: 24 }}>Capstone</h3><p className="muted">{d.capstone}</p>
          <h3 style={{ marginTop: 24 }}>Assessment</h3><p className="muted">{d.assessment}</p>
          {d.whoFor && <><h3 style={{ marginTop: 24 }}>Who it is for</h3><p className="muted">{d.whoFor}</p></>}
        </div>
        <aside className="card card--flat" style={{ position: 'sticky', top: 90 }}>
          <span className="tag">{d.kind === 'diploma' ? 'Lawmads Diploma' : d.kind === 'career' ? 'Career Certificate' : 'Professional Certification'}</span>
          <div style={{ fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em' }}>{usd(d.priceCents)} <span className="muted" style={{ fontSize: 14, fontWeight: 600 }}>one-time{d.installments ? ` · or ${d.installments.count} × ${usd(d.installments.eachCents)}` : ''}</span></div>
          <ul className="list" style={{ fontSize: 14 }}><li>Three tracks: Foundations, Applied practice, The Law of the craft</li><li>Capstone: {d.capstone.split('.')[0]}</li><li>Auto-graded labs in the Lawmads IDE</li><li>Digitally signed, QR-verifiable certificate</li><li>Counts toward the Regional Lawmad badge</li></ul>
          <div className="muted" style={{ fontSize: 13 }}>Prerequisite: {d.prerequisite}</div>
          {d.enrolled ? <Link to="/dashboard" className="btn btn--block">Continue in Dashboard →</Link> : <Link to={`/checkout/${d.sku}?ref=${d.code}`} className="btn btn--block">Enroll Now →</Link>}
          {firstLesson && <Link to={itemLink(d.code, firstLesson)!} className="btn btn--outline btn--block">Preview First Lesson</Link>}
        </aside>
      </div></section>
    </>
  );
}

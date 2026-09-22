import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useToast } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { post } from '../lib/api';
import { BackBar, Loading, ErrorBox, Progress, Toast } from '../components/ui';
import Markdown from '../components/Markdown';

export default function Lesson() {
  const { lesson = '' } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const { toast, show } = useToast();
  const l = useApi<any>(`/catalog/lessons/${lesson}`, [user?.id]);
  const d = l.data;
  if (l.loading) return <Loading />;
  if (l.error || !d) return <div className="wrap section"><ErrorBox error={l.error} /></div>;
  const prog = d.program;
  const link = (it: any) => it.lesson_slug ? `/learn/${prog.code.toLowerCase()}/${it.lesson_slug}` : it.quiz_slug ? `/quiz/${it.quiz_slug}` : it.exercise_slug ? `/ide/${it.exercise_slug.split('-')[0]}/${it.exercise_slug}` : null;
  const complete = async () => { try { await post(`/me/items/${prog.itemId}/complete`); show(d.kind === 'law' ? `Marked complete — +${d.lawCredits || 4} Law Credits` : 'Marked complete'); l.reload(); } catch (e: any) { show(e.message, 'error'); } };
  return (
    <>
      <BackBar crumbs={prog ? [[prog.name, `/programs/${prog.code.toLowerCase()}`], [d.title]] : [[d.title]]} />
      <div className="wrap" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 40, paddingBlock: 32 }}>
        {prog && <aside>
          <strong>{prog.code}® — {prog.name.replace(/^Legal /, 'Legal ')}</strong>
          <div className="muted" style={{ fontSize: 13, margin: '6px 0 8px' }}>{Math.round((prog.done / prog.total) * 100)}% complete · {prog.done}/{prog.total} items</div>
          <Progress pct={(prog.done / prog.total) * 100} tone="red" />
          {(['A', 'B', 'C', 'CAP'] as const).map((tc) => { const items = prog.curriculum.filter((x: any) => x.track_code === tc); if (!items.length) return null; return <div key={tc} style={{ marginTop: 18 }}><div className="tag">{items[0].track_name}</div>{items.map((it: any) => { const to = link(it); const cls = `row ${it.lesson_slug === d.slug ? 'now' : it.status ?? ''}`; const inner = <><span className="kind" style={{ width: 'auto' }}>{it.status === 'done' ? '✓' : it.lesson_slug === d.slug ? '▶' : ''}</span><span style={{ fontSize: 13 }}>{it.title.replace(/^Module \d+: /, '')}</span><span className="dur">{it.minutes ? `${it.minutes}m` : it.meta ?? ''}</span><span /></>; return to ? <Link key={it.id} to={to} className={cls} style={{ gridTemplateColumns: '20px 1fr auto 0' }}>{inner}</Link> : <div key={it.id} className={cls} style={{ gridTemplateColumns: '20px 1fr auto 0' }}>{inner}</div>; })}</div>; })}
        </aside>}
        <article>
          {prog && <span className="eyebrow">{prog.trackName.split('—')[0]} · Module {prog.moduleIndex} of {prog.moduleCount}</span>}
          <h1 style={{ fontSize: 'clamp(28px,4vw,44px)' }}>{d.title}</h1>
          <div style={{ background: 'var(--ink)', color: '#fff', aspectRatio: '16/9', marginTop: 20, display: 'grid', placeItems: 'center', position: 'relative' }}>
            {d.videoUrl ? <video src={d.videoUrl} controls style={{ width: '100%', height: '100%' }} /> : <><span style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--red)', display: 'grid', placeItems: 'center', fontSize: 26 }}>▶</span><span className="muted" style={{ position: 'absolute', bottom: 12, insetInlineStart: 16, fontSize: 13 }}>{d.minutes ? `${d.minutes}:00` : ''} · instructor: {d.instructor}</span></>}
          </div>
          <h3 style={{ marginTop: 28 }}>Lesson Notes</h3>
          <Markdown md={d.notesMd} />
          {d.lensMd && <div className="callout" style={{ marginTop: 16 }}><strong>The Lawmads lens:</strong> {d.lensMd}</div>}
          {d.resources?.length > 0 && <><h3 style={{ marginTop: 24 }}>Resources</h3><p>{d.resources.map((r: any, i: number) => <span key={i}>→ {r.label}{i < d.resources.length - 1 ? ' · ' : ''}</span>)}</p></>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
            {d.prev && link(d.prev) ? <Link to={link(d.prev)!} className="btn btn--outline">← Previous: {d.prev.title.replace(/^Module \d+: /, '')}</Link> : <span />}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {user && prog && <button className="btn btn--outline" onClick={complete}>Mark complete ✓</button>}
              {d.next && link(d.next) ? <button className="btn" onClick={() => nav(link(d.next)!)}>Next: {d.next.title.replace(/^Module \d+: /, '')} →</button> : null}
            </div>
          </div>
        </article>
      </div>
      <Toast toast={toast} />
    </>
  );
}

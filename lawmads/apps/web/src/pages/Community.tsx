import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi, useToast } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { post } from '../lib/api';
import { PageHead, Section, Loading, Stat, Toast, Field } from '../components/ui';
import { dateTime } from '../lib/format';
export default function Community() {
  const { user } = useAuth(); const { toast, show } = useToast();
  const c = useApi<any>('/community', [user?.id]);
  const [open, setOpen] = useState<any>(null); const [comment, setComment] = useState(''); const [compose, setCompose] = useState(false); const [np, setNp] = useState({ chapter: 'lawyers-who-code', title: '', body: '' });
  const d = c.data;
  const need = () => { if (!user) { show('Sign in to take part', 'error'); return false; } return true; };
  const vote = async (id: string) => { if (!need()) return; await post(`/community/posts/${id}/vote`); c.reload(); };
  const join = async (slug: string) => { if (!need()) return; await post(`/community/chapters/${slug}/join`); show('Welcome to the chapter'); c.reload(); };
  const openPost = async (id: string) => { const { get } = await import('../lib/api'); setOpen(await get(`/community/posts/${id}`)); };
  const send = async () => { if (!need()) return; await post(`/community/posts/${open.id}/comments`, { body: comment }); setComment(''); openPost(open.id); c.reload(); };
  const createPost = async () => { if (!need()) return; try { await post('/community/posts', np); setCompose(false); setNp({ ...np, title: '', body: '' }); show('Posted'); c.reload(); } catch (e: any) { show(e.message, 'error'); } };
  const voteDesign = async (id: string) => { if (!need()) return; try { await post(`/community/designs/${id}/vote`); show('Vote counted'); c.reload(); } catch (e: any) { show(e.message, 'error'); } };
  if (!d) return <Loading />;
  return (
    <>
      <PageHead eyebrow="Lawmads Community" title="Lawyer Who®" sub="The professional network of lawyers who extended their practice into technology — code, design, data and markets. Showcase work. Verify credentials. Get hired."><div className="stats" style={{ marginTop: 24 }}><Stat value={d.stats.members.toLocaleString()} label="Active members" /><Stat value={d.stats.cityChapters} label="City chapters" /><Stat value={d.stats.eventsThisYear} label="Events this year" /><Stat value={`${d.stats.employmentRate}%`} label="Employment rate" /></div></PageHead>
      <Section><div className="cards cards--4">{d.chapters.map((ch: any, i: number) => <div key={ch.slug} className="card"><span className="tag">Chapter 0{i + 1}</span><span style={{ fontSize: 26 }}>{ch.icon}</span><h3>{ch.name}</h3><p className="muted" style={{ fontSize: 14 }}>{ch.blurb}</p><div className="meta"><span>{Number(ch.members).toLocaleString()} members</span><button className="btn btn--sm btn--outline" style={{ marginInlineStart: 'auto' }} onClick={() => join(ch.slug)} disabled={ch.joined}>{ch.joined ? 'Joined ✓' : 'Join'}</button></div></div>)}</div></Section>
      <Section tone="stone"><div className="split split--wide" style={{ alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h3>Community Feed</h3><button className="btn btn--sm" onClick={() => setCompose(!compose)}>+ New post</button></div>
          {compose && <div className="card card--flat" style={{ marginTop: 12 }}><Field label="Chapter"><select value={np.chapter} onChange={(e) => setNp({ ...np, chapter: e.target.value })}>{d.chapters.map((ch: any) => <option key={ch.slug} value={ch.slug}>{ch.name}</option>)}</select></Field><Field label="Title"><input value={np.title} onChange={(e) => setNp({ ...np, title: e.target.value })} /></Field><Field label="Body"><textarea rows={3} value={np.body} onChange={(e) => setNp({ ...np, body: e.target.value })} /></Field><button className="btn" onClick={createPost} disabled={np.title.length < 3}>Post</button></div>}
          <div className="feed" style={{ marginTop: 12 }}>{d.posts.map((p: any) => <div key={p.id} className="feed__item" style={{ gridTemplateColumns: '44px 1fr' }}><span className="avatar avatar--sm" style={{ background: 'var(--stone)', color: 'var(--ink)', border: '1px solid var(--line)' }}>{p.author_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2)}</span><div><strong>{p.title}</strong> <span className="muted">· {p.author_name} · {p.chapter_name}</span><p style={{ fontSize: 14, margin: '4px 0 8px' }}>{p.body}</p><div style={{ display: 'flex', gap: 14, fontSize: 13, alignItems: 'center', flexWrap: 'wrap' }}><button className={`chip${p.voted ? ' chip--red' : ''}`} onClick={() => vote(p.id)}>▲ {p.upvotes} upvotes</button><button className="chip" onClick={() => openPost(p.id)}>{p.comments} comments</button>{p.link_label && (p.link_kind === 'ide' ? <Link to={`/ide/${p.link_ref.split('-')[0]}/${p.link_ref}`} className="link">{p.link_label}</Link> : p.link_kind === 'vote' ? <a href="#tees" className="link">{p.link_label}</a> : p.link_ref?.startsWith('/') ? <Link to={p.link_ref} className="link">{p.link_label}</Link> : <a href={p.link_ref} className="link" target="_blank" rel="noopener">{p.link_label}</a>)}</div></div></div>)}</div>
        </div>
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="card card--flat" id="sessions"><h3>Upcoming Sessions</h3>{d.sessions.map((s: any) => <div key={s.id} style={{ padding: '10px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}><span className="chip chip--red" style={{ fontSize: 10 }}>{s.kind}</span> <strong>{s.title}</strong>{s.program_code ? ` — ${s.program_code} cohort` : ''}<div className="muted" style={{ fontSize: 13 }}>{dateTime(s.starts_at)} · {s.platform}</div></div>)}</div>
          <div className="card card--flat" id="tees"><h3>🏆 Tees Project — {d.contest.month}</h3><p className="muted" style={{ fontSize: 14 }}>{d.contest.submissions.length} designer submissions this month. The winner earns a royalty on every featured T-shirt sold.</p>{d.contest.submissions.map((s: any) => <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}><span><strong>{s.title}</strong> <span className="muted">· {s.designer}{s.winner ? ' · winner' : ''}</span></span><button className={`chip${s.voted ? ' chip--red' : ''}`} onClick={() => voteDesign(s.id)}>▲ {s.votes}</button></div>)}<Link to="/shop" className="link" style={{ fontSize: 14, marginTop: 8 }}>Visit the E-Shop →</Link></div>
        </div>
      </div></Section>
      {open && <div className="overlay" onClick={() => setOpen(null)}><div className="modal modal--wide" onClick={(e) => e.stopPropagation()}><h3>{open.title}</h3><p className="muted">{open.author_name} · {open.chapter_name}</p><p>{open.body}</p><div className="feed">{open.thread.map((t: any) => <div key={t.id} className="feed__item" style={{ gridTemplateColumns: '1fr' }}><div><strong style={{ fontSize: 13 }}>{t.author_name}</strong><p style={{ fontSize: 14, margin: '4px 0 0' }}>{t.body}</p></div></div>)}</div><div style={{ display: 'flex', gap: 8, marginTop: 12 }}><input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment" style={{ flex: 1, padding: 10, border: '1px solid var(--line2)' }} /><button className="btn" onClick={send} disabled={!comment.trim()}>Reply</button></div></div></div>}
      <Toast toast={toast} />
    </>
  );
}

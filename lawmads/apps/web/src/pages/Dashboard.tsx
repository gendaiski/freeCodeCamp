import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useToast } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { api, get, post } from '../lib/api';
import { dateShort, dateTime, usd } from '../lib/format';
import { Loading, Progress, Stat, Tabs, Toggle, Toast, Avatar, Field, Empty } from '../components/ui';
type Tab = 'overview' | 'programs' | 'transcript' | 'certificates' | 'settings';
export default function Dashboard() {
  const { tab = 'overview' } = useParams(); const nav = useNavigate(); const { user, refreshUser, logout } = useAuth(); const { toast, show } = useToast();
  const d = useApi<any>('/me/dashboard', [user?.id]);
  const x = d.data;
  if (d.loading || !x) return <Loading />;
  const initials = x.user.initials;
  return (
    <>
      <div className="dash-head"><div className="wrap id" style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <Avatar initials={initials} size="lg" />
        <div><h1 style={{ fontSize: 30 }}>{x.user.displayName}</h1><div className="muted">{x.activeProgram ? `${x.activeProgram.name} track (${x.activeProgram.code}®) · ${x.activeProgram.pct}% complete · ` : ''}joined {new Date(x.user.joinedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</div>
          <div className="pills" style={{ marginTop: 10 }}><span className="pill">{x.ladder.emoji} {x.ladder.label}</span>{x.badges.map((b: any) => <span key={b.jurisdiction} className="pill">{b.flag} {b.name} ✓</span>)}<span className="pill">🔥 {x.streak.days}-day streak</span></div></div>
        <div className="stats stats--3" style={{ marginInlineStart: 'auto' }}><Stat value={x.credits.tech} label="Tech Credits" /><Stat value={x.credits.law} label="Law Credits" /><Stat value={`#${x.cohortRank}`} label="Cohort Rank" /></div>
      </div></div>
      <div className="dash-tabs"><div className="wrap"><Tabs<Tab> tabs={[['overview', 'Overview'], ['programs', 'My Programs'], ['transcript', 'Transcript'], ['certificates', 'Certificates & Badges'], ['settings', 'Settings']]} active={tab as Tab} onChange={(t) => nav(`/dashboard/${t}`)} /></div></div>
      <div className="wrap" style={{ paddingBlock: 36 }}>
        {tab === 'overview' && <Overview x={x} />}
        {tab === 'programs' && <Programs x={x} />}
        {tab === 'transcript' && <Transcript />}
        {tab === 'certificates' && <Certificates x={x} />}
        {tab === 'settings' && <Settings x={x} show={show} refreshUser={refreshUser} logout={async () => { await logout(); nav('/'); }} reload={d.reload} />}
      </div>
      <Toast toast={toast} />
    </>
  );
}
function Overview({ x }: { x: any }) {
  const now = x.continueLearning.nowItem; const lab = x.continueLearning.lastLab;
  const nowLink = now ? (now.lesson_slug ? `/learn/${now.program_code.toLowerCase()}/${now.lesson_slug}` : now.quiz_slug ? `/quiz/${now.quiz_slug}` : now.exercise_slug ? `/ide/${now.exercise_slug.split('-')[0]}/${now.exercise_slug}` : '/programs') : '/programs';
  return (
    <>
      <h3>Jump back in</h3>
      <div className="quick" style={{ marginTop: 12 }}>
        <Link to={lab ? `/ide/${lab.language}/${lab.slug}` : '/ide'}><span className="ico">&lt;/&gt;</span><strong>Open the IDE</strong><span className="muted" style={{ fontSize: 13 }}>{lab ? `Resume: ${lab.title}` : 'Choose a language'}</span></Link>
        <Link to={nowLink}><span className="ico">▶</span><strong>Continue Lesson</strong><span className="muted" style={{ fontSize: 13 }}>{now ? `${now.title.replace(/^Module \d+: /, '')}${now.minutes ? ` · ${now.minutes} min` : ''}` : 'Enrol in a program'}</span></Link>
        <Link to="/builder"><span className="ico">✦</span><strong>AI Web Builder</strong><span className="muted" style={{ fontSize: 13 }}>Describe your practice</span></Link>
        <Link to={x.jurisdictions.next ? `/badges/${x.jurisdictions.next.code.toLowerCase()}` : '/badges'}><span className="ico">✓</span><strong>Book Badge Exam</strong><span className="muted" style={{ fontSize: 13 }}>{x.jurisdictions.next ? `Next: ${x.jurisdictions.next.name} · ${usd(7900)}` : 'All nine earned'}</span></Link>
      </div>
      <h3 style={{ marginTop: 36 }}>This semester</h3>
      <div className="stats stats--6" style={{ marginTop: 12 }}>
        <Stat value={<>⚡{x.credits.tech}</>} label="Tech Credits" sub={x.credits.weekTech ? `+${x.credits.weekTech} this week` : undefined} /><Stat value={<>⚖️{x.credits.law}</>} label="Law Credits" sub={x.credits.weekLaw ? `+${x.credits.weekLaw} this week` : undefined} /><Stat value={`${x.jurisdictions.earned} / ${x.jurisdictions.total}`} label="Jurisdictions" sub={x.jurisdictions.next ? `${x.jurisdictions.next.name} unlocks ${x.ladder.next?.label ?? ''}` : undefined} /><Stat value={x.exercises.solved} label="Exercises Solved" sub={x.exercises.week ? `+${x.exercises.week} this week` : undefined} /><Stat value={x.certificates.length} label="Certificates" sub={x.activeProgram ? `${x.activeProgram.code}® in progress` : undefined} /><div className="stat"><strong>🔥{x.streak.days}</strong><span>Day Streak</span><div className="streak">{x.streak.week.map((on: boolean, i: number) => <i key={i} className={on ? 'on' : ''} title={'MTWTFSS'[i]} />)}</div></div>
      </div>
      <div className="split split--wide" style={{ marginTop: 36, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><h3>Continue learning</h3><Link to="/programs" className="link" style={{ fontSize: 14 }}>All programs →</Link></div>
          <div className="feed">
            {lab && <div className="feed__item"><span className="ico">⚡</span><div><strong>{lab.title} — IDE Lab</strong><div className="muted" style={{ fontSize: 13 }}>{lab.language} · attempt in progress</div><p style={{ fontSize: 14, margin: '6px 0 0' }}>{lab.detail?.checks ? `Your last run passed ${lab.detail.checks.filter((c: any) => c.passed).length} of ${lab.detail.checks.length} checks. ${lab.detail.checks.filter((c: any) => !c.passed).map((c: any) => c.name).join('; ')}.` : `Best score ${lab.best_score}% after ${lab.attempts} attempt${lab.attempts === 1 ? '' : 's'}.`}</p></div><Link to={`/ide/${lab.language}/${lab.slug}`} className="btn btn--sm">Resume →</Link></div>}
            {now && <div className="feed__item"><span className="ico">{now.kind === 'law' ? '📖' : now.kind === 'quiz' ? '✏️' : '▶'}</span><div><strong>{now.title}</strong><div className="muted" style={{ fontSize: 13 }}>{now.program_code}® · Track {now.track_code}{now.minutes ? ` · ${now.minutes} min` : ''}</div>{now.kind === 'law' && <p style={{ fontSize: 14, margin: '6px 0 0' }}>This is the law half of your credential — it does not issue without it.</p>}{now.kind === 'quiz' && <p style={{ fontSize: 14, margin: '6px 0 0' }}>Score 80% or above to bank +2 Tech Credits.</p>}</div><Link to={nowLink} className="btn btn--sm btn--outline">{now.kind === 'quiz' ? 'Start quiz' : 'Continue'}</Link></div>}
            {!lab && !now && <Empty>Nothing in progress. <Link to="/programs" className="link">Enrol in a program</Link> or <Link to="/ide" className="link">open the IDE</Link>.</Empty>}
          </div>
          {x.recommended && <div className="card card--stone card--flat" style={{ marginTop: 24 }}><span className="tag">Recommended next</span><h3>{x.recommended.code}® — {x.recommended.name}</h3><p className="muted">{x.recommended.tagline}</p><Link to={`/programs/${x.recommended.code.toLowerCase()}`} className="link">View Program →</Link></div>}
        </div>
        <div style={{ display: 'grid', gap: 20 }}>
          <div className="card card--flat"><h3>The Verified Lawmad Ladder</h3>{[['🥉', 'Regional Lawmad', '2 jurisdictions', 'regional'], ['🥈', 'Global Lawmad', '3 jurisdictions', 'global'], ['🥇', 'Master Lawmad', '4 jurisdictions + capstone', 'master']].map(([e, l, s, k]) => { const order = ['none', 'local', 'regional', 'international', 'global', 'master']; const mine = order.indexOf(x.ladder.tier), me = order.indexOf(k as string); const state = mine >= me || (k === 'regional' && x.ladder.tier === 'international') ? 'Earned' : x.ladder.next?.tier === k ? 'Next' : 'Locked'; return <div key={l} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid var(--line)' }}><span style={{ fontSize: 22 }}>{e}</span><div style={{ flex: 1 }}><strong>{l}</strong><div className="muted" style={{ fontSize: 12 }}>{s}{state === 'Next' && x.jurisdictions.next ? ` · next: ${x.jurisdictions.next.name}` : ''}</div></div><span className={`chip${state === 'Earned' ? ' chip--green' : ''}`}>{state}</span></div>; })}{x.jurisdictions.next && <Link to={`/badges/${x.jurisdictions.next.code.toLowerCase()}`} className="btn btn--block btn--sm" style={{ marginTop: 10 }}>Book the {x.jurisdictions.next.name} badge exam — {usd(7900)}</Link>}</div>
          {x.credential && <div className="card card--flat"><h3>Credential progress</h3><p className="muted" style={{ fontSize: 13 }}>You need both halves. {x.activeProgram.code}® issues at {x.credential.tech.required} Tech and {x.credential.law.required} Law credits on this track.</p><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Tech</span><span>{x.credential.tech.earned}/{x.credential.tech.required}</span></div><Progress pct={x.credential.tech.pct} /><div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginTop: 8 }}><span>Law</span><span>{x.credential.law.earned}/{x.credential.law.required}</span></div><Progress pct={x.credential.law.pct} tone="red" />{!x.credential.complete && <p className="muted" style={{ fontSize: 13, marginTop: 8 }}>{x.credential.missing.law ? `${x.credential.missing.law} Law Credits from your certificate.` : `${x.credential.missing.tech} Tech Credits from your certificate.`}</p>}<Link to="/track-designer" className="link" style={{ fontSize: 13 }}>◈ Design your next track</Link></div>}
          <div className="card card--flat"><h3>Upcoming</h3>{[...x.bookings.map((b: any) => ({ at: b.starts_at, label: `${b.name} badge exam sitting` })), ...x.upcoming.map((u: any) => ({ at: u.starts_at, label: u.title }))].sort((a, b) => +new Date(a.at) - +new Date(b.at)).slice(0, 4).map((u, i) => <div key={i} style={{ display: 'flex', gap: 12, padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}><span className="mono red" style={{ minWidth: 60 }}>{u.at ? dateShort(u.at).toUpperCase() : 'TBD'}</span><span>{u.label}</span></div>)}</div>
        </div>
      </div>
    </>
  );
}
function Programs({ x }: { x: any }) {
  const w = useApi<any>('/me/week');
  return (
    <>
      <h3>Enrolled</h3>
      <div className="cards" style={{ marginTop: 12 }}>
        {x.enrollments.map((e: any) => <div key={e.program_code} className="card"><span className="tag">{e.status === 'completed' ? 'Completed · 100%' : `In Progress · ${e.total_items ? Math.round((e.done_items / e.total_items) * 100) : 0}%`}</span><h3>{e.program_code}® — {e.name}</h3>{e.status === 'completed' ? <p className="muted">Certificate earned{x.certificates.find((c: any) => c.program_code === e.program_code)?.capstone_score ? ` · capstone ${x.certificates.find((c: any) => c.program_code === e.program_code).capstone_score}%` : ''}</p> : <Progress pct={e.total_items ? (e.done_items / e.total_items) * 100 : 0} tone="red" />}<Link to={e.status === 'completed' ? '/dashboard/certificates' : `/programs/${e.program_code.toLowerCase()}`} className="link" style={{ marginTop: 'auto' }}>{e.status === 'completed' ? 'View Certificate →' : 'Continue →'}</Link></div>)}
        {x.recommended && <div className="card card--stone card--flat"><span className="tag">Recommended Next</span><h3>{x.recommended.code}® — {x.recommended.name}</h3><p className="muted">{x.recommended.tagline}</p><Link to={`/programs/${x.recommended.code.toLowerCase()}`} className="link">View Program →</Link></div>}
      </div>
      <h3 style={{ marginTop: 36 }}>This Week</h3>
      <div className="table-wrap"><table className="table" style={{ marginTop: 12 }}><thead><tr><th>Day</th><th>Item</th><th>Program</th><th>Type</th></tr></thead><tbody>{(w.data?.plan ?? []).map((p: any, i: number) => <tr key={i}><td className="mono">{p.day}</td><td>{p.item}</td><td>{p.program}{/^[A-Z]/.test(p.program) && p.program !== 'Community' ? '®' : ''}</td><td className="muted">{p.type}</td></tr>)}</tbody></table></div>
    </>
  );
}
function Transcript() {
  const t = useApi<any>('/me/transcript');
  if (!t.data) return <Loading />;
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}><h3>Official Transcript</h3><span className="chip chip--green">✓ Digitally signed · {t.data.totals.tech} Tech · {t.data.totals.law} Law</span></div>
      <div className="table-wrap"><table className="table" style={{ marginTop: 12 }}><thead><tr><th>Date</th><th>Item</th><th>Program</th><th>Type</th><th>Score</th><th>Credits</th></tr></thead><tbody>{t.data.entries.map((e: any) => <tr key={e.id}><td className="mono">{dateShort(e.date)}</td><td>{e.item}</td><td>{e.program}{e.program ? '®' : ''}</td><td className="muted">{e.type}</td><td style={{ color: 'var(--green)', fontWeight: 700 }}>{e.score}</td><td className="mono">{e.tech ? `+${e.tech} Tech` : ''}{e.tech && e.law ? ' / ' : ''}{e.law ? `+${e.law} Law` : ''}</td></tr>)}</tbody></table></div>
      <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>{t.data.note}</p>
    </>
  );
}
function Certificates({ x }: { x: any }) {
  const [cert, setCert] = useState<any>(null);
  const open = async (id: string) => setCert(await get(`/certificates/${id}/download`));
  const all = ['EG', 'GB', 'AE', 'SA', 'QA', 'OM', 'BH', 'NL', 'DE'];
  return (
    <>
      <h3>Earned Certificates</h3>
      {x.certificates.length === 0 ? <Empty>No certificate yet — complete both credit halves and the capstone of a program.</Empty> : <div className="cards cards--2" style={{ marginTop: 12 }}>{x.certificates.map((c: any) => <div key={c.id} className="cert"><span className="tag">Professional Certification · Digitally Signed{c.revoked ? ' · REVOKED' : ''}</span><h3 style={{ marginTop: 6 }}>{c.program_code}® — {c.program_name}</h3><p className="muted" style={{ fontSize: 13 }}>Issued {new Date(c.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} · Verification ID {c.verification_id} · QR-verifiable</p><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button className="btn btn--sm" onClick={() => open(c.id)}>Download PDF</button><Link to={`/verify/${c.verification_id}`} className="btn btn--sm btn--outline">Share ↗</Link></div></div>)}</div>}
      <h3 style={{ marginTop: 36 }}>Jurisdiction Badges</h3>
      <div className="cards cards--4" style={{ marginTop: 12 }}>
        {x.badges.map((b: any) => <Link key={b.jurisdiction} to={`/verify/${b.verification_id}`} className="card"><span className="tag">Earned {new Date(b.earned_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span><h3>{b.flag} {b.name}</h3><p className="muted" style={{ fontSize: 13 }}>{b.name} Legal System — badge exam passed · {b.score_pct}%</p></Link>)}
        {x.jurisdictions.next && <Link to={`/badges/${x.jurisdictions.next.code.toLowerCase()}`} className="card card--ink"><span className="tag">Next</span><h3>{x.jurisdictions.next.flag} {x.jurisdictions.next.name}</h3><p className="muted" style={{ fontSize: 13 }}>Book the badge exam to reach {x.ladder.next?.label ?? 'the next rung'}.</p></Link>}
        <Link to="/badges" className="card card--flat"><span className="tag">Available</span><h3>{all.filter((c) => !x.badges.some((b: any) => b.jurisdiction === c) && c !== x.jurisdictions.next?.code).length} more</h3><p className="muted" style={{ fontSize: 13 }}>Unlock any order.</p></Link>
      </div>
      {cert && <div className="overlay" onClick={() => setCert(null)}><div className="modal modal--wide" onClick={(e) => e.stopPropagation()}><div className="cert" style={{ textAlign: 'center' }}><span className="eyebrow">The Legal Technology Academy</span><h2>{cert.display_name}</h2><p className="lead" style={{ margin: '8px auto' }}>has completed {cert.program_code}® — {cert.program_name}</p><p className="muted">capstone {cert.capstone_score}% · issued {new Date(cert.issued_at).toLocaleDateString('en-GB')} · {cert.verification_id}</p><img className="qr" src={cert.qr} alt="QR" style={{ margin: '12px auto' }} /><p className="muted" style={{ fontSize: 12 }}>Use your browser's Print → Save as PDF. Signature: {cert.signature.slice(0, 16)}…</p></div><div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}><button className="btn" onClick={() => window.print()}>Print / Save PDF</button><button className="btn btn--outline" onClick={() => setCert(null)}>Close</button></div></div></div>}
    </>
  );
}
function Settings({ x, show, refreshUser, logout, reload }: { x: any; show(m: string, k?: 'ok' | 'error'): void; refreshUser(): Promise<void>; logout(): Promise<void>; reload(): void }) {
  const [prefs, setPrefs] = useState<any>(x.user.preferences);
  const [pw, setPw] = useState({ current: '', next: '' }); const [totp, setTotp] = useState<any>(null); const [code, setCode] = useState('');
  const [academic, setAcademic] = useState(x.user.academicEmail ?? '');
  const orders = useApi<any>('/commerce/orders');
  useEffect(() => { setPrefs(x.user.preferences); }, [x.user.preferences]);
  const savePref = async (k: string, v: boolean) => { const n = { ...prefs, [k]: v }; setPrefs(n); await api('/auth/me', { method: 'PATCH', body: { preferences: n } }); show('Preference saved'); };
  const saveAcademic = async () => { try { await api('/auth/me', { method: 'PATCH', body: { academicEmail: academic || null } }); await refreshUser(); reload(); show('Academic email saved'); } catch (e: any) { show(e.message, 'error'); } };
  const changePw = async (e: React.FormEvent) => { e.preventDefault(); try { await post('/auth/password', pw); setPw({ current: '', next: '' }); show('Password changed'); } catch (x: any) { show(x.message, 'error'); } };
  return (
    <div className="split split--even" style={{ alignItems: 'start' }}>
      <div>
        <h3>Account</h3>
        <dl className="kv" style={{ marginTop: 12 }}><dt>Name</dt><dd>{x.user.displayName}</dd><dt>Email</dt><dd>{x.user.email}</dd><dt>Academic Email</dt><dd><div style={{ display: 'flex', gap: 8 }}><input value={academic} onChange={(e) => setAcademic(e.target.value)} placeholder="you@university.edu" style={{ flex: 1, padding: 8, border: '1px solid var(--line2)' }} /><button className="btn btn--sm btn--outline" onClick={saveAcademic}>Save</button></div>{x.user.academicEmail && <span className="chip chip--green" style={{ marginTop: 6 }}>✓ Student rate active</span>}</dd><dt>Plan</dt><dd>{x.subscriptions.map((s: any) => s.sku.replace(/_/g, ' ')).join(' + ') || 'Lawmad Free'} · <Link to="/pricing" className="link">Manage</Link></dd><dt>Language</dt><dd>English · العربية · Français</dd></dl>
        <h3 style={{ marginTop: 32 }}>Preferences</h3>
        <Toggle label="Dark IDE theme" sub="Editor always opens in dark mode" on={Boolean(prefs.darkIde)} onChange={(v) => savePref('darkIde', v)} />
        <Toggle label="AI Tutor hints" sub="Allow AI hints in practice labs (off in exams)" on={Boolean(prefs.aiHints)} onChange={(v) => savePref('aiHints', v)} />
        <Toggle label="Public Lawmad profile" sub="Show badges & certificates in the community" on={Boolean(prefs.publicProfile)} onChange={(v) => savePref('publicProfile', v)} />
        <Toggle label="Deadline reminders" sub="Messaging + academic email alerts" on={Boolean(prefs.reminders)} onChange={(v) => savePref('reminders', v)} />
        <h3 style={{ marginTop: 32 }}>Orders</h3>
        {(orders.data?.orders ?? []).map((o: any) => <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderTop: '1px solid var(--line)', fontSize: 14 }}><span>{o.items.map((i: any) => i.label).join(', ')}</span><span className="mono">{usd(o.total_cents)} · {o.status}</span></div>)}
        {orders.data && orders.data.orders.length === 0 && <p className="muted" style={{ fontSize: 14 }}>No orders yet.</p>}
      </div>
      <div>
        <h3>Security</h3>
        <form className="form" onSubmit={changePw} style={{ marginTop: 12 }}><Field label="Current password"><input type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field><Field label="New password"><input type="password" minLength={8} value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></Field><button className="btn btn--outline">Change password</button></form>
        <h4 style={{ marginTop: 24 }}>Two-factor authentication {x.user.twoFactorEnabled && <span className="chip chip--green">on</span>}</h4>
        {!x.user.twoFactorEnabled && !totp && <button className="btn btn--sm" onClick={async () => setTotp(await post('/auth/2fa/setup'))}>Set up 2FA</button>}
        {totp && <div className="notice" style={{ marginTop: 8 }}>Add this secret to your authenticator: <code className="mono">{totp.secret}</code><div style={{ display: 'flex', gap: 8, marginTop: 8 }}><input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" style={{ padding: 8 }} /><button className="btn btn--sm" onClick={async () => { try { await post('/auth/2fa/enable', { code }); setTotp(null); await refreshUser(); reload(); show('2FA enabled'); } catch (e: any) { show(e.message, 'error'); } }}>Enable</button></div></div>}
        {x.user.twoFactorEnabled && <button className="btn btn--sm btn--outline" onClick={async () => { await post('/auth/2fa/disable'); await refreshUser(); reload(); show('2FA disabled'); }}>Disable 2FA</button>}
        <h4 style={{ marginTop: 24 }}>Session</h4>
        <button className="btn btn--outline btn--sm" onClick={logout}>Sign out</button>
        <p className="muted" style={{ fontSize: 13, marginTop: 12 }}>Time-limited access tokens; refresh tokens rotate on every use.</p>
        <p style={{ marginTop: 12 }}><span className="mono" style={{ fontSize: 12 }}>{dateTime(new Date())}</span></p>
      </div>
    </div>
  );
}

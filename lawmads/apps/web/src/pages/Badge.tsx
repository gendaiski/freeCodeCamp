import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useToast } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { get, post } from '../lib/api';
import { usd, dateTime } from '../lib/format';
import { BackBar, Loading, ErrorBox, Toast } from '../components/ui';
export default function Badge() {
  const { code = '' } = useParams(); const { user } = useAuth(); const nav = useNavigate(); const { toast, show } = useToast();
  const j = useApi<any>(`/badges/${code}`, [user?.id]);
  const [paper, setPaper] = useState<any>(null); const [answers, setAnswers] = useState<Record<string, string>>({}); const [result, setResult] = useState<any>(null); const [busy, setBusy] = useState(false);
  const d = j.data;
  if (j.loading) return <Loading />;
  if (j.error || !d) return <div className="wrap section"><ErrorBox error={j.error} /></div>;
  const s = d.syllabus;
  const book = async (sittingId: string | null) => { if (!user) { nav(`/signin?next=/badges/${code}`); return; } try { await post(`/badges/${d.code}/book`, { sittingId }); show('Booked — sit the paper whenever you are ready'); j.reload(); } catch (e: any) { if (e.status === 403) nav(`/checkout/badge_exam?ref=${d.code}`); else show(e.message, 'error'); } };
  const start = async () => { try { setPaper(await get(`/badges/${d.code}/paper`)); setAnswers({}); } catch (e: any) { show(e.message, 'error'); } };
  const sit = async () => { setBusy(true); try { setResult(await post(`/badges/${d.code}/sit`, { answers })); setPaper(null); j.reload(); } catch (e: any) { show(e.message, 'error'); } setBusy(false); };
  return (
    <>
      <BackBar crumbs={[['All badge exams', '/badges'], [d.name]]} />
      <div className="pagehead"><div className="wrap split split--wide">
        <div><span className="eyebrow">{d.badgeCode} · {d.familyLabel}</span><h1 style={{ fontSize: 'clamp(36px,5vw,64px)' }}>{d.flag} {d.name}</h1><div className="pills"><span className="pill">Examined</span><span className="pill">{d.code}</span><span className="pill">Lawmads</span><span className="pill">signed · QR-verifiable</span></div><p className="lead" style={{ marginTop: 16 }}>{s.why}</p></div>
        <aside className="card" style={{ color: 'var(--ink)' }}><div style={{ fontSize: 36, fontWeight: 900 }}>{usd(7900)}</div><span className="muted" style={{ fontSize: 13 }}>one sitting · one free resit</span><ul className="list check" style={{ fontSize: 14 }}><li>Proctored online</li><li>Result within 48 hours</li><li>Digitally signed & QR-verifiable</li><li>Valid forever — no renewal</li><li>Counts toward the ladder</li></ul>
          {d.mine ? <div className="chip chip--green">✓ Earned {d.mine.score_pct}% · {d.mine.verification_id}</div> : d.booking ? <><button className="btn btn--block btn--red" onClick={start}>Sit the paper now →</button><span className="muted" style={{ fontSize: 12 }}>{d.booking.starts_at ? `Sitting ${dateTime(d.booking.starts_at)}` : 'Booked — any time'}{d.booking.resit_available ? ' · free resit available' : ' · resit used'}</span></> : <><button className="btn btn--block" onClick={() => book(null)}>Book this exam →</button><Link to="/checkout/badge_bundle" className="link" style={{ fontSize: 13 }}>All nine for {usd(29900)}</Link></>}
          <div className="notice" style={{ fontSize: 12 }}><strong>Not a practising certificate.</strong> This badge certifies competence in the legal system named. It does not entitle you to practise, appear, or hold out as admitted anywhere. We print that on the certificate itself.</div>
        </aside>
      </div></div>
      {paper && <div className="overlay"><div className="modal modal--wide" style={{ maxHeight: '90vh', overflow: 'auto' }}><span className="tag">{paper.name} · {paper.minutes} min · pass {paper.passMark}%</span><h3>Badge paper — {paper.questions.length} questions</h3>{paper.questions.map((q: any, i: number) => <div key={q.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}><strong>{i + 1}. {q.prompt}</strong><div style={{ display: 'grid', gap: 4, marginTop: 6 }}>{q.options.map((o: any) => <label key={o.key} style={{ fontSize: 14, display: 'flex', gap: 8 }}><input type="radio" name={q.id} checked={answers[q.id] === o.key} onChange={() => setAnswers({ ...answers, [q.id]: o.key })} />{o.key}. {o.text}</label>)}</div></div>)}<div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn btn--outline" onClick={() => setPaper(null)}>Cancel</button><button className="btn btn--red" disabled={busy || Object.keys(answers).length < paper.questions.length} onClick={sit}>{busy ? 'Marking…' : 'Submit paper →'}</button></div></div></div>}
      {result && <div className="overlay" onClick={() => setResult(null)}><div className="modal" onClick={(e) => e.stopPropagation()}><span className="trophy">{result.passed ? '🏆' : '📚'}</span><h2>{result.passed ? 'Badge earned' : 'Not this time'} — {Math.round(result.scorePct)}%</h2><p className="muted">{result.passed ? `${result.verificationId} · you are now a ${result.ladder.label}` : result.resitAvailable ? 'Your free resit is available — book any sitting.' : 'Book a new sitting to try again.'}</p>{result.passed && <Link to={`/verify/${result.verificationId}`} className="btn">See the verification page →</Link>}<button className="btn btn--outline" onClick={() => setResult(null)}>Close</button></div></div>}
      <section className="section"><div className="wrap split split--wide" style={{ alignItems: 'start' }}>
        <div>
          <h3>The legal system, in three minutes</h3>
          <h4 style={{ marginTop: 16 }}>Sources of law, in order of authority</h4><p className="muted" style={{ fontSize: 14 }}>Where the law actually comes from here — and what a court will reach for first.</p><ol style={{ paddingInlineStart: 18 }}>{s.sources.map((x: string) => <li key={x}>{x}</li>)}</ol>
          <h4 style={{ marginTop: 16 }}>The court structure</h4><p className="muted" style={{ fontSize: 14 }}>Who decides what, and which decisions bind whom.</p><div className="pills">{s.courts.map((x: string) => <span key={x} className="chip">{x}</span>)}</div>
          <h4 style={{ marginTop: 16 }}>What the market actually requires</h4><p className="muted" style={{ fontSize: 14 }}>The subjects employers in this jurisdiction are hiring for. The exam is weighted toward these deliberately — a credential that ignores the market is a certificate, not a qualification.</p><ol style={{ paddingInlineStart: 18 }}>{s.market.map((x: string) => <li key={x}>{x}</li>)}</ol>
          <h4 style={{ marginTop: 16 }}>Regulators and authorities</h4><div className="pills">{s.regulators.map((x: string) => <span key={x} className="chip">{x}</span>)}</div>
          <h3 style={{ marginTop: 32 }}>Syllabus & weighting</h3><p className="muted" style={{ fontSize: 14 }}>The weighting is the real one — it is what the paper is built from, so revise in proportion.</p><div className="rows">{s.weighting.map((w: any) => <div key={w.subject} className="row" style={{ gridTemplateColumns: '1fr 3fr 50px' }}><span>{w.subject}</span><div className="progress"><i style={{ width: `${w.pct}%` }} /></div><span className="mono">{w.pct}%</span></div>)}</div>
          <h3 style={{ marginTop: 32 }}>Sample questions</h3><p className="muted" style={{ fontSize: 14 }}>Real questions retired from previous sittings. Click to reveal the answer and the explanation.</p><div className="accordion">{s.sample.map((q: any, i: number) => <details key={i}><summary style={{ fontSize: 15 }}>{q.q}</summary><p className="muted" style={{ fontSize: 14 }}><strong>Answer:</strong> {q.answer}<br />{q.a}</p></details>)}</div>
          <h3 style={{ marginTop: 32 }}>Primary sources examined</h3><ul className="list">{s.primarySources.map((x: string) => <li key={x}>{x}</li>)}</ul>
          <h3 style={{ marginTop: 32 }}>How to prepare</h3><ul className="list check">{s.prepare.map((x: string) => <li key={x}>{x}</li>)}</ul>
          <h3 style={{ marginTop: 32 }}>Sittings</h3><div className="rows">{d.sittings.map((st: any) => <div key={st.id} className="row" style={{ gridTemplateColumns: '1fr auto auto' }}><span>{dateTime(st.starts_at)}</span><span className="muted">{st.capacity - st.booked} seats</span>{!d.mine && !d.booking && <button className="btn btn--sm btn--outline" onClick={() => book(st.id)}>Book this sitting</button>}</div>)}</div>
          <h3 style={{ marginTop: 32 }}>What this jurisdiction means for a technologist</h3><p className="muted">{s.technologist}</p>
          <h3 style={{ marginTop: 32 }}>Why people fail this paper</h3><p className="muted">{s.whyFail}</p>
          <h3 style={{ marginTop: 32 }}>Your examiner</h3><p className="muted">{s.examiner} — thirty minutes with the person who wrote the paper is free. <Link to="/schedule" className="link">Talk to the examiner</Link></p>
          <h3 style={{ marginTop: 32 }}>Who holds this badge</h3><p className="muted">{d.holders} holders. {s.holders}</p>
        </div>
        <aside style={{ position: 'sticky', top: 90, display: 'grid', gap: 16 }}>
          <div className="card card--flat"><span className="tag">Pair it with</span><p className="muted" style={{ fontSize: 14 }}>Badges are worth more in pairs. These are the combinations that actually get people hired.</p>{d.pairWith.map((p: any) => <Link key={p.code} to={`/badges/${p.slug}`} className="link" style={{ display: 'block', fontSize: 14, marginTop: 6 }}>{p.flag} {p.name} + {d.name} →</Link>)}<Link to="/track-designer" className="btn btn--sm" style={{ marginTop: 12 }}>Build a path with this jurisdiction →</Link></div>
          <div className="card card--flat"><span className="tag">Pass rate</span><div style={{ fontSize: 36, fontWeight: 900 }}>{d.passRatePct}%</div><span className="muted" style={{ fontSize: 13 }}>first sitting, 2025–26 · {d.hardness === 'hard' ? 'one of the two hardest papers' : 'standard difficulty'}</span></div>
        </aside>
      </div></section>
      <Toast toast={toast} />
    </>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { get, post } from '../lib/api';
import { Loading, ErrorBox } from '../components/ui';
import Markdown from '../components/Markdown';
import CodeEditor from '../components/CodeEditor';
import N8nCanvas from './N8nCanvas';

export default function Ide() {
  const { language = 'javascript', slug } = useParams(); const nav = useNavigate(); const { user } = useAuth();
  const exSlug = slug ?? `${language}-1`;
  const ex = useApi<any>(`/ide/exercises/${exSlug}`, [user?.id]);
  const [code, setCode] = useState(''); const [stdin, setStdin] = useState(''); const [out, setOut] = useState<any>(null); const [sub, setSub] = useState<any>(null); const [busy, setBusy] = useState<'run' | 'submit' | null>(null);
  const [tab, setTab] = useState<'preview' | 'console'>('console'); const [hint, setHint] = useState<any>(null); const [solution, setSolution] = useState<string | null>(null); const [err, setErr] = useState(''); const [celebrate, setCelebrate] = useState(false);
  const [canvasMode, setCanvasMode] = useState(true);
  const poll = useRef<number | null>(null);
  const d = ex.data;
  useEffect(() => { if (d) { setCode(d.starter_code); setOut(null); setSub(null); setHint(null); setSolution(null); setErr(''); setTab(d.grading === 'browser' ? 'preview' : 'console'); } }, [d?.id]);
  useEffect(() => () => { if (poll.current) window.clearTimeout(poll.current); }, []);
  const preview = useMemo(() => (d?.grading === 'browser' ? code : ''), [code, d?.grading]);
  if (ex.loading) return <div className="ide"><Loading /></div>;
  if (ex.error || !d) return <div className="ide"><div className="wrap section"><ErrorBox error={ex.error} />{ex.error?.status === 401 && <Link to={`/signin?next=/ide/${language}/${exSlug}`} className="btn">Sign in to open the IDE</Link>}</div></div>;
  const lang = d.language;
  const requireAuth = () => { if (!user) { nav(`/signin?next=/ide/${language}/${exSlug}`); return false; } return true; };
  const run = async () => { if (!requireAuth()) return; setBusy('run'); setErr(''); try { setOut(await post('/ide/run', { exerciseId: d.id, code, stdin })); setTab(d.grading === 'browser' ? 'preview' : 'console'); } catch (e: any) { setErr(e.message); } setBusy(null); };
  const submit = async () => { if (!requireAuth()) return; setBusy('submit'); setErr(''); setSub(null); try { const r = await post('/ide/submissions', { exerciseId: d.id, code }); const tick = async () => { const s = await get(`/ide/submissions/${r.submissionId}`); setSub(s); if (['queued', 'processing'].includes(s.status)) poll.current = window.setTimeout(tick, 600); else { setBusy(null); if (s.passed) { setCelebrate(true); ex.reload(); } } }; tick(); } catch (e: any) { setErr(e.message); setBusy(null); } };
  const getHint = async () => { if (!requireAuth()) return; setHint(await get(`/ide/exercises/${d.id}/hint?level=${(hint?.level ?? -1) + 1}`)); };
  const showSolution = async () => { try { setSolution((await get(`/ide/exercises/${d.id}/solution`)).solution_code); } catch (e: any) { setErr(e.message); } };
  const next = d.siblings.find((s: any) => s.ordinal === d.ordinal + 1);
  const failed = sub && sub.status !== 'queued' && sub.status !== 'processing' && !sub.passed;
  return (
    <div className="ide">
      <div className="ide__bar"><Link to="/ide">⊞ Languages</Link><strong>{lang.name}</strong><span className="ide__tabs" style={{ background: 'none', border: 0 }}>{d.siblings.map((s: any) => <Link key={s.slug} to={`/ide/${language}/${s.slug}`} className={`ide__tab${s.slug === d.slug ? ' ide__tab--active' : ''}`}>Ex {s.ordinal} {s.completed && <span className="ok">✓</span>}</Link>)}</span><span className="spacer" />{lang.agentic && lang.slug === 'n8n' && <button className="btn btn--run btn--sm" onClick={() => setCanvasMode(!canvasMode)}>{canvasMode ? '{ } JSON view' : '⊞ Canvas view'}</button>}<button className="btn btn--run" onClick={run} disabled={busy !== null}>{busy === 'run' ? <span className="spinner" /> : '▶'} Run</button><button className="btn btn--red" onClick={submit} disabled={busy !== null}>{busy === 'submit' ? <span className="spinner" /> : '✓'} Submit</button></div>
      <div className="ide__grid">
        <aside className="ide__left">
          <span className="chip chip--red" style={{ marginBottom: 10 }}>{d.difficulty} · +{d.tech_credits} Tech Credits</span>
          <Markdown md={d.instructions_md} />
          <h5 style={{ margin: '18px 0 8px', fontSize: 11, letterSpacing: '.12em', color: '#97A2B0' }}>CHECKS</h5>
          {d.checks.map((c: string) => <div key={c} className="check">{c}</div>)}
          {d.sample_tests.length > 0 && <><h5 style={{ margin: '18px 0 8px', fontSize: 11, letterSpacing: '.12em', color: '#97A2B0' }}>SAMPLE TESTS ({d.hidden_tests} hidden)</h5>{d.sample_tests.map((t: any) => <div key={t.name} className="check"><div style={{ color: '#97A2B0' }}>{t.name} · input</div><pre style={{ margin: 0 }}>{t.input || '(none)'}</pre><div style={{ color: '#97A2B0', marginTop: 4 }}>expected</div><pre style={{ margin: 0 }}>{t.expected_output}</pre></div>)}</>}
          <div style={{ display: 'grid', gap: 8, marginTop: 18 }}>
            <button className="btn btn--run btn--sm" onClick={getHint}>💡 Get a hint {hint ? `(${hint.level + 1}/${hint.total})` : `(${d.hint_count})`}</button>
            {hint && <div className="check" style={{ borderColor: 'var(--red)' }}>{hint.hint}</div>}
            {(failed || d.progress.solutionUnlocked) && <button className="btn btn--red btn--sm" onClick={showSolution} disabled={!d.progress.solutionUnlocked && d.progress.failedAttempts + 1 < d.reveal_solution_after}>🔓 Show Correct Answer{!d.progress.solutionUnlocked ? ` (after ${d.reveal_solution_after} failed)` : ''}</button>}
            {solution && <div className="check"><pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{solution}</pre><button className="btn btn--run btn--sm" style={{ marginTop: 8 }} onClick={() => setCode(solution)}>⤵ Insert into editor</button></div>}
          </div>
          {!user && <div className="check" style={{ marginTop: 14 }}>Sign in to run and submit. <Link to="/signin" className="link">Sign in →</Link></div>}
        </aside>
        <div className="ide__right">
          <div className="ide__tabs"><span className="ide__tab ide__tab--active">{lang.fileName}</span><span className="ide__tab">{d.grading === 'stdio' ? 'stdin' : d.grading}</span></div>
          <div className="ide__editor">{lang.slug === 'n8n' && canvasMode ? <N8nCanvas value={code} onChange={setCode} /> : <CodeEditor value={code} onChange={setCode} language={lang.monaco} />}</div>
          <div className="ide__bottom">
            <div className="ide__pane">
              <div style={{ display: 'flex', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>{d.grading === 'browser' && <button className={`ide__tab${tab === 'preview' ? ' ide__tab--active' : ''}`} onClick={() => setTab('preview')}>Live Preview</button>}<button className={`ide__tab${tab === 'console' ? ' ide__tab--active' : ''}`} onClick={() => setTab('console')}>{d.grading === 'stdio' ? 'Console' : 'Checks'}</button></div>
              {tab === 'preview' ? <iframe className="ide__preview" title="Live preview" sandbox="allow-same-origin" srcDoc={preview} /> : <>
                {d.grading === 'stdio' && <label style={{ display: 'block', color: '#97A2B0', marginBottom: 6 }}>stdin for Run<textarea value={stdin} onChange={(e) => setStdin(e.target.value)} rows={2} style={{ width: '100%', background: '#0c0f16', color: '#fff', border: '1px solid var(--ide-line)', fontFamily: 'var(--mono)', direction: 'ltr' }} /></label>}
                {err && <pre className="fail">{err}</pre>}
                {out && (out.checks ? out.checks.map((c: any) => <div key={c.name} className={c.passed ? 'pass' : 'fail'}>{c.passed ? '✓' : '✗'} {c.name} <span style={{ color: '#97A2B0' }}>— {c.detail}</span></div>) : <><pre>{out.stdout || (out.message ? `[${out.status}] ${out.message}` : '(no output)')}</pre>{out.stderr && <pre className="fail">{out.stderr}</pre>}{out.compile_output && <pre className="fail">{out.compile_output}</pre>}<div style={{ color: '#97A2B0', marginTop: 6 }}>{out.status} · {out.time_ms ?? '—'} ms</div></>)}
                {!out && !err && <span style={{ color: '#97A2B0' }}>{d.grading === 'browser' ? 'Your HTML renders in the Live Preview; Run evaluates the checks.' : 'Run executes your code with the stdin above (unjudged, fast).'}</span>}
              </>}
            </div>
            <div className="ide__pane" style={{ borderInlineEnd: 0 }}>
              <h5>Test Results</h5>
              {!sub && <span style={{ color: '#97A2B0' }}>Type your code, then Submit to validate it…</span>}
              {sub && ['queued', 'processing'].includes(sub.status) && <span><span className="spinner" /> Grading — {sub.status}…</span>}
              {sub && sub.detail?.tests && sub.detail.tests.map((t: any, i: number) => <div key={i} className={t.passed ? 'pass' : 'fail'}>{t.passed ? '✓' : '✗'} {t.name}{t.hidden ? ' (hidden)' : ''}{!t.passed && !t.hidden && t.actual !== undefined ? <span style={{ color: '#97A2B0' }}> — got "{t.actual.trim()}"</span> : ''}</div>)}
              {sub && sub.detail?.checks && sub.detail.checks.map((c: any) => <div key={c.name} className={c.passed ? 'pass' : 'fail'}>{c.passed ? '✓' : '✗'} {c.name}</div>)}
              {sub && sub.detail?.compile_output && <pre className="fail">{sub.detail.compile_output}</pre>}
              {sub && sub.detail?.stderr && !sub.passed && <pre className="fail">{sub.detail.stderr}</pre>}
              {sub && !['queued', 'processing'].includes(sub.status) && <div style={{ marginTop: 8, color: sub.passed ? '#4ADE80' : '#F87171' }}>{sub.detail?.tests ? `${sub.detail.tests.filter((t: any) => t.passed).length}/${sub.detail.tests.length} tests passed` : `${sub.detail?.checks?.filter((c: any) => c.passed).length ?? 0}/${sub.detail?.checks?.length ?? 0} checks passed`} · score {Math.round(sub.score ?? 0)}% · {sub.status}</div>}
            </div>
          </div>
        </div>
      </div>
      {celebrate && <div className="overlay" onClick={() => setCelebrate(false)}><div className="modal" onClick={(e) => e.stopPropagation()}><span className="trophy">🏆</span><h2>Exercise Complete!</h2><p className="muted">+{sub?.credits ?? d.tech_credits} Tech Credits synced to your transcript.</p><div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>{next ? <Link to={`/ide/${language}/${next.slug}`} className="btn" onClick={() => setCelebrate(false)}>Next exercise →</Link> : <Link to="/ide" className="btn">Choose another language →</Link>}<Link to="/dashboard" className="btn btn--outline">Continue Learning</Link></div></div></div>}
    </div>
  );
}

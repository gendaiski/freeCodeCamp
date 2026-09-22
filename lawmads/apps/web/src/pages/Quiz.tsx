import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { post } from '../lib/api';
import { BackBar, Loading, ErrorBox } from '../components/ui';

export default function Quiz() {
  const { slug = '' } = useParams();
  const q = useApi<any>(`/catalog/quizzes/${slug}`);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const d = q.data;
  if (q.loading) return <Loading />;
  if (q.error || !d) return <div className="wrap section"><ErrorBox error={q.error} /></div>;
  const qs = d.questions; const cur = qs[i];
  const submit = async () => { setBusy(true); try { setResult(await post(`/me/quizzes/${d.slug}/attempts`, { answers })); } catch (e: any) { setResult({ error: e.message }); } setBusy(false); };
  const back = d.program ? `/programs/${d.program.program_code.toLowerCase()}` : '/programs';
  return (
    <>
      <BackBar crumbs={[[d.program?.program_code ?? 'Quiz', back], [d.title]]} />
      <div className="wrap wrap--narrow section">
        <span className="eyebrow">{d.program?.program_code}® · Track {d.program?.track_code}</span>
        <h1 style={{ fontSize: 40 }}>{d.title}</h1>
        <p className="muted">{qs.length} questions · pass with {d.passPct}% to bank {d.techCredits ? `+${d.techCredits} Tech Credits` : ''}{d.lawCredits ? `+${d.lawCredits} Law Credits` : ''}</p>
        {result ? (
          <div className="card card--flat" style={{ marginTop: 24 }}>
            {result.error ? <div className="alert">{result.error}</div> : <>
              <h2>{result.passed ? '✓ Passed' : '✗ Not yet'} — {Math.round(result.scorePct)}%</h2>
              <p className="muted">{result.passed ? `+${result.creditsAwarded.tech || result.creditsAwarded.law} credits banked${result.creditsAwarded.tech === 0 && result.creditsAwarded.law === 0 ? ' (already credited)' : ''}.` : `Pass mark is ${result.passPct}%. Review the explanations and retake.`}</p>
              <div className="rows">{result.results.map((r: any, k: number) => <div key={r.id} className="row" style={{ gridTemplateColumns: '30px 1fr' }}><span className={r.correct ? 'kind kind--lab' : 'kind kind--law'}>{r.correct ? '✓' : '✗'}</span><span><strong>Q{k + 1}</strong> — correct answer {r.answer}. <span className="muted">{r.explanation}</span></span></div>)}</div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}><Link to={back} className="btn">Back to program</Link>{!result.passed && <button className="btn btn--outline" onClick={() => { setResult(null); setI(0); setAnswers({}); }}>Retake</button>}</div>
            </>}
          </div>
        ) : (
          <div className="card card--flat" style={{ marginTop: 24 }}>
            <span className="tag">Question {i + 1} of {qs.length}</span>
            <h3 style={{ fontSize: 24 }}>{cur.prompt}</h3>
            <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>{cur.options.map((o: any) => <button key={o.key} className={`goal${answers[cur.id] === o.key ? ' goal--active' : ''}`} onClick={() => setAnswers({ ...answers, [cur.id]: o.key })}><span><strong>{o.key}.</strong> {o.text}</span></button>)}</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, gap: 10 }}>
              <button className="btn btn--outline" disabled={i === 0} onClick={() => setI(i - 1)}>← Back</button>
              {i < qs.length - 1 ? <button className="btn" disabled={!answers[cur.id]} onClick={() => setI(i + 1)}>Next →</button> : <button className="btn btn--red" disabled={busy || Object.keys(answers).length < qs.length} onClick={submit}>{busy ? 'Grading…' : 'Submit Quiz →'}</button>}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

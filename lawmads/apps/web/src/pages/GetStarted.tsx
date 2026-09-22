import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useApi } from '../lib/hooks';
import { Field } from '../components/ui';
import { OAuthButtons } from './SignIn';
const GOALS: [string, string, string, string][] = [['design', '🎨', 'Design legal products', 'Interfaces, prototypes and the copyright law that protects them. → LUID®'], ['build', '💻', 'Build legal software', 'Front to back in one language, with civil and corporate law throughout. → LWD-FS®'], ['data', '📊', 'Analyse legal data', 'Statistics, ML and NLP on legal text. → LDS®'], ['ai', '🤖', 'Supervise legal AI', 'Prompt, draft, review and supervise across the practice. → AI Copilot Diploma'], ['osint', '🕵️', 'Investigate & report', 'OSINT technique, and the law on what you may collect. → LOSINT®'], ['unsure', '🧭', 'Not sure yet', 'Start with the generalist credential and specialise later. → LTS®']];
export default function GetStarted() {
  const { register } = useAuth(); const nav = useNavigate();
  const js = useApi<any>('/track-designer/options');
  const [step, setStep] = useState(1);
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', password: '', acceptTerms: false, goal: '', jurisdictions: [] as string[], plan: 'plan_free' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const academic = /\.(edu|ac\.[a-z]+|edu\.[a-z]+)$/i.test(f.email) || /lawmads\.edu$/i.test(f.email);
  const finish = async () => { setBusy(true); setErr(''); try { await register({ ...f, acceptTerms: true }); nav(f.plan === 'plan_free' ? '/dashboard' : `/checkout/${f.plan}`); } catch (x: any) { setErr(x.message); } setBusy(false); };
  return (
    <div className="auth">
      <div className="auth__left"><span className="eyebrow">Get Started</span><h1 style={{ fontSize: 'clamp(36px,5vw,60px)' }}>Create your Lawmad account.</h1><p className="muted">Two disciplines, one credential. Three steps and you are in — the free tier needs no card.</p><div className="steps-bar" style={{ color: '#B9B9B6' }}>{['Account · Who you are', 'Your goal · What you want to build', 'Plan · Pick a tier'].map((s, i) => <span key={s} style={{ color: step === i + 1 ? '#fff' : undefined, fontWeight: step === i + 1 ? 800 : 400 }}>0{i + 1} · {s}</span>)}</div></div>
      <div className="auth__right">
        {step === 1 && <form className="form" onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
          <h2>Create your account</h2><OAuthButtons /><div className="divider">or with email</div>
          <div className="field-row"><Field label="First name"><input required value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} /></Field><Field label="Last name"><input required value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} /></Field></div>
          <Field label="Email address" hint={academic ? '✓ Academic email — you will be offered the 30% student rate at step 3.' : 'Using an academic email? You will be offered the 30% student rate at step 3.'}><input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Create a password"><input type="password" required minLength={8} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          <label style={{ fontSize: 14, display: 'flex', gap: 8 }}><input type="checkbox" required checked={f.acceptTerms} onChange={(e) => setF({ ...f, acceptTerms: e.target.checked })} /> I agree to the <Link to="/company/terms" className="link">Terms of Service</Link> and the <Link to="/company/privacy" className="link">Privacy Policy</Link>.</label>
          <button className="btn btn--lg">Continue →</button><p className="muted" style={{ fontSize: 13 }}>Already a Lawmad? <Link to="/signin" className="link">Sign in</Link></p>
        </form>}
        {step === 2 && <div className="form">
          <h2>What do you want to build?</h2><p className="muted">We map this to a track. You can change it at any time.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>{GOALS.map(([k, ico, t, d]) => <button key={k} type="button" className={`goal${f.goal === k ? ' goal--active' : ''}`} onClick={() => setF({ ...f, goal: k })}><span style={{ fontSize: 20 }}>{ico}</span><strong>{t}</strong><span className="muted" style={{ fontSize: 12 }}>{d}</span></button>)}</div>
          <h3>Which jurisdictions matter to you?</h3>
          <div className="pills">{(js.data?.jurisdictions ?? []).map((j: any) => <button key={j.code} type="button" className={`filter${f.jurisdictions.includes(j.code) ? ' filter--active' : ''}`} onClick={() => setF({ ...f, jurisdictions: f.jurisdictions.includes(j.code) ? f.jurisdictions.filter((x) => x !== j.code) : [...f.jurisdictions, j.code] })}>{j.flag} {j.name}</button>)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><button className="btn btn--outline" onClick={() => setStep(1)}>← Back</button><button className="btn" disabled={!f.goal} onClick={() => setStep(3)}>Continue →</button></div>
        </div>}
        {step === 3 && <div className="form">
          <h2>Choose your plan</h2><p className="muted">Start free. Upgrade whenever the IDE stops being enough.</p>
          <div style={{ display: 'grid', gap: 10 }}>{[['plan_free', 'Lawmad Free', '$0', 'no card needed', ['Community membership', 'Selected open lessons', 'IDE playground (limited)', 'Public Lawmad profile']], ['plan_pro_annual', 'Lawmad Pro', '$19/mo', 'billed annually', ['All courses & quizzes', 'Full IDE — 18 languages', 'AI Web Builder', 'Law Database (Research tier)']], ['plan_student_monthly', 'Student', '$13/mo', 'academic email required', ['Everything in Pro', '30% student discount', 'Verified at checkout', 'Cancel any time']]].map(([k, n, pr, s, feats]) => <button key={k as string} type="button" disabled={k === 'plan_student_monthly' && !academic} className={`plan${f.plan === k ? ' plan--active' : ''}`} onClick={() => setF({ ...f, plan: k as string })}><strong>{n as string}</strong><span className="price">{pr as string}</span><span className="muted" style={{ fontSize: 12 }}>{s as string}</span><ul className="list" style={{ fontSize: 13 }}>{(feats as string[]).map((x) => <li key={x}>{x}</li>)}</ul></button>)}</div>
          {err && <div className="alert">{err}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><button className="btn btn--outline" onClick={() => setStep(2)}>← Back</button><button className="btn" disabled={busy} onClick={finish}>{busy ? 'Creating…' : 'Create my account →'}</button></div>
          <p className="muted" style={{ fontSize: 13 }}>No card is charged on the free tier. Paid plans can be cancelled any time and refunded in full within 14 days.</p>
        </div>}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { get } from '../lib/api';
import { Field } from '../components/ui';
export function OAuthButtons() {
  const start = async (p: string) => { const r = await get(`/auth/oauth/${p}/start`); if (r.configured) window.location.href = r.url; else alert(r.message); };
  return <div style={{ display: 'grid', gap: 8 }}><button type="button" className="btn btn--outline" onClick={() => start('google')}>G&nbsp; Continue with Google</button><button type="button" className="btn btn--outline" onClick={() => start('microsoft')}>⊞&nbsp; Continue with Microsoft</button></div>;
}
export default function SignIn() {
  const { login } = useAuth(); const nav = useNavigate(); const [sp] = useSearchParams();
  const [f, setF] = useState({ email: '', password: '', totp: '' }); const [err, setErr] = useState(''); const [need2fa, setNeed2fa] = useState(false); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setErr(''); try { await login(f.email, f.password, f.totp || undefined); nav(sp.get('next') ?? '/dashboard'); } catch (x: any) { if (x.code === 'totp_required') setNeed2fa(true); else setErr(x.message); } setBusy(false); };
  return (
    <div className="auth">
      <div className="auth__left"><span className="eyebrow">Welcome back, Lawmad</span><h1 style={{ fontSize: 'clamp(36px,5vw,64px)' }}>Where law meets code.</h1><p className="muted">Sign in to continue your programs, run IDE labs, track your credits, and manage your verified credentials.</p><blockquote>"The Delta Generation of lawyers doesn't choose between law and technology — it masters both."<cite>— The Lawmads Doctrine</cite></blockquote></div>
      <div className="auth__right">
        <form className="form" onSubmit={submit}>
          <h2>Sign in</h2><p className="muted">New to Lawmads? <Link to="/get-started" className="link">Create your free account</Link></p>
          <OAuthButtons /><div className="divider">or with email</div>
          <Field label="Email address"><input type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Password"><input type="password" required autoComplete="current-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
          {need2fa && <Field label="Two-factor code"><input inputMode="numeric" maxLength={6} value={f.totp} onChange={(e) => setF({ ...f, totp: e.target.value })} /></Field>}
          {err && <div className="alert">{err}</div>}
          <button className="btn btn--lg" disabled={busy}>{busy ? 'Signing in…' : 'Sign In →'}</button>
          <p className="muted" style={{ fontSize: 13 }}>Protected by two-factor authentication. By signing in you agree to the Lawmads <Link to="/company/terms" className="link">Terms</Link> & <Link to="/company/privacy" className="link">Privacy Policy</Link>.</p>
          <p className="notice" style={{ fontSize: 13 }}>Demo accounts: <code>aelgendy@thelawtechlabs.com</code>, <code>student@lawmads.test</code>, <code>admin@lawmads.test</code> — password <code>lawmads-demo</code></p>
        </form>
      </div>
    </div>
  );
}

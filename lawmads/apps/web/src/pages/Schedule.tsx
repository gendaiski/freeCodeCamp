import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { post } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PageHead, Section, Field } from '../components/ui';
export default function Schedule() {
  const [sp] = useSearchParams(); const { user } = useAuth();
  const s = useApi<any>('/bookings/slots');
  const [f, setF] = useState({ fullName: user?.displayName ?? '', email: user?.email ?? '', interest: 'AI & Automation track', slot: sp.get('slot') ?? '', channel: 'video' as 'video' | 'whatsapp' });
  const [done, setDone] = useState<any>(null); const [err, setErr] = useState('');
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setErr(''); try { setDone(await post('/bookings', f)); } catch (x: any) { setErr(x.message); } };
  return (
    <>
      <PageHead eyebrow="Admissions" title="Schedule a Call" sub="15 minutes with the admissions team — we map your legal background to the right track, credits and jurisdiction plan." />
      <Section><div className="split split--even" style={{ alignItems: 'start' }}>
        <div>
          {done ? <div className="card card--flat"><h3>✓ Booked</h3><p>We will see you {new Date(done.slot).toLocaleString()}. A calendar invite is on its way to {f.email}.</p></div> : (
            <form className="form" onSubmit={submit}>
              <h3>Book your slot</h3>
              <Field label="Full name"><input required value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} /></Field>
              <Field label="Email"><input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
              <Field label="I'm interested in"><select value={f.interest} onChange={(e) => setF({ ...f, interest: e.target.value })}>{(s.data?.interests ?? ['AI & Automation track']).map((i: string) => <option key={i}>{i}</option>)}</select></Field>
              <Field label="Pick a time"><div className="slots">{(s.data?.slots ?? []).map((sl: any) => <button type="button" key={sl.at} className={`slot${f.slot === sl.at ? ' slot--active' : ''}`} onClick={() => setF({ ...f, slot: sl.at })}>{sl.label}</button>)}</div></Field>
              {err && <div className="alert">{err}</div>}
              <button className="btn btn--lg" disabled={!f.slot}>Book the call →</button>
            </form>
          )}
        </div>
        <div>
          <h3>What to expect</h3>
          <div className="steps" style={{ gridTemplateColumns: '1fr', marginTop: 12 }}>{[['01', 'A 15-minute video call — no sales script, a real advisor.'], ['02', 'We review your legal background & tech comfort level.'], ['03', 'You leave with a track, a credit plan and a jurisdiction map.']].map(([n, t]) => <div key={n} className="step"><span className="n">{n}</span><p style={{ margin: '6px 0 0' }}>{t}</p></div>)}</div>
          <p className="muted" style={{ marginTop: 20 }}>Prefer chat? <a className="link" href={s.data?.whatsapp}>WhatsApp us</a> anytime — average reply under 10 minutes during campus hours.</p>
        </div>
      </div></Section>
    </>
  );
}

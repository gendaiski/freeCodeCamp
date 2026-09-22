import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../lib/hooks';
import { post } from '../lib/api';
import { PageHead, Section, Filters } from '../components/ui';
export default function TrackDesigner() {
  const o = useApi<any>('/track-designer/options');
  const [js, setJs] = useState<string[]>([]); const [craft, setCraft] = useState(''); const [region, setRegion] = useState('all'); const [r, setR] = useState<any>(null);
  const toggle = (c: string) => setJs(js.includes(c) ? js.filter((x) => x !== c) : js.length < 2 ? [...js, c] : [js[1]!, c]);
  useEffect(() => { if (js.length === 2 && craft) post('/track-designer/qualify', { jurisdictions: js, craft }).then(setR); else setR(null); }, [js, craft]);
  const list = (o.data?.jurisdictions ?? []).filter((j: any) => region === 'all' || j.region === region);
  const names = (c: string) => o.data?.jurisdictions.find((j: any) => j.code === c);
  return (
    <>
      <PageHead eyebrow="Track designer" title={<>Two legal systems. One craft.<br />Find out what it makes you.</>} sub="Every Lawmads credential pairs a technology craft with the law that governs it — you cannot graduate as one or the other. Choose the two jurisdictions you actually work across and the craft you want examined, and we will tell you precisely what the combination qualifies you as, and what it does not.">
        <div className="pills" style={{ marginTop: 20 }}><span className="pill">Jurisdictions: {js.length ? js.map((c) => names(c)?.name).join(' + ') : 'None selected'}</span><span className="pill">Craft: {craft || 'None selected'}</span><span className="pill">Qualifies as: {r?.ok ? r.qualifiesAs : '—'}</span><button className="btn btn--ghost btn--sm" onClick={() => { setJs([]); setCraft(''); }}>reset</button></div>
      </PageHead>
      <Section tone="stone"><span className="eyebrow">★ Start from a known-good combination</span><p className="muted">These are the four pairings that most often get people hired. One click fills the whole path — you can change anything afterwards.</p><div className="pills">{(o.data?.presets ?? []).map((p: any) => <button key={p.name} className="filter" onClick={() => { setJs(p.jurisdictions); setCraft(p.craft); }}>{p.name}</button>)}</div></Section>
      <Section>
        <div className="split split--even" style={{ alignItems: 'start' }}>
          <div>
            <span className="eyebrow">1 · Choose exactly two jurisdictions</span><p className="muted">Pairing a common-law system with a codified one produces a materially rarer profile than pairing two of the same.</p>
            <Filters items={[['all', 'All nine'], ['MENA', 'MENA'], ['Europe', 'Europe']]} active={region} onChange={setRegion} />
            <div className="cards cards--2" style={{ marginTop: 12 }}>{list.map((j: any) => <button key={j.code} className={`card${js.includes(j.code) ? ' card--ink' : ''}`} style={{ textAlign: 'start' }} onClick={() => toggle(j.code)}><span style={{ fontSize: 22 }}>{j.flag}</span><h3 style={{ fontSize: 17 }}>{j.name}</h3><span className="muted" style={{ fontSize: 12 }}>{j.familyLabel}</span></button>)}</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Common law — reason from cases · Civil law — reason from the code · Sharia-based — codifying now · Hybrid — both, in one country</p>
            <span className="eyebrow" style={{ marginTop: 28 }}>2 · Choose the craft to be examined in</span><p className="muted">A certification track gives you a credential. A tool gives you the skill and nothing else — and we will say so plainly in the result.</p>
            <div className="tag" style={{ marginBottom: 6 }}>Certification tracks — examined, credentialed</div><div className="pills">{(o.data?.crafts ?? []).filter((c: any) => c.kind === 'certification').map((c: any) => <button key={c.code} className={`filter${craft === c.code ? ' filter--active' : ''}`} onClick={() => setCraft(c.code)}>{c.name} {c.code}®</button>)}</div>
            <div className="tag" style={{ margin: '14px 0 6px', color: 'var(--muted)' }}>Tools only — no credential issues</div><div className="pills">{(o.data?.crafts ?? []).filter((c: any) => c.kind === 'tool').map((c: any) => <button key={c.code} className={`filter${craft === c.code ? ' filter--active' : ''}`} onClick={() => setCraft(c.code)}>{c.name}</button>)}</div>
          </div>
          <div className={`card${r?.ok ? '' : ' card--stone card--flat'}`} style={{ position: 'sticky', top: 90 }}>
            {!r?.ok ? <><span style={{ fontSize: 28 }}>◈</span><h3>Your qualification will appear here</h3><p className="muted">Choose two jurisdictions and one craft. Nothing is calculated until both are set — we would rather show you nothing than show you a guess.</p>{r?.error && <div className="alert">{r.error}</div>}</> : <>
              <span className="tag">You would qualify as</span>
              <h2 style={{ fontSize: 28 }}>{r.tier === 'international' ? '🌐' : '🥉'} {r.qualifiesAs}</h2>
              <span className={`chip ${r.rarity === 'rarest' ? 'chip--red' : r.rarity === 'rare' ? 'chip--ink' : ''}`}>{r.rarity} profile · {r.pairing.kind}</span>
              <p className="muted" style={{ fontSize: 14 }}>{r.pairing.explanation}</p>
              <h4>This qualifies you to</h4><ul className="list check" style={{ fontSize: 14 }}>{r.qualifiesTo.map((x: string) => <li key={x}>{x}</li>)}</ul>
              <h4>This does not qualify you to</h4><ul className="list" style={{ fontSize: 14 }}>{r.doesNotQualifyTo.map((x: string) => <li key={x}>{x}</li>)}</ul>
              {r.roles.length > 0 && <><h4>Roles you would be a credible candidate for</h4><div className="pills">{r.roles.map((x: string) => <span key={x} className="chip">{x}</span>)}</div></>}
              {r.subjects.length > 0 && <><h4>The market subjects you would now be credentialed against</h4><div className="pills">{r.subjects.map((x: string) => <span key={x} className="chip">{x}</span>)}</div></>}
              <h4>What is expected after enrolment</h4><ol style={{ paddingInlineStart: 18, fontSize: 14, margin: 0 }}>{r.expectations.map((x: string) => <li key={x}>{x}</li>)}</ol>
              <h4>The gap to the next rung</h4><p className="muted" style={{ fontSize: 14 }}>{r.gapToNextRung}</p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><Link to="/schedule" className="btn btn--outline">Talk it through first</Link>{r.credentialIssues && <Link to={`/checkout/certificate?ref=${r.craft.code}`} className="btn">Enrol on this path →</Link>}</div>
            </>}
          </div>
        </div>
      </Section>
      <Section tone="stone">
        <span className="eyebrow">Next · What actually happens after you enrol.</span>
        <div className="steps">{[['01', 'A placement call', 'Thirty minutes with an instructor, not a salesperson. They will tell you if the timing is wrong.', '30 MIN · FREE'], ['02', 'The craft begins', 'Graded in the IDE from week one. Tech Credits accrue automatically as your exercises pass their test cases — there is no self-marking.', '12–20 WEEKS'], ['03', 'Your two sittings', 'Sit the badges whenever you are ready. No deadline, no required order, and one free resit on each.', '90 MIN EACH'], ['04', 'Capstone, then credential', 'Instructor-reviewed, digitally signed, QR-registered. It appears on your public profile the day you pass.', 'FINAL · PERMANENT']].map(([n, h, d, m]) => <div key={n} className="step"><span className="n">{n}</span><h3 style={{ fontSize: 18, marginTop: 6 }}>{h}</h3><p className="muted" style={{ fontSize: 14 }}>{d}</p><span className="chip">{m}</span></div>)}</div>
        <div className="cards" style={{ marginTop: 32 }}>{[['Dual-system', 'Common law + codified law', 'The reasoning methods are opposites. A clause-matching model is reliable in a codified system and dangerous in a common-law one — and the person who knows which is which is the person who gets hired to build it.'], ['Cross-border', 'MENA + Europe', 'Cross-border legal technology fails at jurisdiction boundaries. Two badges either side of that boundary is the rarest profile on the platform, and the one clients ask for by name.'], ['Honest limits', 'No combination lets you practise', 'Not two badges, not four. These are competence credentials, not admission. We print the limitation on the certificate itself.']].map(([t, h, d]) => <div key={t} className="card card--flat"><span className="tag">{t}</span><h3>{h}</h3><p className="muted" style={{ fontSize: 14 }}>{d}</p></div>)}</div>
      </Section>
    </>
  );
}

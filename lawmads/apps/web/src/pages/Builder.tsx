import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApi, useToast } from '../lib/hooks';
import { useAuth } from '../lib/auth';
import { post } from '../lib/api';
import { usd } from '../lib/format';
import { PageHead, Section, Field, Toast, Loading } from '../components/ui';
export default function Builder() {
  const { user } = useAuth(); const nav = useNavigate(); const { toast, show } = useToast();
  const o = useApi<any>('/builder/options', [user?.id]); const projects = useApi<any>(user ? '/builder/projects' : null, [user?.id]);
  const [brief, setBrief] = useState('A corporate and commercial law firm in Cairo. Bilingual Arabic and English. Practice areas: M&A, e-commerce, data protection. Confident and modern, not stuffy.'); const [style, setStyle] = useState('Editorial'); const [langs, setLangs] = useState<string[]>(['en', 'ar']); const [models] = useState<Record<string, string>>({ copy: 'gemini', video: 'seedance', stills: 'imagen', motion: 'veo' });
  const [gen, setGen] = useState<any>(null); const [busy, setBusy] = useState(false); const [domain, setDomain] = useState('elgendy-partners.law'); const [pub, setPub] = useState<any>(null); const [log, setLog] = useState<any[]>([]);
  const generate = async () => { if (!user) { nav('/signin?next=/builder'); return; } setBusy(true); setGen(null); setPub(null); setLog([]); try { const p = await post('/builder/projects', { brief, style, languages: langs, models, name: brief.slice(0, 40) }); const r = await post(`/builder/projects/${p.id}/generate`); const steps = [['Structuring site with Gemini', 0], [`${r.result.pages} pages drafted (${langs.join(' · ').toUpperCase()})`, 500], [`${r.result.images} images with Imagen`, 1100], [`${r.result.videos} hero video with Seedance`, 1700], ['Cookie banner reflects what the site collects', 2200]] as const; for (const [m, t] of steps) setTimeout(() => setLog((l) => [...l, m]), t); setTimeout(() => { setGen({ ...r, projectId: p.id }); setBusy(false); projects.reload(); o.reload(); }, 2600); } catch (e: any) { show(e.message, 'error'); setBusy(false); } };
  const publish = async () => { try { setPub(await post(`/builder/projects/${gen.projectId}/publish`, { domain })); show('Published'); } catch (e: any) { show(e.message, 'error'); } };
  if (!o.data) return <Loading />;
  return (
    <>
      <PageHead eyebrow={<>The Lawmads Web Builder <span className="chip chip--red">NEW</span></>} title="Describe your practice. Ship the website." sub="An AI website builder for legal practices. Built on Gemini, with image and video generation from Seedance and partner models — bilingual by default, publishable to your own domain." />
      <Section><div className="split split--even" style={{ alignItems: 'start' }}>
        <div className="form"><span className="eyebrow">Start here · What are we building?</span>
          <Field label="Describe your firm"><textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} /></Field>
          <Field label="Style"><div className="filters">{o.data.styles.map((s: string) => <button key={s} type="button" className={`filter${style === s ? ' filter--active' : ''}`} onClick={() => setStyle(s)}>{s}</button>)}</div></Field>
          <Field label="Languages"><div className="filters">{[['en', 'EN'], ['ar', 'AR'], ['fr', 'FR']].map(([k, l]) => <button key={k} type="button" className={`filter${langs.includes(k!) ? ' filter--active' : ''}`} onClick={() => setLangs(langs.includes(k!) ? langs.filter((x) => x !== k) : [...langs, k!])}>{l}</button>)}</div></Field>
          <Field label="Generate media with"><div className="cards cards--2">{o.data.partners.map((p: any) => <div key={p.key} className="card card--flat" style={{ padding: 14 }}><span className="tile">{p.mono}</span><strong>{p.name} <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>— {p.role}</span></strong><span className="muted" style={{ fontSize: 12 }}>{p.blurb}</span></div>)}</div></Field>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><button className="btn btn--lg" onClick={generate} disabled={busy || brief.length < 10}>{busy ? 'Generating…' : 'Generate the site →'}</button><span className="muted" style={{ fontSize: 13 }}>Balance: {o.data.balance ?? '—'} credits · <a href="#packs" className="link">See credit packs</a></span></div>
          <p className="muted" style={{ fontSize: 12 }}>{o.data.notice}</p>
        </div>
        <div className="codemock codemock--light" style={{ minHeight: 360 }}>
          <div className="mono muted">https://{domain}</div>
          {!gen && !busy && <div className="muted" style={{ marginTop: 40, textAlign: 'center' }}>Your site preview appears here.</div>}
          {busy && <div style={{ marginTop: 12 }}><span className="chip chip--red">generating… LIVE</span>{log.map((m, i) => <div key={i} style={{ marginTop: 6 }}>› {m}</div>)}</div>}
          {gen && <div style={{ marginTop: 12 }}><div style={{ fontFamily: 'var(--body)', fontWeight: 900, fontSize: 26 }}>{gen.result.name.toUpperCase()}</div><div className="pills" style={{ marginTop: 8 }}>{gen.result.site.pages.map((p: any) => <span key={p.slug} className="chip">{p.title}</span>)}</div><div style={{ display: 'flex', gap: 8, marginTop: 12 }}>{Array.from({ length: Math.min(6, gen.result.images) }).map((_, i) => <span key={i} className="tile">🖼</span>)}{gen.result.videos > 0 && <span className="tile">🎬</span>}</div><div style={{ color: 'var(--green)', marginTop: 12 }}>✓ {gen.result.pages} pages · {gen.result.images} images · {gen.result.videos} video generated · {gen.seconds}s · {gen.creditsCharged} credits</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}><input value={domain} onChange={(e) => setDomain(e.target.value)} style={{ padding: 8, border: '1px solid var(--line2)', flex: 1 }} /><button className="btn btn--sm" onClick={publish}>Publish</button><Link to={`/ide/html/html-3`} className="btn btn--sm btn--outline">Open in the IDE</Link></div>
            {pub && <div className="notice" style={{ marginTop: 10, fontFamily: 'var(--body)' }}>✓ Published to <a className="link" href={pub.url}>{pub.url}</a>. DNS: {pub.dns.map((r: any) => `${r.type} ${r.name} → ${r.value}`).join(' · ')}</div>}</div>}
        </div>
      </div></Section>
      <Section tone="stone"><span className="eyebrow">How it works</span><h2>Prompt to published, in four steps.</h2><div className="steps" style={{ marginTop: 20 }}>{[['Describe the practice', 'Practice areas, tone, languages. The builder writes the structure and the copy.'], ['Generate the media', 'Imagery and video generated to brief — no stock photography of handshakes.'], ['Edit anything', 'Every block is editable, and the whole site opens in the Lawmads IDE if you want the code.'], ['Publish', 'Your domain, bilingual routing, and a cookie banner that actually reflects what you collect.']].map(([h, t], i) => <div key={h} className="step"><span className="n">Step 0{i + 1}</span><h3 style={{ fontSize: 18, marginTop: 6 }}>{h}</h3><p className="muted" style={{ fontSize: 14 }}>{t}</p></div>)}</div></Section>
      <Section id="packs"><div className="section__head"><div><span className="eyebrow">Model partners</span><h2>Generation, resold at cost-plus.</h2><p className="muted">Bring your own key, or buy Lawmads credits and we handle the billing across every model.</p></div></div><div className="cards">{o.data.creditPacks.map((p: any) => <div key={p.credits} className="card"><h3>{p.credits} credits</h3><div style={{ fontSize: 30, fontWeight: 900 }}>{usd(p.cents)}</div><span className="muted" style={{ fontSize: 13 }}>≈ {Math.floor(p.credits / 26)} sites of six pages</span><Link to="/schedule" className="btn btn--outline btn--block" style={{ marginTop: 'auto' }}>Buy pack</Link></div>)}</div>
        {projects.data?.projects.length > 0 && <><h3 style={{ marginTop: 40 }}>Your sites</h3><div className="rows">{projects.data.projects.map((p: any) => <div key={p.id} className="row" style={{ gridTemplateColumns: '1fr auto auto' }}><span><strong>{p.name}</strong> <span className="muted">· {p.style}</span></span><span className="chip">{p.status}</span><span className="muted">{p.domain ?? '—'}</span></div>)}</div></>}
      </Section>
      <Toast toast={toast} />
    </>
  );
}

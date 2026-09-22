import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApi, useToast } from '../lib/hooks';
import { api, get, post, put } from '../lib/api';
import { Loading, Toast } from '../components/ui';
type Clause = { id: string; heading: string; text_en: string; text_ar: string };
export default function Workspace() {
  const { id } = useParams(); const nav = useNavigate(); const { toast, show } = useToast();
  const list = useApi<any>('/workspace/documents');
  useEffect(() => { if (!id && list.data) { if (list.data.documents[0]) nav(`/workspace/${list.data.documents[0].id}`, { replace: true }); else post('/workspace/documents', { title: 'Services Agreement — New', template: 'services', governingLaw: 'EG' }).then((d) => nav(`/workspace/${d.id}`, { replace: true })); } }, [id, list.data, nav]);
  const doc = useApi<any>(id ? `/workspace/documents/${id}` : null);
  const [content, setContent] = useState<Clause[]>([]); const [mode, setMode] = useState<'en' | 'ar' | 'bi'>('en'); const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false); const [sel, setSel] = useState<string>('c1');
  const [panel, setPanel] = useState<'codes' | 'cassation' | 'clauses' | 'templates'>('codes'); const [q, setQ] = useState(''); const [hits, setHits] = useState<any[]>([]); const [assist, setAssist] = useState<any>(null); const [busy, setBusy] = useState(''); const timer = useRef<number | null>(null);
  useEffect(() => { if (doc.data) { setContent(doc.data.content); setMode(doc.data.language_mode); setDirty(false); } }, [doc.data?.id, doc.data?.version]);
  useEffect(() => { if (!dirty || !id) return; if (timer.current) window.clearTimeout(timer.current); timer.current = window.setTimeout(async () => { setSaving(true); await put(`/workspace/documents/${id}`, { content, languageMode: mode }); setSaving(false); setDirty(false); doc.reload(); }, 1500); return () => { if (timer.current) window.clearTimeout(timer.current); }; }, [content, dirty]);
  useEffect(() => { if (panel === 'clauses' || panel === 'templates' || !q.trim()) { setHits([]); return; } const t = window.setTimeout(async () => { const r = await get(`/law/search?q=${encodeURIComponent(q)}&jurisdiction=${doc.data?.governing_law ?? 'EG'}${panel === 'cassation' ? '&kind=cassation' : '&kind=legislation'}`); setHits(r.results); }, 300); return () => window.clearTimeout(t); }, [q, panel, doc.data?.governing_law]);
  if (!id || !doc.data) return <Loading />;
  const d = doc.data;
  const edit = (cid: string, key: 'text_en' | 'text_ar' | 'heading', v: string) => { setContent(content.map((c) => c.id === cid ? { ...c, [key]: v } : c)); setDirty(true); };
  const addClause = (heading = `${content.length + 1}.`, en = '', ar = '') => { setContent([...content, { id: `c${Date.now()}`, heading, text_en: en, text_ar: ar }]); setDirty(true); };
  const insertAuthority = async (articleId: string) => { setBusy('auth'); try { const r = await post(`/workspace/documents/${id}/authorities`, { clauseId: sel, articleId }); show(`${r.supports ? 'Supports' : 'Does not clearly support'} clause — ${r.citation}`); doc.reload(); } catch (e: any) { show(e.message, 'error'); } setBusy(''); };
  const run = async (action: string) => { setBusy(action); try { setAssist(await post(`/workspace/documents/${id}/assist`, { action, clauseId: sel })); } catch (e: any) { show(e.message, 'error'); } setBusy(''); };
  const exportDoc = async (format: 'md' | 'docx') => { const r = await get(`/workspace/documents/${id}/export?format=${format}`); const blob = new Blob([r.content], { type: 'text/markdown' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = r.filename.replace(/docx$/, 'md'); a.click(); if (r.note) show(r.note); };
  const words = content.reduce((n, c) => n + c.text_en.split(/\s+/).filter(Boolean).length, 0);
  return (
    <div>
      <div className="ws__bar"><Link to="/">Home</Link><strong>Lawyer Work Space AI</strong><span className="chip chip--red">NEW</span><span className="muted">·</span><input value={d.title} onChange={(e) => { api(`/workspace/documents/${id}`, { method: 'PUT', body: { title: e.target.value } }).then(() => doc.reload()); }} style={{ border: 0, fontWeight: 700, minWidth: 260 }} /><span className="muted" style={{ fontSize: 12 }}>{saving ? 'Saving…' : dirty ? 'Unsaved' : 'All changes saved'} · v{d.version} · .docx</span><span style={{ flex: 1 }} /><select value={id} onChange={(e) => nav(`/workspace/${e.target.value}`)} style={{ padding: 6 }}>{(list.data?.documents ?? []).map((x: any) => <option key={x.id} value={x.id}>{x.title}</option>)}</select><button className="btn btn--sm btn--outline" onClick={() => post('/workspace/documents', { title: 'Untitled agreement', template: 'services' }).then((x) => { list.reload(); nav(`/workspace/${x.id}`); })}>+ New</button><div className="filters">{(['en', 'ar', 'bi'] as const).map((m) => <button key={m} className={`filter${mode === m ? ' filter--active' : ''}`} onClick={() => { setMode(m); setDirty(true); }}>{m.toUpperCase()}</button>)}</div><button className="btn btn--sm" onClick={() => exportDoc('docx')}>Export</button></div>
      <div className="ws">
        <aside className="ws__side">
          <div className="filters" style={{ marginBottom: 10 }}>{([['codes', 'Codes & laws'], ['cassation', 'Cassation merits'], ['clauses', 'Clauses'], ['templates', 'Templates']] as const).map(([k, l]) => <button key={k} className={`filter${panel === k ? ' filter--active' : ''}`} style={{ padding: '5px 8px', fontSize: 12 }} onClick={() => setPanel(k)}>{l}</button>)}</div>
          {(panel === 'codes' || panel === 'cassation') && <><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search — or browse below" style={{ width: '100%', padding: 8, border: '1px solid var(--line2)' }} /><div className="muted" style={{ fontSize: 11, margin: '6px 0 10px' }}>↑↓ move · ↵ insert · click expand · inserts under clause {sel}</div>{hits.map((h) => <div key={h.id} className="authority"><strong>{h.instrument}, {h.article}</strong><p style={{ margin: '4px 0' }}>{h.text_en.slice(0, 160)}…</p><p className="ar" style={{ margin: '4px 0' }}>{h.text_ar.slice(0, 120)}…</p><button className="btn btn--sm" disabled={busy === 'auth'} onClick={() => insertAuthority(h.id)}>Insert authority</button></div>)}{!q && <p className="muted">Browse by instrument: search “civil code”, “copyright”, “data protection”, “e-signature”.</p>}</>}
          {panel === 'clauses' && (list.data?.clauses ?? []).map((c: any) => <div key={c.id} className="authority"><strong>{c.name}</strong><p style={{ margin: '4px 0' }}>{c.text_en}</p><button className="btn btn--sm btn--outline" onClick={() => addClause(`${content.length + 1}. ${c.name}`, c.text_en, c.text_ar)}>Insert clause</button></div>)}
          {panel === 'templates' && (list.data?.templates ?? []).map((t: any) => <div key={t.slug} className="authority"><strong>{t.name}</strong><button className="btn btn--sm btn--outline" style={{ marginTop: 6 }} onClick={() => post('/workspace/documents', { title: t.name, template: t.slug }).then((x) => { list.reload(); nav(`/workspace/${x.id}`); })}>Create from template</button></div>)}
        </aside>
        <div className="ws__main"><div className="ws__page">
          <h1 style={{ fontFamily: 'var(--body)', fontSize: 28, textAlign: 'center' }}>{d.title.split('—')[0].trim().toUpperCase()}</h1>
          <p className="muted" style={{ textAlign: 'center', fontSize: 14 }}>Governing law: {d.governing_law} · {new Date(d.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {content.map((c) => <div key={c.id} onClick={() => setSel(c.id)} style={{ outline: sel === c.id ? '1px dashed var(--red)' : 'none', padding: 4, marginTop: 8 }}>
            <h2 contentEditable suppressContentEditableWarning onBlur={(e) => edit(c.id, 'heading', e.currentTarget.textContent ?? '')}>{c.heading}</h2>
            {mode !== 'ar' && <p contentEditable suppressContentEditableWarning onBlur={(e) => edit(c.id, 'text_en', e.currentTarget.textContent ?? '')}>{c.text_en || 'Place your cursor here and start drafting — or insert an authority from the panel.'}</p>}
            {mode !== 'en' && <p className="ar" contentEditable suppressContentEditableWarning onBlur={(e) => edit(c.id, 'text_ar', e.currentTarget.textContent ?? '')}>{c.text_ar || '…'}</p>}
            {d.authorities.filter((a: any) => a.clause_id === c.id).map((a: any) => <div key={a.id} className="authority" style={{ fontFamily: 'var(--body)' }}><span className={`chip ${a.supports ? 'chip--green' : 'chip--red'}`}>{a.supports ? '✓ supports' : '⚠ check'}</span> <strong>{a.instrument}, art. {a.article}</strong><p style={{ margin: '4px 0', fontSize: 12 }}>{a.text_en}</p></div>)}
          </div>)}
          <button className="btn btn--sm btn--outline" style={{ marginTop: 16 }} onClick={() => addClause()}>+ Row</button>
          <p className="muted" style={{ fontSize: 12, marginTop: 24, fontFamily: 'var(--body)' }}>{words} words · {d.authorities.length} authorities · Page 1 of {Math.max(1, Math.ceil(words / 450))} · Governing law: {d.governing_law} · Saved {new Date(d.updated_at).toLocaleTimeString()}</p>
        </div></div>
        <aside className="ws__side ws__side--r">
          <h4 style={{ margin: '0 0 8px' }}>◈ Drafting assistant</h4>
          <div className="filters">{([['explain', 'Explain'], ['find-authority', 'Find authority'], ['redline', 'Redline'], ['arabic', 'Arabic'], ['risk-scan', 'Risk scan']] as [string, string][]).map(([k, l]) => <button key={k} className="filter" style={{ padding: '5px 8px', fontSize: 12 }} disabled={Boolean(busy)} onClick={() => run(k)}>{busy === k ? '…' : l}</button>)}</div>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Ready. Select any clause for contextual actions, or insert an authority and I will tell you whether it supports what it sits under. Selected: <strong>{sel}</strong></p>
          {assist && <div className="authority" style={{ whiteSpace: 'pre-wrap' }}>{assist.suggestions ? <>{assist.suggestions.map((s: any) => <div key={s.id} style={{ marginBottom: 8 }}><strong>{s.instrument}, {s.article}</strong><p style={{ margin: '2px 0' }}>{s.text_en.slice(0, 140)}…</p><button className="btn btn--sm" onClick={() => insertAuthority(s.id)}>Insert</button></div>)}</> : <>{assist.text}{assist.citations?.length > 0 && <div className="pills" style={{ marginTop: 8 }}>{assist.citations.map((c: any) => <span key={c.id} className="chip">{c.label}</span>)}</div>}<div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{assist.model} · confidence {assist.confidence} · human review {assist.supervision?.humanReview}</div></>}</div>}
          <h4 style={{ margin: '16px 0 8px' }}>Authorities cited ({d.authorities.length})</h4>
          {d.authorities.length === 0 ? <p className="muted" style={{ fontSize: 12 }}>No authorities yet. Search the codes or the Cassation merits and hit Insert.</p> : d.authorities.map((a: any) => <div key={a.id} style={{ fontSize: 12, padding: '6px 0', borderTop: '1px solid var(--line)' }}>{a.instrument}, art. {a.article} → clause {a.clause_id} <button className="chip" onClick={() => api(`/workspace/documents/${id}/authorities/${a.id}`, { method: 'DELETE' }).then(() => doc.reload())}>×</button></div>)}
          <h4 style={{ margin: '16px 0 8px' }}>Versions</h4>
          {d.versions.map((v: any) => <div key={v.version} style={{ fontSize: 12, padding: '4px 0', display: 'flex', justifyContent: 'space-between' }}><span>v{v.version} · {new Date(v.created_at).toLocaleString()}</span>{v.version !== d.version && <button className="chip" onClick={() => post(`/workspace/documents/${id}/revert`, { version: v.version }).then(() => doc.reload())}>revert</button>}</div>)}
        </aside>
      </div>
      <Toast toast={toast} />
    </div>
  );
}

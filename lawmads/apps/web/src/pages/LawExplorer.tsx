import { useEffect, useState } from 'react';
import { get } from '../lib/api';
import { useApi } from '../lib/hooks';
import { PageHead, Section, Filters, Loading } from '../components/ui';
export default function LawExplorer() {
  const [q, setQ] = useState('العقد'); const [kind, setKind] = useState('all'); const [jur, setJur] = useState('EG'); const [rows, setRows] = useState<any[]>([]); const [open, setOpen] = useState<any>(null); const [loading, setLoading] = useState(false);
  const js = useApi<any>('/badges');
  useEffect(() => { setLoading(true); const t = window.setTimeout(async () => { const r = await get(`/law/search?q=${encodeURIComponent(q || 'law')}&limit=50${kind !== 'all' ? `&kind=${kind}` : ''}${jur !== 'all' ? `&jurisdiction=${jur}` : ''}`); setRows(r.results); setLoading(false); }, 250); return () => window.clearTimeout(t); }, [q, kind, jur]);
  return (
    <>
      <PageHead eyebrow="Bilingual Law Database" title="Explorer" sub="Search the corpus in Arabic or English — legislation, Cassation and Supreme Constitutional Court merits, with source-PDF provenance." />
      <Section>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" style={{ flex: 1, minWidth: 260, padding: 12, border: '1px solid var(--line2)' }} /><Filters items={[['all', 'All sources'], ['legislation', 'Legislation'], ['cassation', 'Court of Cassation']]} active={kind} onChange={setKind} /><select value={jur} onChange={(e) => setJur(e.target.value)} style={{ padding: 10 }}><option value="all">All jurisdictions</option>{(js.data?.jurisdictions ?? []).map((j: any) => <option key={j.code} value={j.code}>{j.flag} {j.name}</option>)}</select></div>
        {loading ? <Loading /> : <div className="table-wrap"><table className="table" style={{ marginTop: 16 }}><thead><tr><th>Instrument</th><th style={{ direction: 'rtl', textAlign: 'right' }}>العنوان</th><th>Jurisdiction</th><th>Type</th><th>Article</th></tr></thead><tbody>{rows.map((r) => <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setOpen(r)}><td><strong>{r.instrument}</strong></td><td style={{ direction: 'rtl', textAlign: 'right' }}>{r.instrument_ar}</td><td>{r.flag} {r.jurisdiction_name}</td><td className="muted">{r.kind}</td><td className="mono">{r.article}</td></tr>)}{rows.length === 0 && <tr><td colSpan={5} className="muted">No provisions match.</td></tr>}</tbody></table></div>}
      </Section>
      {open && <div className="overlay" onClick={() => setOpen(null)}><div className="modal modal--wide" onClick={(e) => e.stopPropagation()}><span className="tag">{open.flag} {open.jurisdiction_name} · {open.kind} · in force from {open.in_force_from}</span><h3>{open.instrument}, {open.article}</h3><p>{open.text_en}</p><p style={{ direction: 'rtl', textAlign: 'right', fontSize: 17 }}>{open.text_ar}</p><pre className="codemock codemock--light" style={{ fontSize: 12 }}>{JSON.stringify({ id: open.id, provenance: open.provenance, amended_by: open.amended_by, construed_by: open.construed_by }, null, 2)}</pre><p className="muted" style={{ fontSize: 12 }}>For filing, cite the source PDF, not us. The English is a rendering; only the Arabic has legal force.</p><button className="btn btn--outline" onClick={() => setOpen(null)}>Close</button></div></div>}
    </>
  );
}

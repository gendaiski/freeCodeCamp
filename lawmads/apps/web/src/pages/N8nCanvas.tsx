import { useMemo, useState } from 'react';
type Node = { id: string; name: string; type: string; x: number; y: number; parameters: Record<string, string> };
type Conn = { from: string; to: string };
const PALETTE = [['webhook', '⚡ Webhook', '#e64980'], ['if', '🔀 IF', '#7048e8'], ['set', '✏️ Set', '#0ca678'], ['slack', '💬 Slack', '#4a154b'], ['email', '✉️ Email', '#1971c2'], ['claude', '✳️ Claude AI', '#c2410c']] as const;
const DEFAULTS: Record<string, Record<string, string>> = { webhook: { path: 'intake' }, if: { condition: 'matter_value > 10000' }, set: { fields: '{"status":"open"}' }, slack: { channel: '#intake' }, email: { to: 'intake@firm.law' }, claude: { prompt: 'Summarise this intake in 3 lines' } };
function parse(json: string): { nodes: Node[]; conns: Conn[] } {
  try { const j = JSON.parse(json); const nodes = (j.nodes ?? []).map((n: any, i: number) => ({ id: String(n.id ?? i + 1), name: n.name ?? n.type, type: n.type ?? 'set', x: n.position?.[0] ?? 40 + i * 170, y: n.position?.[1] ?? 60 + (i % 2) * 90, parameters: n.parameters ?? {} })); const conns: Conn[] = []; for (const [from, list] of Object.entries(j.connections ?? {})) for (const c of list as any[]) conns.push({ from, to: c.to }); return { nodes, conns }; } catch { return { nodes: [], conns: [] }; }
}
export function serialize(nodes: Node[], conns: Conn[]): string {
  const connections: Record<string, Array<{ to: string }>> = {};
  for (const c of conns) (connections[c.from] ??= []).push({ to: c.to });
  return JSON.stringify({ nodes: nodes.map((n) => ({ id: n.id, name: n.name, type: n.type, position: [n.x, n.y], parameters: n.parameters })), connections }, null, 2);
}
export default function N8nCanvas({ value, onChange }: { value: string; onChange(v: string): void }) {
  const init = useMemo(() => parse(value), []);
  const [nodes, setNodes] = useState<Node[]>(init.nodes); const [conns, setConns] = useState<Conn[]>(init.conns);
  const [sel, setSel] = useState<string | null>(null); const [linking, setLinking] = useState<string | null>(null); const [drag, setDrag] = useState<{ id: string; dx: number; dy: number } | null>(null);
  const commit = (n: Node[], c: Conn[]) => { setNodes(n); setConns(c); onChange(serialize(n, c)); };
  const add = (type: string, label: string) => { const id = String(Date.now() % 100000); const name = nodes.some((n) => n.name === label.replace(/^\S+\s/, '')) ? `${label.replace(/^\S+\s/, '')} ${nodes.length + 1}` : label.replace(/^\S+\s/, ''); commit([...nodes, { id, name, type, x: 40 + (nodes.length % 4) * 170, y: 60 + Math.floor(nodes.length / 4) * 110, parameters: { ...DEFAULTS[type] } }], conns); setSel(id); };
  const selNode = nodes.find((n) => n.id === sel);
  const onMove = (e: React.MouseEvent) => { if (!drag) return; const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); commit(nodes.map((n) => n.id === drag.id ? { ...n, x: Math.max(0, e.clientX - r.left - drag.dx), y: Math.max(0, e.clientY - r.top - drag.dy) } : n), conns); };
  const port = (n: Node, out: boolean) => ({ x: n.x + (out ? 140 : 0), y: n.y + 22 });
  return (
    <div style={{ display: 'grid', gridTemplateRows: 'auto 1fr', height: '100%' }}>
      <div className="palette"><span style={{ fontSize: 12, color: '#97A2B0', alignSelf: 'center' }}>+ Add node</span>{PALETTE.map(([t, l, c]) => <button key={t} style={{ borderColor: c }} onClick={() => add(t, l)}>{l}</button>)}<span style={{ marginInlineStart: 'auto', fontSize: 11, color: '#97A2B0', alignSelf: 'center' }}>click a node to edit its settings · drag to move · click an output ● then an input ● to connect</span></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', minHeight: 0 }}>
        <div className="canvas" onMouseMove={onMove} onMouseUp={() => setDrag(null)} onMouseLeave={() => setDrag(null)}>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>{conns.map((c, i) => { const a = nodes.find((n) => n.name === c.from), b = nodes.find((n) => n.name === c.to); if (!a || !b) return null; const p = port(a, true), q = port(b, false); return <path key={i} d={`M${p.x},${p.y} C${p.x + 60},${p.y} ${q.x - 60},${q.y} ${q.x},${q.y}`} stroke="#E01E1E" strokeWidth={2} fill="none" />; })}</svg>
          {nodes.map((n) => <div key={n.id} className={`node${sel === n.id ? ' node--selected' : ''}`} style={{ left: n.x, top: n.y, borderColor: sel === n.id ? undefined : PALETTE.find((p) => p[0] === n.type)?.[2] }} onMouseDown={(e) => { setSel(n.id); setDrag({ id: n.id, dx: e.nativeEvent.offsetX, dy: e.nativeEvent.offsetY }); }}>
            <strong>{PALETTE.find((p) => p[0] === n.type)?.[1].split(' ')[0]} {n.name}</strong><div style={{ color: '#97A2B0', fontSize: 11 }}>{n.type}</div>
            {n.type !== 'webhook' && <span className="port port--in" onMouseDown={(e) => { e.stopPropagation(); if (linking && linking !== n.name) { commit(nodes, [...conns.filter((c) => !(c.from === linking && c.to === n.name)), { from: linking, to: n.name }]); setLinking(null); } }} />}
            <span className="port port--out" style={{ background: linking === n.name ? '#E01E1E' : undefined }} onMouseDown={(e) => { e.stopPropagation(); setLinking(linking === n.name ? null : n.name); }} />
          </div>)}
        </div>
        <div style={{ borderInlineStart: '1px solid var(--ide-line)', padding: 12, fontSize: 12, overflow: 'auto' }}>
          <h5 style={{ margin: '0 0 8px', color: '#97A2B0', letterSpacing: '.12em', fontSize: 11 }}>NODE SETTINGS</h5>
          {!selNode ? <span style={{ color: '#97A2B0' }}>Select a node.</span> : <div style={{ display: 'grid', gap: 8 }}>
            <label>Name<input style={{ width: '100%', background: '#0c0f16', color: '#fff', border: '1px solid var(--ide-line)', padding: 6 }} value={selNode.name} onChange={(e) => { const old = selNode.name; commit(nodes.map((n) => n.id === selNode.id ? { ...n, name: e.target.value } : n), conns.map((c) => ({ from: c.from === old ? e.target.value : c.from, to: c.to === old ? e.target.value : c.to }))); }} /></label>
            {Object.entries(selNode.parameters).map(([k, v]) => <label key={k}>{k}<input style={{ width: '100%', background: '#0c0f16', color: '#fff', border: '1px solid var(--ide-line)', padding: 6 }} value={v} onChange={(e) => commit(nodes.map((n) => n.id === selNode.id ? { ...n, parameters: { ...n.parameters, [k]: e.target.value } } : n), conns)} /></label>)}
            <button className="btn btn--sm btn--red" onClick={() => { commit(nodes.filter((n) => n.id !== selNode.id), conns.filter((c) => c.from !== selNode.name && c.to !== selNode.name)); setSel(null); }}>Delete node</button>
          </div>}
        </div>
      </div>
    </div>
  );
}

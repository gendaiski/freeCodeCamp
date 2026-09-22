/** Tiny dependency-free Markdown renderer (headings, paragraphs, lists, code, bold/italic/inline code, links). */
import { useMemo } from 'react';
function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function inline(s: string) {
  return esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>').replace(/~~([^~]+)~~/g, '<del>$1</del>').replace(/\+\+([^+]+)\+\+/g, '<ins>$1</ins>');
}
export function render(md: string): string {
  const lines = md.replace(/\r\n?/g, '\n').split('\n'); const out: string[] = []; let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    if (l.startsWith('```')) { const buf: string[] = []; i++; while (i < lines.length && !lines[i]!.startsWith('```')) buf.push(lines[i++]!); i++; out.push(`<pre><code>${esc(buf.join('\n'))}</code></pre>`); continue; }
    const h = /^(#{1,4})\s+(.*)$/.exec(l); if (h) { out.push(`<h${h[1]!.length}>${inline(h[2]!)}</h${h[1]!.length}>`); i++; continue; }
    if (/^\s*[-*]\s+/.test(l)) { const items: string[] = []; while (i < lines.length && /^\s*[-*]\s+/.test(lines[i]!)) { items.push(`<li>${inline(lines[i]!.replace(/^\s*[-*]\s+/, '').replace(/^\[( |x)\]\s*/, (m) => m.includes('x') ? '☑ ' : '☐ '))}</li>`); i++; } out.push(`<ul>${items.join('')}</ul>`); continue; }
    if (/^\s*\d+\.\s+/.test(l)) { const items: string[] = []; while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i]!)) { items.push(`<li>${inline(lines[i]!.replace(/^\s*\d+\.\s+/, ''))}</li>`); i++; } out.push(`<ol>${items.join('')}</ol>`); continue; }
    if (l.startsWith('>')) { out.push(`<blockquote>${inline(l.slice(1).trim())}</blockquote>`); i++; continue; }
    if (!l.trim()) { i++; continue; }
    const para: string[] = []; while (i < lines.length && lines[i]!.trim() && !/^(#{1,4}\s|```|\s*[-*]\s|\s*\d+\.\s|>)/.test(lines[i]!)) para.push(lines[i++]!); out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
export default function Markdown({ md, className = '' }: { md: string; className?: string }) {
  const html = useMemo(() => render(md ?? ''), [md]);
  return <div className={`md ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

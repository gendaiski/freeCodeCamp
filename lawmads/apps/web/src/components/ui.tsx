import { type ReactNode, cloneElement, isValidElement, useId } from 'react';
import { Link } from 'react-router-dom';
export const Eyebrow = ({ children, ink }: { children: ReactNode; ink?: boolean }) => <span className={`eyebrow${ink ? ' eyebrow--ink' : ''}`}>{children}</span>;
export const Spinner = () => <span className="spinner" aria-label="Loading" />;
export const Loading = ({ label = 'Loading…' }: { label?: string }) => <div className="empty"><Spinner /> {label}</div>;
export const ErrorBox = ({ error }: { error: { message: string } | null }) => (error ? <div className="alert" role="alert">{error.message}</div> : null);
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
export function Section({ children, tone, className = '', id }: { children: ReactNode; tone?: 'stone' | 'ink'; className?: string; id?: string }) {
  return <section id={id} className={`section${tone ? ` section--${tone}` : ''} ${className}`}><div className="wrap">{children}</div></section>;
}
export function SectionHead({ eyebrow, title, sub, action }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; action?: ReactNode }) {
  return <div className="section__head"><div>{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h2>{title}</h2>{sub && <p className="lead" style={{ marginTop: 12 }}>{sub}</p>}</div>{action}</div>;
}
export function PageHead({ eyebrow, title, sub, children }: { eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return <div className="pagehead"><div className="wrap">{eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}<h1 style={{ fontSize: 'clamp(32px,4.5vw,56px)' }}>{title}</h1>{sub && <p className="lead" style={{ marginTop: 14 }}>{sub}</p>}{children}</div></div>;
}
export const BackBar = ({ crumbs }: { crumbs: Array<[string, string?]> }) => (
  <div className="backbar"><div className="wrap"><Link to="/">← Back to Home</Link>{crumbs.map(([l, to], i) => <span key={i}>/ {to ? <Link to={to}>{l}</Link> : l}</span>)}</div></div>
);
export const Stat = ({ value, label, sub }: { value: ReactNode; label: ReactNode; sub?: ReactNode }) => <div className="stat"><strong>{value}</strong><span>{label}</span>{sub && <span className="red" style={{ fontWeight: 700 }}>{sub}</span>}</div>;
export const Progress = ({ pct, tone }: { pct: number; tone?: 'red' | 'green' }) => <div className={`progress${tone ? ` progress--${tone}` : ''}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} /></div>;
export const Tiles = ({ items }: { items: string[] }) => <div className="tiles">{items.slice(0, 3).map((t) => <span key={t} className="tile" title={t}>{abbr(t)}</span>)}</div>;
export function abbr(t: string) { const m: Record<string, string> = { 'Figma': 'Fg', 'Adobe PS': 'Ps', 'Adobe Photoshop': 'Ps', 'HTML5': 'H5', 'HTML': 'H5', 'SQL': 'SQL', 'AI': 'AI', 'Python': 'Py', 'R': 'R', 'JavaScript': 'JS', 'TypeScript': 'TS', 'Node.js': 'Nd', 'PostgreSQL': 'Pg', 'Maltego': 'Mt', 'OSINT': 'OS', 'WooCommerce': 'Wo', 'WordPress': 'WP', 'Anthropic': 'CL', 'n8n': 'n8n', 'Cursor': 'Cur', 'MCP': 'MCP', 'Solidity': 'Sol', 'Flutter': 'Fl', 'Dart': 'Da', 'Axure RP': 'Ax', 'Docker': 'Dk', 'Kali Linux': 'Ka', 'GitHub': 'Gh' }; return m[t] ?? t.slice(0, 2); }
export const Chips = ({ items, tone }: { items: string[]; tone?: 'ink' | 'red' | 'green' }) => <div className="pills">{items.map((i) => <span key={i} className={`chip${tone ? ` chip--${tone}` : ''}`}>{i}</span>)}</div>;
export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: Array<[T, string]>; active: T; onChange(t: T): void }) {
  return <div className="tabs" role="tablist">{tabs.map(([k, l]) => <button key={k} role="tab" aria-selected={active === k} className={`tab${active === k ? ' tab--active' : ''}`} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export function Filters<T extends string>({ items, active, onChange }: { items: Array<[T, string]>; active: T; onChange(t: T): void }) {
  return <div className="filters">{items.map(([k, l]) => <button key={k} className={`filter${active === k ? ' filter--active' : ''}`} onClick={() => onChange(k)}>{l}</button>)}</div>;
}
export const Toggle = ({ label, sub, on, onChange }: { label: string; sub?: string; on: boolean; onChange(v: boolean): void }) => (
  <div className="toggle"><div><strong>{label}</strong>{sub && <div className="muted" style={{ fontSize: 13 }}>{sub}</div>}</div><button type="button" role="switch" aria-checked={on} className="switch" onClick={() => onChange(!on)} aria-label={label} /></div>
);
export const Avatar = ({ initials, size }: { initials: string; size?: 'sm' | 'lg' }) => <span className={`avatar${size ? ` avatar--${size}` : ''}`}>{initials}</span>;
export const Toast = ({ toast }: { toast: { msg: string; kind: 'ok' | 'error' } | null }) => (toast ? <div className={`toast${toast.kind === 'error' ? ' toast--error' : ''}`} role="status">{toast.msg}</div> : null);
export const Field = ({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) => {
  const id = useId();
  // Bind the label to the single control it wraps so screen readers and test tooling can address it by name.
  const control = isValidElement<{ id?: string }>(children) && !children.props.id ? cloneElement(children, { id }) : children;
  return <div className="field"><label htmlFor={id}>{label}</label>{control}{hint && <small className="muted">{hint}</small>}</div>;
};

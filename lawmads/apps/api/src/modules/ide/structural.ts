/** Structural grading for browser (HTML) and agentic (n8n JSON, Cursor markdown) exercises. */
export interface StructuralRule { type: 'regex' | 'json'; pattern?: string; flags?: string; path?: string; min?: number; message: string; weight?: number }
export interface StructuralOutcome { name: string; passed: boolean; weight: number; detail: string }

function jsonPath(root: unknown, path: string): unknown[] {
  if (path === '$' || path === '') return [root];
  let cur: unknown[] = [root];
  for (const seg of path.split('.')) {
    const m = /^([^[]+)(\[\*\])?$/.exec(seg);
    if (!m) return [];
    const key = m[1]!, wild = Boolean(m[2]);
    const next: unknown[] = [];
    for (const c of cur) {
      if (!c || typeof c !== 'object') continue;
      const v = (c as Record<string, unknown>)[key];
      if (v === undefined) continue;
      if (wild) { if (Array.isArray(v)) next.push(...v); } else next.push(v);
    }
    cur = next;
  }
  return cur;
}

export function evaluateStructural(rules: StructuralRule[], code: string): StructuralOutcome[] {
  let parsed: unknown = undefined, parseError: string | null = null;
  const needsJson = rules.some((r) => r.type === 'json');
  if (needsJson) { try { parsed = JSON.parse(code); } catch (e) { parseError = (e as Error).message; } }
  return rules.map((r) => {
    const weight = r.weight ?? 1;
    if (r.type === 'regex') {
      const ok = new RegExp(r.pattern ?? '', r.flags ?? '').test(code);
      return { name: r.message, passed: ok, weight, detail: ok ? 'found' : 'not found' };
    }
    if (parseError) return { name: r.message, passed: false, weight, detail: `invalid JSON: ${parseError}` };
    const vals = jsonPath(parsed, r.path ?? '$');
    if (r.path === '$' || r.path === '') { const ok = parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed); return { name: r.message, passed: ok, weight, detail: ok ? 'object' : 'not an object' }; }
    if (r.pattern) { const re = new RegExp(r.pattern, r.flags ?? ''); const ok = vals.some((v) => typeof v === 'string' && re.test(v)); return { name: r.message, passed: ok, weight, detail: ok ? 'matched' : `no value at ${r.path} matches /${r.pattern}/` }; }
    if (r.min !== undefined) {
      const count = vals.reduce<number>((n, v) => n + (Array.isArray(v) ? v.length : v && typeof v === 'object' ? Object.keys(v as object).length : v === undefined ? 0 : 1), 0);
      const ok = count >= r.min;
      return { name: r.message, passed: ok, weight, detail: `${count} found, ${r.min} required` };
    }
    const ok = vals.length > 0;
    return { name: r.message, passed: ok, weight, detail: ok ? 'present' : `missing ${r.path}` };
  });
}

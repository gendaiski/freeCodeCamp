import { lazy, Suspense } from 'react';

// Monaco is bundled from node_modules (see monacoSetup.ts) rather than pulled from the
// default jsDelivr loader, so the IDE works offline, behind strict egress and under CSP.
const Monaco = lazy(async () => {
  await import('./monacoSetup');
  return import('@monaco-editor/react');
});

export default function CodeEditor({ value, onChange, language, dark = true, height = '100%', readOnly }: { value: string; onChange?(v: string): void; language: string; dark?: boolean; height?: string; readOnly?: boolean }) {
  return (
    <Suspense fallback={<div className="ide__pane" style={{ padding: 16 }}><span className="spinner" /> Loading editor…</div>}>
      <Monaco value={value} language={language} theme={dark ? 'vs-dark' : 'light'} height={height} onChange={(v) => onChange?.(v ?? '')}
        options={{ minimap: { enabled: true }, fontSize: 13, fontFamily: 'JetBrains Mono, Menlo, monospace', readOnly, automaticLayout: true, scrollBeyondLastLine: false, tabSize: 2, quickSuggestions: true, wordWrap: 'on' }} />
    </Suspense>
  );
}

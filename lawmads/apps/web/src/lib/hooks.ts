import { useEffect, useState, type DependencyList } from 'react';
import { api, ApiError } from './api';
export function useApi<T = any>(path: string | null, deps: DependencyList = []) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<ApiError | null>(null); const [loading, setLoading] = useState(Boolean(path));
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    if (!path) { setData(null); setLoading(false); return; }
    setLoading(true); setError(null);
    api<T>(path).then((d) => { if (alive) { setData(d); setLoading(false); } }).catch((e) => { if (alive) { setError(e instanceof ApiError ? e : new ApiError(0, 'network', String(e))); setLoading(false); } });
    return () => { alive = false; };
  }, [path, tick, ...deps]);
  return { data, error, loading, reload: () => setTick((t) => t + 1), setData };
}
export function useToast() {
  const [toast, setToast] = useState<{ msg: string; kind: 'ok' | 'error' } | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); }, [toast]);
  return { toast, show: (msg: string, kind: 'ok' | 'error' = 'ok') => setToast({ msg, kind }) };
}

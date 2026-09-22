/** Typed fetch wrapper: bearer access token, transparent refresh-and-retry, JSON errors. */
import type { SessionDto, UserDto } from '@lawmads/shared';

const API = (import.meta.env.VITE_API_ORIGIN as string | undefined) ?? '';
const STORE = 'lawmads.session';
export interface Stored { accessToken: string; refreshToken: string; user: UserDto }
let session: Stored | null = null;
const listeners = new Set<(s: Stored | null) => void>();
try { const raw = localStorage.getItem(STORE); if (raw) session = JSON.parse(raw); } catch { /* private mode */ }

export function getSession() { return session; }
export function setSession(s: Stored | null) { session = s; try { if (s) localStorage.setItem(STORE, JSON.stringify(s)); else localStorage.removeItem(STORE); } catch { /* ignore */ } listeners.forEach((l) => l(s)); }
export function onSession(l: (s: Stored | null) => void) { listeners.add(l); return () => { listeners.delete(l); }; }

export class ApiError extends Error { constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); } }

let refreshing: Promise<boolean> | null = null;
async function tryRefresh(): Promise<boolean> {
  if (!session?.refreshToken) return false;
  if (!refreshing) refreshing = (async () => {
    try {
      const res = await fetch(`${API}/api/v1/auth/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: session!.refreshToken }) });
      if (!res.ok) { setSession(null); return false; }
      const j = (await res.json()) as SessionDto;
      setSession({ accessToken: j.accessToken, refreshToken: j.refreshToken, user: j.user });
      return true;
    } catch { return false; } finally { refreshing = null; }
  })();
  return refreshing;
}

export async function api<T = any>(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string>; auth?: boolean } = {}): Promise<T> {
  const doFetch = () => fetch(`${API}/api/v1${path}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers: { ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(session && init.auth !== false ? { authorization: `Bearer ${session.accessToken}` } : {}), ...(init.headers ?? {}) },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined
  });
  let res = await doFetch();
  if (res.status === 401 && session && init.auth !== false && !path.startsWith('/auth/')) { if (await tryRefresh()) res = await doFetch(); }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  let body: any = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new ApiError(res.status, body?.error?.code ?? 'error', body?.error?.message ?? `Request failed (${res.status})`, body?.error?.details);
  return body as T;
}
export const get = <T = any>(path: string) => api<T>(path);
export const post = <T = any>(path: string, body: unknown = {}) => api<T>(path, { method: 'POST', body });
export const put = <T = any>(path: string, body: unknown = {}) => api<T>(path, { method: 'PUT', body });
export const patch = <T = any>(path: string, body: unknown = {}) => api<T>(path, { method: 'PATCH', body });
export const del = <T = any>(path: string) => api<T>(path, { method: 'DELETE' });

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SessionDto, UserDto } from '@lawmads/shared';
import { api, getSession, setSession, onSession, type Stored } from './api';

interface Auth { user: UserDto | null; ready: boolean; login(email: string, password: string, totp?: string): Promise<void>; register(input: Record<string, unknown>): Promise<void>; logout(): Promise<void>; refreshUser(): Promise<void>; setUser(u: UserDto): void }
const Ctx = createContext<Auth>(null as any);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Stored | null>(getSession());
  const [ready, setReady] = useState(false);
  useEffect(() => onSession(setS), []);
  useEffect(() => { (async () => { if (getSession()) { try { const me = await api<{ user: UserDto }>('/auth/me'); setSession({ ...getSession()!, user: me.user }); } catch { /* session cleared by api */ } } setReady(true); })(); }, []);
  const store = (j: SessionDto) => setSession({ accessToken: j.accessToken, refreshToken: j.refreshToken, user: j.user });
  const value: Auth = {
    user: s?.user ?? null, ready,
    async login(email, password, totp) { store(await api<SessionDto>('/auth/login', { body: { email, password, totp }, auth: false })); },
    async register(input) { store(await api<SessionDto>('/auth/register', { body: input, auth: false })); },
    async logout() { const rt = getSession()?.refreshToken; setSession(null); try { await api('/auth/logout', { body: { refreshToken: rt }, auth: false }); } catch { /* ignore */ } },
    async refreshUser() { const me = await api<{ user: UserDto }>('/auth/me'); if (getSession()) setSession({ ...getSession()!, user: me.user }); },
    setUser(u) { if (getSession()) setSession({ ...getSession()!, user: u }); }
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

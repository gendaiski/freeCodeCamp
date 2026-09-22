import { formatUsd } from '@lawmads/shared';
export const usd = (cents: number | null | undefined) => (cents === null || cents === undefined ? '—' : formatUsd(cents));
export const perMonth = (cents: number) => `${formatUsd(cents)}/mo`;
export const dateShort = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
export const dateLong = (d: string | Date) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
export const dateTime = (d: string | Date) => new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
export const mins = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
export const pct = (n: number) => `${Math.round(n)}%`;

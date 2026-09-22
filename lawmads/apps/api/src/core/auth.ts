import jwt from 'jsonwebtoken';
import type { Request, RequestHandler } from 'express';
import type { Role } from '@lawmads/shared';
import { config } from './config.js';
import { redis, ensureRedis } from './redis.js';
import { randomToken, sha256 } from './crypto.js';
import { unauthorized, forbidden } from './errors.js';

export interface Principal { id: string; roles: Role[]; email: string; name: string; plan: string }
export interface AccessClaims { sub: string; roles: Role[]; email: string; name: string; plan: string; typ: 'access' }

// eslint-disable-next-line @typescript-eslint/no-namespace -- Express type augmentation requires the namespace form
declare global { namespace Express { interface Request { user?: Principal; rawBody?: string } } }

export function signAccess(p: Principal): string {
  const claims: AccessClaims = { sub: p.id, roles: p.roles, email: p.email, name: p.name, plan: p.plan, typ: 'access' };
  return jwt.sign(claims, config.jwt.secret, { algorithm: 'HS256', expiresIn: config.jwt.accessTtl, issuer: config.jwt.issuer, audience: config.jwt.audience });
}
export function verifyAccess(token: string): Principal {
  try {
    const c = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'], issuer: config.jwt.issuer, audience: config.jwt.audience }) as AccessClaims;
    if (c.typ !== 'access') throw new Error('wrong token type');
    return { id: c.sub, roles: c.roles ?? ['student'], email: c.email, name: c.name, plan: c.plan };
  } catch { throw unauthorized('Invalid or expired token'); }
}

/** Refresh tokens: opaque, hashed in Redis with the user id, rotated on every use (replay → revoke the family). */
const rtKey = (hash: string) => `rt:${hash}`;
const inMemoryRt = new Map<string, { userId: string; family: string; exp: number }>(); // fallback when Redis is down (tests)
async function rtStore(): Promise<'redis' | 'memory'> { return (await ensureRedis()) ? 'redis' : 'memory'; }

export async function issueRefresh(userId: string, family = randomToken(12)): Promise<string> {
  const token = randomToken(48);
  const rec = { userId, family, exp: Date.now() + config.jwt.refreshTtl * 1000 };
  if ((await rtStore()) === 'redis') await redis.set(rtKey(sha256(token)), JSON.stringify(rec), 'EX', config.jwt.refreshTtl);
  else inMemoryRt.set(sha256(token), rec);
  return token;
}
export async function rotateRefresh(token: string): Promise<{ userId: string; next: string } | null> {
  const key = sha256(token);
  let rec: { userId: string; family: string; exp: number } | null = null;
  if ((await rtStore()) === 'redis') {
    const raw = await redis.get(rtKey(key));
    if (raw) { rec = JSON.parse(raw); await redis.del(rtKey(key)); }
  } else {
    rec = inMemoryRt.get(key) ?? null;
    inMemoryRt.delete(key);
  }
  if (!rec || rec.exp < Date.now()) return null;
  const next = await issueRefresh(rec.userId, rec.family);
  return { userId: rec.userId, next };
}
export async function revokeRefresh(token: string): Promise<void> {
  const key = sha256(token);
  if ((await rtStore()) === 'redis') await redis.del(rtKey(key)); else inMemoryRt.delete(key);
}

/** Phase-1 compatibility: accept an SSO token minted by the WordPress lawmads-sso plugin. */
export interface WpSsoClaims { sub: string; roles?: string[]; name?: string; email?: string; course?: string; lesson?: string; exercise?: string }
export function verifyWpSso(token: string): WpSsoClaims {
  try {
    return jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'], issuer: config.jwt.wpIssuer, audience: config.jwt.wpAudience }) as WpSsoClaims;
  } catch { throw unauthorized('Invalid SSO token'); }
}

function bearer(req: Request): string | null {
  const a = req.headers.authorization;
  if (a?.startsWith('Bearer ')) return a.slice(7).trim();
  return null;
}
export const optionalAuth: RequestHandler = (req, _res, next) => {
  const t = bearer(req);
  if (t) { try { req.user = verifyAccess(t); } catch { /* anonymous */ } }
  next();
};
export const requireAuth: RequestHandler = (req, _res, next) => {
  const t = bearer(req);
  if (!t) return next(unauthorized());
  try { req.user = verifyAccess(t); next(); } catch (e) { next(e); }
};
export const requireRole = (...roles: Role[]): RequestHandler => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.some((r) => req.user!.roles.includes(r))) return next(forbidden(`Requires role: ${roles.join(' or ')}`));
  next();
};
export const isStaff = (p?: Principal) => Boolean(p && (p.roles.includes('admin') || p.roles.includes('instructor')));

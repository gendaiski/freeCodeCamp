import type { Role, UserDto } from '@lawmads/shared';
import { one, query, withTx } from '../../core/db.js';
import { hashPassword, verifyPassword, newTotpSecret, totpVerify } from '../../core/crypto.js';
import { signAccess, issueRefresh, rotateRefresh, revokeRefresh, verifyWpSso, type Principal } from '../../core/auth.js';
import { config } from '../../core/config.js';
import { badRequest, conflict, unauthorized, notFound, tooMany } from '../../core/errors.js';
import { redis, ensureRedis } from '../../core/redis.js';
import { audit } from '../../core/audit.js';

export interface UserRow {
  id: string; email: string; first_name: string; last_name: string; display_name: string; roles: Role[]; plan: string; locale: string;
  academic_email: string | null; academic_verified: boolean; created_at: string; wp_user_id: string | null; totp_enabled: boolean; totp_secret: string | null; preferences: Record<string, unknown>; onboarding: Record<string, unknown>;
}

const ACADEMIC_TLDS = ['.edu', '.ac.uk', '.edu.eg', '.ac.ae', '.edu.sa', '.edu.qa', '.edu.om', '.edu.bh', '.nl', '.uni-', '.ac.'];
export function looksAcademic(email: string): boolean {
  const e = email.toLowerCase();
  return ACADEMIC_TLDS.some((t) => e.endsWith(t) || e.includes(t + '.')) || e.endsWith('lawmads.edu');
}

export function toDto(u: UserRow): UserDto {
  const initials = `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase() || u.email.slice(0, 2).toUpperCase();
  return {
    id: u.id, email: u.email, firstName: u.first_name, lastName: u.last_name, displayName: u.display_name || `${u.first_name} ${u.last_name}`.trim(), initials,
    roles: u.roles, plan: u.plan, isStudent: u.academic_verified, academicEmail: u.academic_email, locale: (u.locale as UserDto['locale']) ?? 'en',
    createdAt: new Date(u.created_at).toISOString(), twoFactorEnabled: u.totp_enabled
  };
}
export const principalOf = (u: UserRow): Principal => ({ id: u.id, roles: u.roles, email: u.email, name: u.display_name, plan: u.plan });

export async function getUser(id: string): Promise<UserRow | null> { return one<UserRow>('SELECT * FROM users WHERE id=$1', [id]); }
export async function getUserByEmail(email: string): Promise<UserRow | null> { return one<UserRow>('SELECT * FROM users WHERE email_lower=$1', [email.toLowerCase()]); }

export async function session(u: UserRow) {
  const accessToken = signAccess(principalOf(u));
  const refreshToken = await issueRefresh(u.id);
  return { accessToken, refreshToken, user: toDto(u), expiresIn: config.jwt.accessTtl };
}

export async function register(input: { email: string; password: string; firstName: string; lastName: string; goal?: string; jurisdictions?: string[]; plan?: string }, ip: string | null) {
  if (await getUserByEmail(input.email)) throw conflict('An account with this email already exists');
  if (input.password.length < 8) throw badRequest('Password must be at least 8 characters');
  const academic = looksAcademic(input.email);
  const plan = input.plan && ['plan_free', 'plan_pro_annual', 'plan_student_monthly'].includes(input.plan) ? input.plan : 'plan_free';
  const u = await withTx(async (c) => {
    const r = await c.query<UserRow>(
      `INSERT INTO users(email, first_name, last_name, display_name, roles, plan, academic_email, academic_verified, onboarding)
       VALUES ($1,$2,$3,$4,ARRAY['student'],$5,$6,$7,$8) RETURNING *`,
      [input.email, input.firstName, input.lastName, `${input.firstName} ${input.lastName}`.trim(), plan === 'plan_student_monthly' && !academic ? 'plan_free' : plan, academic ? input.email : null, academic, JSON.stringify({ goal: input.goal ?? null, jurisdictions: input.jurisdictions ?? [] })]
    );
    const user = r.rows[0]!;
    await c.query('INSERT INTO user_credentials(user_id, password_hash) VALUES ($1,$2)', [user.id, hashPassword(input.password)]);
    await c.query('INSERT INTO builder_credits(user_id, balance) VALUES ($1, 50) ON CONFLICT DO NOTHING', [user.id]);
    return user;
  });
  await audit(u.id, 'auth.register', u.id, { academic }, ip);
  return session(u);
}

const LOGIN_FAIL_LIMIT = 10;
const LOGIN_FAIL_WINDOW_SEC = 15 * 60;
const failMemory = new Map<string, { n: number; reset: number }>();

/** Counts failed logins per account so a distributed guesser cannot sidestep the per-IP limiter. */
async function failedLogins(emailLower: string, bump: boolean): Promise<number> {
  const key = `login-fail:${emailLower}`;
  if (await ensureRedis()) {
    if (!bump) return Number((await redis.get(key)) ?? 0);
    const n = await redis.incr(key);
    if (n === 1) await redis.expire(key, LOGIN_FAIL_WINDOW_SEC);
    return n;
  }
  const now = Date.now();
  const rec = failMemory.get(key);
  if (!rec || rec.reset < now) { if (bump) failMemory.set(key, { n: 1, reset: now + LOGIN_FAIL_WINDOW_SEC * 1000 }); return bump ? 1 : 0; }
  if (bump) rec.n++;
  return rec.n;
}
async function clearFailedLogins(emailLower: string) {
  const key = `login-fail:${emailLower}`;
  if (await ensureRedis()) await redis.del(key); else failMemory.delete(key);
}

export async function login(email: string, password: string, totp: string | undefined, ip: string | null) {
  const emailLower = email.toLowerCase();
  if (await failedLogins(emailLower, false) >= LOGIN_FAIL_LIMIT) throw tooMany('Too many failed sign-in attempts. Try again in 15 minutes.');
  const u = await getUserByEmail(email);
  const cred = u ? await one<{ password_hash: string }>('SELECT password_hash FROM user_credentials WHERE user_id=$1', [u.id]) : null;
  if (!u || !cred || !verifyPassword(password, cred.password_hash)) {
    await failedLogins(emailLower, true);
    await audit(null, 'auth.login_failed', emailLower, {}, ip);
    throw unauthorized('Invalid email or password');
  }
  if (u.totp_enabled) {
    if (!totp) throw new (await import('../../core/errors.js')).HttpError(401, 'totp_required', 'Two-factor code required');
    if (!u.totp_secret || !totpVerify(u.totp_secret, totp)) throw unauthorized('Invalid two-factor code');
  }
  await clearFailedLogins(emailLower);
  await audit(u.id, 'auth.login', u.id, {}, ip);
  return session(u);
}

export async function refresh(token: string) {
  const r = await rotateRefresh(token);
  if (!r) throw unauthorized('Invalid or expired refresh token');
  const u = await getUser(r.userId);
  if (!u) throw unauthorized('User no longer exists');
  return { accessToken: signAccess(principalOf(u)), refreshToken: r.next, user: toDto(u), expiresIn: config.jwt.accessTtl };
}
export async function logout(token: string | undefined) { if (token) await revokeRefresh(token); }

/** WordPress SSO handoff (Phase-1 bridge): provision or link the user by wp_user_id. */
export async function ssoExchange(sso: string, ip: string | null) {
  const claims = verifyWpSso(sso);
  let u = await one<UserRow>('SELECT * FROM users WHERE wp_user_id=$1', [claims.sub]);
  if (!u && claims.email) u = await getUserByEmail(claims.email);
  const roles = (claims.roles ?? ['student']).filter((r): r is Role => ['student', 'instructor', 'admin'].includes(r));
  if (!u) {
    const [first, ...rest] = (claims.name ?? 'Lawmad').split(' ');
    u = (await query<UserRow>(`INSERT INTO users(email, first_name, last_name, display_name, roles, wp_user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [claims.email ?? `wp-${claims.sub}@lawmads.local`, first, rest.join(' '), claims.name ?? 'Lawmad', roles.length ? roles : ['student'], claims.sub]))[0]!;
  } else if (!u.wp_user_id) {
    await query('UPDATE users SET wp_user_id=$1 WHERE id=$2', [claims.sub, u.id]);
  }
  await audit(u.id, 'auth.sso', u.id, { issuer: config.jwt.wpIssuer }, ip);
  const s = await session(u);
  return { ...s, context: { course: claims.course ?? null, lesson: claims.lesson ?? null, exercise: claims.exercise ?? null } };
}

export async function changePassword(userId: string, current: string, next: string) {
  const cred = await one<{ password_hash: string }>('SELECT password_hash FROM user_credentials WHERE user_id=$1', [userId]);
  if (!cred || !verifyPassword(current, cred.password_hash)) throw unauthorized('Current password is incorrect');
  if (next.length < 8) throw badRequest('Password must be at least 8 characters');
  await query('UPDATE user_credentials SET password_hash=$1, updated_at=now() WHERE user_id=$2', [hashPassword(next), userId]);
}
export async function setupTotp(userId: string) {
  const secret = newTotpSecret();
  await query('UPDATE users SET totp_secret=$1, totp_enabled=false WHERE id=$2', [secret, userId]);
  const u = await getUser(userId);
  return { secret, otpauth: `otpauth://totp/Lawmads:${encodeURIComponent(u?.email ?? userId)}?secret=${secret}&issuer=Lawmads` };
}
export async function enableTotp(userId: string, code: string) {
  const u = await getUser(userId);
  if (!u?.totp_secret) throw badRequest('Run setup first');
  if (!totpVerify(u.totp_secret, code)) throw badRequest('Invalid code');
  await query('UPDATE users SET totp_enabled=true WHERE id=$1', [userId]);
}
export async function disableTotp(userId: string) { await query('UPDATE users SET totp_enabled=false, totp_secret=NULL WHERE id=$1', [userId]); }

export async function updateProfile(userId: string, patch: { firstName?: string; lastName?: string; locale?: string; preferences?: Record<string, unknown>; academicEmail?: string | null }) {
  const u = await getUser(userId);
  if (!u) throw notFound('User');
  const first = patch.firstName ?? u.first_name, last = patch.lastName ?? u.last_name;
  const prefs = { ...u.preferences, ...(patch.preferences ?? {}) };
  let academicEmail = u.academic_email, academicVerified = u.academic_verified;
  if (patch.academicEmail !== undefined) {
    academicEmail = patch.academicEmail;
    academicVerified = Boolean(patch.academicEmail && looksAcademic(patch.academicEmail));
  }
  const r = await query<UserRow>(`UPDATE users SET first_name=$1,last_name=$2,display_name=$3,locale=$4,preferences=$5,academic_email=$6,academic_verified=$7 WHERE id=$8 RETURNING *`,
    [first, last, `${first} ${last}`.trim(), patch.locale ?? u.locale, JSON.stringify(prefs), academicEmail, academicVerified, userId]);
  return r[0]!;
}

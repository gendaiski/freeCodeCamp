import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, clientIp, param } from '../../core/http.js';
import { requireAuth } from '../../core/auth.js';
import { rateLimit } from '../../core/rateLimit.js';
import * as svc from './service.js';
import { notFound } from '../../core/errors.js';

export const authRouter = Router();
const authLimit = rateLimit({ key: 'auth', limit: 30, windowSec: 60 });

const registerSchema = z.object({
  email: z.string().email(), password: z.string().min(8).max(200), firstName: z.string().min(1).max(80), lastName: z.string().min(1).max(80),
  goal: z.string().max(40).optional(), jurisdictions: z.array(z.string().max(2)).max(9).optional(), plan: z.string().max(40).optional(), acceptTerms: z.literal(true)
});
authRouter.post('/register', authLimit, h(async (req, res) => {
  const body = parseBody(registerSchema, req);
  res.status(201).json(await svc.register(body, clientIp(req)));
}));
authRouter.post('/login', authLimit, h(async (req, res) => {
  const { email, password, totp } = parseBody(z.object({ email: z.string().email(), password: z.string().min(1), totp: z.string().length(6).optional() }), req);
  res.json(await svc.login(email, password, totp, clientIp(req)));
}));
authRouter.post('/refresh', authLimit, h(async (req, res) => {
  const { refreshToken } = parseBody(z.object({ refreshToken: z.string().min(10) }), req);
  res.json(await svc.refresh(refreshToken));
}));
authRouter.post('/logout', h(async (req, res) => {
  const { refreshToken } = parseBody(z.object({ refreshToken: z.string().optional() }), req);
  await svc.logout(refreshToken);
  res.status(204).end();
}));
/** Phase-1 contract: POST /auth/session { sso } → access + refresh + context. Kept as an alias of /auth/sso. */
const sso = h(async (req, res) => {
  const { sso } = parseBody(z.object({ sso: z.string().min(10) }), req);
  res.json(await svc.ssoExchange(sso, clientIp(req)));
});
authRouter.post('/sso', authLimit, sso);
authRouter.post('/session', authLimit, sso);

authRouter.get('/me', requireAuth, h(async (req, res) => {
  const u = await svc.getUser(req.user!.id);
  if (!u) throw notFound('User');
  res.json({ user: svc.toDto(u), preferences: u.preferences, onboarding: u.onboarding });
}));
authRouter.patch('/me', requireAuth, h(async (req, res) => {
  const patch = parseBody(z.object({ firstName: z.string().min(1).max(80).optional(), lastName: z.string().min(1).max(80).optional(), locale: z.enum(['en', 'ar', 'fr']).optional(), preferences: z.record(z.unknown()).optional(), academicEmail: z.string().email().nullable().optional() }), req);
  const u = await svc.updateProfile(req.user!.id, patch);
  res.json({ user: svc.toDto(u), preferences: u.preferences });
}));
authRouter.post('/password', requireAuth, h(async (req, res) => {
  const { current, next } = parseBody(z.object({ current: z.string(), next: z.string().min(8) }), req);
  await svc.changePassword(req.user!.id, current, next);
  res.status(204).end();
}));
authRouter.post('/2fa/setup', requireAuth, h(async (req, res) => { res.json(await svc.setupTotp(req.user!.id)); }));
authRouter.post('/2fa/enable', requireAuth, h(async (req, res) => { const { code } = parseBody(z.object({ code: z.string().length(6) }), req); await svc.enableTotp(req.user!.id, code); res.status(204).end(); }));
authRouter.post('/2fa/disable', requireAuth, h(async (req, res) => { await svc.disableTotp(req.user!.id); res.status(204).end(); }));
/** OAuth: returns provider availability + the authorisation URL when configured (client registration is deployment-specific). */
authRouter.get('/oauth/:provider/start', h(async (req, res) => {
  const p = param(req, 'provider');
  const cfg = p === 'google' ? { id: process.env.GOOGLE_CLIENT_ID, url: 'https://accounts.google.com/o/oauth2/v2/auth' } : p === 'microsoft' ? { id: process.env.MICROSOFT_CLIENT_ID, url: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize' } : null;
  if (!cfg) throw notFound('Provider');
  if (!cfg.id) { res.json({ configured: false, message: `${p} sign-in is not configured on this deployment` }); return; }
  const redirect = `${process.env.PUBLIC_API_ORIGIN ?? ''}/api/v1/auth/oauth/${p}/callback`;
  res.json({ configured: true, url: `${cfg.url}?client_id=${encodeURIComponent(cfg.id)}&redirect_uri=${encodeURIComponent(redirect)}&response_type=code&scope=openid%20email%20profile` });
}));

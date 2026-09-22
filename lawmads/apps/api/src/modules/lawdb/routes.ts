import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param } from '../../core/http.js';
import { requireAuth } from '../../core/auth.js';
import { rateLimit } from '../../core/rateLimit.js';
import { config } from '../../core/config.js';
import * as svc from './service.js';

export const lawRouter = Router();
lawRouter.get('/', h(async (_req, res) => { res.json({ ...(await svc.overview()), api: svc.snippets(config.publicApiOrigin) }); }));
lawRouter.get('/search', rateLimit({ key: 'law', limit: 120, windowSec: 60 }), h(async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const apiKey = req.header('x-api-key');
  if (apiKey) await svc.authenticateApiKey(apiKey);
  res.json(await svc.search({ q, jurisdiction: typeof req.query.jurisdiction === 'string' ? req.query.jurisdiction : undefined, kind: typeof req.query.kind === 'string' ? req.query.kind : undefined, limit: Number(req.query.limit) || 20, offset: Number(req.query.offset) || 0 }));
}));
lawRouter.post('/semantic', rateLimit({ key: 'law', limit: 60, windowSec: 60 }), h(async (req, res) => { const b = parseBody(z.object({ q: z.string().min(1), jurisdiction: z.string().optional() }), req); res.json(await svc.search({ q: b.q, jurisdiction: b.jurisdiction, limit: 5 })); }));
lawRouter.get('/instruments', h(async (req, res) => { res.json({ instruments: await svc.instruments(typeof req.query.jurisdiction === 'string' ? req.query.jurisdiction : undefined) }); }));
lawRouter.get('/articles/:id', h(async (req, res) => { res.json(await svc.article(param(req, 'id'))); }));
lawRouter.get('/api-keys', requireAuth, h(async (req, res) => { res.json({ keys: await svc.listApiKeys(req.user!.id) }); }));
lawRouter.post('/api-keys', requireAuth, h(async (req, res) => { const { tier } = parseBody(z.object({ tier: z.enum(['research', 'professional', 'api']).default('research') }), req); res.status(201).json(await svc.createApiKey(req.user!.id, tier)); }));
lawRouter.delete('/api-keys/:id', requireAuth, h(async (req, res) => { res.json(await svc.revokeApiKey(req.user!.id, param(req, 'id'))); }));

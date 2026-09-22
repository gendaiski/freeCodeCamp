import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody } from '../../core/http.js';
import { requireAuth, optionalAuth } from '../../core/auth.js';
import { rateLimit } from '../../core/rateLimit.js';
import * as svc from './service.js';

export const aiRouter = Router();
aiRouter.get('/models', h(async (_req, res) => { res.json(await svc.models()); }));
aiRouter.post('/generate', optionalAuth, rateLimit({ key: 'ai', limit: 30, windowSec: 60 }), h(async (req, res) => {
  const b = parseBody(z.object({ model: z.string(), prompt: z.string().min(1).max(20_000), language: z.enum(['en', 'ar', 'fr']).optional(), jurisdiction: z.string().max(2).optional(), context: z.record(z.unknown()).optional() }), req);
  res.json(await svc.generate(req.user?.id ?? null, b));
}));
aiRouter.get('/history', requireAuth, h(async (req, res) => { res.json({ generations: await svc.history(req.user!.id) }); }));

import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param } from '../../core/http.js';
import { requireAuth, optionalAuth } from '../../core/auth.js';
import * as svc from './service.js';

export const builderRouter = Router();
builderRouter.get('/options', optionalAuth, h(async (req, res) => { res.json(await svc.options(req.user?.id)); }));
builderRouter.get('/projects', requireAuth, h(async (req, res) => { res.json({ projects: await svc.list(req.user!.id) }); }));
builderRouter.post('/projects', requireAuth, h(async (req, res) => {
  const b = parseBody(z.object({ brief: z.string().min(10).max(4000), style: z.string(), languages: z.array(z.enum(['en', 'ar', 'fr'])).min(1).default(['en', 'ar']), models: z.record(z.string()).default({}), name: z.string().max(80).optional() }), req);
  res.status(201).json(await svc.create(req.user!.id, b));
}));
builderRouter.get('/projects/:id', requireAuth, h(async (req, res) => { res.json(await svc.get(req.user!.id, param(req, 'id'))); }));
builderRouter.post('/projects/:id/generate', requireAuth, h(async (req, res) => { res.json(await svc.generate(req.user!.id, param(req, 'id'))); }));
builderRouter.put('/projects/:id/pages', requireAuth, h(async (req, res) => { const { pages } = parseBody(z.object({ pages: z.array(z.unknown()).max(50) }), req); res.json(await svc.updatePages(req.user!.id, param(req, 'id'), pages)); }));
builderRouter.post('/projects/:id/publish', requireAuth, h(async (req, res) => { const { domain } = parseBody(z.object({ domain: z.string().min(4).max(120) }), req); res.json(await svc.publish(req.user!.id, param(req, 'id'), domain)); }));
builderRouter.get('/projects/:id/export', requireAuth, h(async (req, res) => { res.json(await svc.exportHtml(req.user!.id, param(req, 'id'))); }));

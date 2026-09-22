import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param, clientIp } from '../../core/http.js';
import { requireAuth, optionalAuth } from '../../core/auth.js';
import { rateLimit } from '../../core/rateLimit.js';
import * as svc from './service.js';

export const badgesRouter = Router();
badgesRouter.get('/', optionalAuth, h(async (req, res) => { res.json({ jurisdictions: await svc.jurisdictions(), ...(await svc.ladderOverview(req.user?.id)) }); }));
badgesRouter.get('/ladder', optionalAuth, h(async (req, res) => { res.json(await svc.ladderOverview(req.user?.id)); }));
badgesRouter.get('/:code', optionalAuth, h(async (req, res) => { res.json(await svc.jurisdiction(param(req, 'code'), req.user?.id)); }));
badgesRouter.post('/:code/book', requireAuth, h(async (req, res) => { const { sittingId } = parseBody(z.object({ sittingId: z.string().uuid().nullable().optional() }), req); res.status(201).json(await svc.book(req.user!.id, param(req, 'code'), sittingId ?? null)); }));
badgesRouter.get('/:code/paper', requireAuth, h(async (req, res) => { res.json(await svc.paper(req.user!.id, param(req, 'code'))); }));
badgesRouter.post('/:code/sit', requireAuth, h(async (req, res) => { const { answers } = parseBody(z.object({ answers: z.record(z.string()) }), req); res.json(await svc.sit(req.user!.id, param(req, 'code'), answers)); }));

export const verifyRouter = Router();
verifyRouter.get('/:id', rateLimit({ key: 'verify', limit: 60, windowSec: 60 }), h(async (req, res) => { res.json(await svc.verify(param(req, 'id'), clientIp(req), req.headers['user-agent'] ?? null)); }));

export const certificatesRouter = Router();
certificatesRouter.get('/:id/download', requireAuth, h(async (req, res) => { res.json(await svc.certificatePdfData(req.user!.id, param(req, 'id'))); }));

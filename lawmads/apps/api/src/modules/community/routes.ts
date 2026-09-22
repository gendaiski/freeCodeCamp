import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param } from '../../core/http.js';
import { requireAuth, optionalAuth } from '../../core/auth.js';
import { rateLimit } from '../../core/rateLimit.js';
import * as svc from './service.js';

export const communityRouter = Router();
communityRouter.get('/', optionalAuth, h(async (req, res) => { res.json(await svc.overview(req.user?.id)); }));
communityRouter.get('/posts', optionalAuth, h(async (req, res) => { res.json({ posts: await svc.feed(req.user?.id, typeof req.query.chapter === 'string' ? req.query.chapter : undefined) }); }));
communityRouter.get('/posts/:id', optionalAuth, h(async (req, res) => { res.json(await svc.post(param(req, 'id'), req.user?.id)); }));
communityRouter.post('/chapters/:slug/join', requireAuth, h(async (req, res) => { res.json(await svc.join(req.user!.id, param(req, 'slug'))); }));
communityRouter.post('/posts', requireAuth, rateLimit({ key: 'post', limit: 20, windowSec: 3600, byUser: true }), h(async (req, res) => {
  const b = parseBody(z.object({ chapter: z.string(), title: z.string().min(3).max(140), body: z.string().max(5000), linkLabel: z.string().max(60).optional(), linkKind: z.enum(['ide', 'figma', 'dataset', 'vote', 'url']).optional(), linkRef: z.string().max(300).optional() }), req);
  res.status(201).json(await svc.createPost(req.user!.id, req.user!.name, b));
}));
communityRouter.post('/posts/:id/vote', requireAuth, h(async (req, res) => { res.json(await svc.vote(req.user!.id, param(req, 'id'))); }));
communityRouter.post('/posts/:id/comments', requireAuth, h(async (req, res) => { const { body } = parseBody(z.object({ body: z.string().min(1).max(3000) }), req); res.status(201).json(await svc.comment(req.user!.id, req.user!.name, param(req, 'id'), body)); }));
communityRouter.post('/designs/:id/vote', requireAuth, h(async (req, res) => { res.json(await svc.voteDesign(req.user!.id, param(req, 'id'))); }));
communityRouter.post('/designs', requireAuth, h(async (req, res) => { const b = parseBody(z.object({ title: z.string().min(2).max(80), imageUrl: z.string().url().optional() }), req); res.status(201).json(await svc.submitDesign(req.user!.id, req.user!.name, b.title, b.imageUrl)); }));

export const shopRouter = Router();
shopRouter.get('/products', h(async (_req, res) => { res.json({ products: await svc.products() }); }));

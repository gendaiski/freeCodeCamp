import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param } from '../../core/http.js';
import { requireAuth } from '../../core/auth.js';
import * as svc from './service.js';

export const workspaceRouter = Router();
workspaceRouter.use(requireAuth);
workspaceRouter.get('/documents', h(async (req, res) => { res.json({ documents: await svc.list(req.user!.id), templates: svc.TEMPLATES, clauses: svc.CLAUSE_BANK }); }));
workspaceRouter.post('/documents', h(async (req, res) => { const b = parseBody(z.object({ title: z.string().min(1).max(200), governingLaw: z.string().length(2).optional(), languageMode: z.enum(['en', 'ar', 'bi']).optional(), template: z.string().optional() }), req); res.status(201).json(await svc.create(req.user!.id, b)); }));
workspaceRouter.get('/documents/:id', h(async (req, res) => { res.json(await svc.get(req.user!.id, param(req, 'id'))); }));
const clause = z.object({ id: z.string(), heading: z.string().max(200), text_en: z.string().max(20000), text_ar: z.string().max(20000) });
workspaceRouter.put('/documents/:id', h(async (req, res) => { const b = parseBody(z.object({ title: z.string().max(200).optional(), content: z.array(clause).max(500).optional(), languageMode: z.enum(['en', 'ar', 'bi']).optional(), governingLaw: z.string().length(2).optional() }), req); res.json(await svc.save(req.user!.id, param(req, 'id'), b)); }));
workspaceRouter.post('/documents/:id/revert', h(async (req, res) => { const { version } = parseBody(z.object({ version: z.number().int().min(1) }), req); res.json(await svc.revert(req.user!.id, param(req, 'id'), version)); }));
workspaceRouter.post('/documents/:id/authorities', h(async (req, res) => { const b = parseBody(z.object({ clauseId: z.string(), articleId: z.string() }), req); res.status(201).json(await svc.insertAuthority(req.user!.id, param(req, 'id'), b.clauseId, b.articleId)); }));
workspaceRouter.delete('/documents/:id/authorities/:aid', h(async (req, res) => { res.json(await svc.removeAuthority(req.user!.id, param(req, 'id'), param(req, 'aid'))); }));
workspaceRouter.post('/documents/:id/assist', h(async (req, res) => { const b = parseBody(z.object({ action: z.enum(['explain', 'find-authority', 'redline', 'arabic', 'risk-scan']), clauseId: z.string().optional(), prompt: z.string().max(2000).optional() }), req); res.json(await svc.assist(req.user!.id, param(req, 'id'), b.action, b.clauseId, b.prompt)); }));
workspaceRouter.get('/documents/:id/export', h(async (req, res) => { res.json(await svc.exportDoc(req.user!.id, param(req, 'id'), req.query.format === 'docx' ? 'docx' : 'md')); }));

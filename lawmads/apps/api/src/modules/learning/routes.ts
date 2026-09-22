import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param } from '../../core/http.js';
import { requireAuth } from '../../core/auth.js';
import * as svc from './service.js';

export const meRouter = Router();
meRouter.use(requireAuth);
meRouter.get('/dashboard', h(async (req, res) => { res.json(await svc.dashboard(req.user!.id)); }));
meRouter.get('/transcript', h(async (req, res) => { res.json(await svc.transcript(req.user!.id)); }));
meRouter.get('/week', h(async (req, res) => { res.json(await svc.weekPlan(req.user!.id)); }));
meRouter.post('/enrollments', h(async (req, res) => { const { programCode } = parseBody(z.object({ programCode: z.string().min(2).max(12) }), req); res.status(201).json(await svc.enroll(req.user!.id, programCode)); }));
meRouter.post('/courses/:slug/enroll', h(async (req, res) => { res.status(201).json(await svc.enrollCourse(req.user!.id, param(req, 'slug'))); }));
meRouter.post('/items/:id/complete', h(async (req, res) => { res.json(await svc.completeItem(req.user!.id, param(req, 'id'))); }));
meRouter.post('/quizzes/:slug/attempts', h(async (req, res) => { const { answers } = parseBody(z.object({ answers: z.record(z.string().max(1)) }), req); res.json(await svc.attemptQuiz(req.user!.id, param(req, 'slug'), answers)); }));

import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param } from '../../core/http.js';
import { requireAuth, optionalAuth } from '../../core/auth.js';
import { requireServiceSignature } from '../../core/hmac.js';
import { rateLimit } from '../../core/rateLimit.js';
import { Judge0Executor } from './executor.js';
import { dispatch, resolveTest } from './grading.js';
import * as svc from './service.js';
import { badRequest } from '../../core/errors.js';

export const ideRouter = Router();
const runLimit = rateLimit({ key: 'run', limit: 60, windowSec: 60, byUser: true });

ideRouter.get('/languages', optionalAuth, h(async (req, res) => { res.json(await svc.listLanguages(req.user?.id)); }));
ideRouter.get('/exercises', optionalAuth, h(async (req, res) => { res.json({ exercises: await svc.listExercises(typeof req.query.language === 'string' ? req.query.language : undefined, req.user) }); }));
ideRouter.get('/exercises/:id', optionalAuth, h(async (req, res) => { res.json(await svc.studentProjection(await svc.getExercise(param(req, 'id')), req.user)); }));
ideRouter.get('/exercises/:id/hint', requireAuth, h(async (req, res) => { res.json(await svc.hint(await svc.getExercise(param(req, 'id')), Number(req.query.level ?? 0))); }));
ideRouter.get('/exercises/:id/solution', requireAuth, h(async (req, res) => { res.json(await svc.solution(await svc.getExercise(param(req, 'id')), req.user!)); }));

const runSchema = z.object({ exerciseId: z.string().min(1), code: z.string().max(200_000), stdin: z.string().max(20_000).optional() });
export const runHandler = h(async (req, res) => {
  const b = parseBody(runSchema, req);
  res.json(await svc.run(await svc.getExercise(b.exerciseId), b.code, b.stdin ?? '', req.user!));
});
export const submitHandler = h(async (req, res) => {
  const b = parseBody(z.object({ exerciseId: z.string().min(1), code: z.string().max(200_000) }), req);
  res.status(202).json(await svc.submit(await svc.getExercise(b.exerciseId), b.code, req.user!));
});
export const getSubmissionHandler = h(async (req, res) => { res.json(await svc.getSubmission(param(req, 'id'), req.user!)); });

ideRouter.post('/run', requireAuth, runLimit, runHandler);
ideRouter.post('/submissions', requireAuth, runLimit, submitHandler);
ideRouter.get('/submissions/:id', requireAuth, getSubmissionHandler);

/** Judge0 async webhook (PUT per Judge0; POST accepted). `st` = submission_test id. Idempotent. */
const callback = h(async (req, res) => {
  const st = typeof req.query.st === 'string' ? req.query.st : '';
  if (!/^[0-9a-f-]{36}$/i.test(st)) throw badRequest('Missing st');
  await resolveTest(st, Judge0Executor.toResult(req.body ?? {}));
  res.json({ ok: true });
});
ideRouter.put('/judge0/callback', callback);
ideRouter.post('/judge0/callback', callback);

/** Phase-1 internal contract: HMAC-signed dispatch of a persisted submission. */
ideRouter.post('/internal/dispatch', requireServiceSignature, h(async (req, res) => {
  const { submissionId } = parseBody(z.object({ submissionId: z.string().uuid() }), req);
  await dispatch(submissionId);
  res.status(202).json({ dispatched: true });
}));

/** Phase-1 playground-web contract aliases (mounted at /api/v1). */
export const ideCompatRouter = Router();
ideCompatRouter.get('/exercises', optionalAuth, h(async (req, res) => { res.json({ exercises: await svc.listExercises(undefined, req.user) }); }));
ideCompatRouter.get('/exercises/:id', optionalAuth, h(async (req, res) => { res.json(await svc.studentProjection(await svc.getExercise(param(req, 'id')), req.user)); }));
ideCompatRouter.get('/exercises/:id/solution', requireAuth, h(async (req, res) => { res.json(await svc.solution(await svc.getExercise(param(req, 'id')), req.user!)); }));
ideCompatRouter.post('/run', requireAuth, runLimit, runHandler);
ideCompatRouter.post('/submissions', requireAuth, runLimit, submitHandler);
ideCompatRouter.get('/submissions/:id', requireAuth, getSubmissionHandler);
ideCompatRouter.put('/judge0/callback', callback);
ideCompatRouter.post('/internal/dispatch', requireServiceSignature, h(async (req, res) => { const { submissionId } = parseBody(z.object({ submissionId: z.string().uuid() }), req); await dispatch(submissionId); res.status(202).json({ dispatched: true }); }));

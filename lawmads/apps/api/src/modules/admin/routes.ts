import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param, paging } from '../../core/http.js';
import { requireAuth, requireRole } from '../../core/auth.js';
import { one, query, withTx } from '../../core/db.js';
import { notFound } from '../../core/errors.js';
import { audit } from '../../core/audit.js';
import { issueCertificate } from '../credentials/service.js';
import { LANGUAGES } from '@lawmads/shared';

export const adminRouter = Router();
adminRouter.use(requireAuth, requireRole('admin', 'instructor'));

// --- Exercises (Phase-1 admin-api contract, widened to all languages) ---
const testCase = z.object({ id: z.string().uuid().optional(), name: z.string().max(80).default('case'), input: z.string().max(20000).default(''), expected_output: z.string().max(20000).default(''), weight: z.number().min(0).max(100).default(1), hidden: z.boolean().default(true), ordinal: z.number().int().default(0) });
const exerciseInput = z.object({
  title: z.string().min(1).max(160), language: z.string().refine((s) => LANGUAGES.some((l) => l.slug === s), 'unknown language'), slug: z.string().regex(/^[a-z0-9-]+$/).max(60).optional(), ordinal: z.number().int().min(1).max(20).optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'), instructions_md: z.string().max(50000).default(''), checks: z.array(z.string().max(200)).max(20).default([]),
  starter_code: z.string().max(200000).default(''), solution_code: z.string().max(200000).default(''), hints: z.array(z.string().max(500)).max(10).default([]), structural_rules: z.array(z.record(z.unknown())).max(30).default([]),
  time_limit_sec: z.number().min(0.5).max(30).nullable().optional(), memory_limit_kb: z.number().int().min(16000).max(512000).nullable().optional(), reveal_solution_after: z.number().int().min(0).max(20).default(3),
  feedback: z.record(z.string()).default({}), tech_credits: z.number().int().min(0).max(50).default(3), published: z.boolean().default(false), course_ref: z.string().nullable().optional(), lesson_ref: z.string().nullable().optional(), test_cases: z.array(testCase).max(50).optional()
});
adminRouter.get('/exercises', h(async (req, res) => {
  const { limit, offset } = paging(req, { limit: 100, max: 500 });
  res.json({ exercises: await query(`SELECT e.id, e.slug, e.title, e.language, e.ordinal, e.difficulty, e.published, e.tech_credits, e.updated_at, (SELECT COUNT(*)::int FROM test_cases t WHERE t.exercise_id=e.id) AS test_case_count, (SELECT COUNT(*)::int FROM submissions s WHERE s.exercise_id=e.id) AS submissions FROM exercises e ORDER BY e.language, e.ordinal LIMIT $1 OFFSET $2`, [limit, offset]) });
}));
adminRouter.get('/exercises/:id', h(async (req, res) => {
  const e = await one<any>('SELECT * FROM exercises WHERE id::text=$1 OR slug=$1', [param(req, 'id')]);
  if (!e) throw notFound('Exercise');
  res.json({ ...e, test_cases: await query('SELECT * FROM test_cases WHERE exercise_id=$1 ORDER BY ordinal', [e.id]) });
}));
adminRouter.post('/exercises', h(async (req, res) => {
  const b = parseBody(exerciseInput, req);
  const slug = b.slug ?? `${b.language}-${Date.now().toString(36)}`;
  const row = await withTx(async (c) => {
    const r = await c.query(`INSERT INTO exercises(slug,title,language,ordinal,difficulty,instructions_md,checks,starter_code,solution_code,hints,structural_rules,time_limit_sec,memory_limit_kb,reveal_solution_after,feedback,tech_credits,published,course_ref,lesson_ref,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) RETURNING *`,
      [slug, b.title, b.language, b.ordinal ?? 1, b.difficulty, b.instructions_md, JSON.stringify(b.checks), b.starter_code, b.solution_code, JSON.stringify(b.hints), JSON.stringify(b.structural_rules), b.time_limit_sec ?? null, b.memory_limit_kb ?? null, b.reveal_solution_after, JSON.stringify(b.feedback), b.tech_credits, b.published, b.course_ref ?? null, b.lesson_ref ?? null, req.user!.id]);
    for (const [i, t] of (b.test_cases ?? []).entries()) await c.query('INSERT INTO test_cases(exercise_id,name,input,expected_output,weight,hidden,ordinal) VALUES ($1,$2,$3,$4,$5,$6,$7)', [r.rows[0].id, t.name, t.input, t.expected_output, t.weight, t.hidden, t.ordinal ?? i]);
    return r.rows[0];
  });
  await audit(req.user!.id, 'exercise.create', row.id, { slug });
  res.status(201).json(row);
}));
adminRouter.put('/exercises/:id', h(async (req, res) => {
  const b = parseBody(exerciseInput.partial(), req);
  const e = await one<any>('SELECT * FROM exercises WHERE id::text=$1 OR slug=$1', [param(req, 'id')]);
  if (!e) throw notFound('Exercise');
  const m = { ...e, ...b };
  const r = await query(`UPDATE exercises SET title=$2,language=$3,ordinal=$4,difficulty=$5,instructions_md=$6,checks=$7,starter_code=$8,solution_code=$9,hints=$10,structural_rules=$11,time_limit_sec=$12,memory_limit_kb=$13,reveal_solution_after=$14,feedback=$15,tech_credits=$16,published=$17,course_ref=$18,lesson_ref=$19 WHERE id=$1 RETURNING *`,
    [e.id, m.title, m.language, m.ordinal, m.difficulty, m.instructions_md, JSON.stringify(m.checks), m.starter_code, m.solution_code, JSON.stringify(m.hints), JSON.stringify(m.structural_rules), m.time_limit_sec ?? null, m.memory_limit_kb ?? null, m.reveal_solution_after, JSON.stringify(m.feedback), m.tech_credits, m.published, m.course_ref ?? null, m.lesson_ref ?? null]);
  await audit(req.user!.id, 'exercise.update', e.id, {});
  res.json(r[0]);
}));
adminRouter.delete('/exercises/:id', requireRole('admin'), h(async (req, res) => { await query('DELETE FROM exercises WHERE id::text=$1 OR slug=$1', [param(req, 'id')]); await audit(req.user!.id, 'exercise.delete', param(req, 'id'), {}); res.status(204).end(); }));
adminRouter.post('/exercises/:id/publish', h(async (req, res) => { const r = await query('UPDATE exercises SET published=true WHERE id::text=$1 OR slug=$1 RETURNING id, published', [param(req, 'id')]); if (!r.length) throw notFound('Exercise'); res.json(r[0]); }));
adminRouter.post('/exercises/:id/unpublish', h(async (req, res) => { const r = await query('UPDATE exercises SET published=false WHERE id::text=$1 OR slug=$1 RETURNING id, published', [param(req, 'id')]); if (!r.length) throw notFound('Exercise'); res.json(r[0]); }));
adminRouter.post('/exercises/:id/test-cases', h(async (req, res) => {
  const t = parseBody(testCase, req);
  const e = await one<any>('SELECT id FROM exercises WHERE id::text=$1 OR slug=$1', [param(req, 'id')]);
  if (!e) throw notFound('Exercise');
  const r = await query('INSERT INTO test_cases(exercise_id,name,input,expected_output,weight,hidden,ordinal) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *', [e.id, t.name, t.input, t.expected_output, t.weight, t.hidden, t.ordinal]);
  res.status(201).json(r[0]);
}));
adminRouter.put('/test-cases/:tcId', h(async (req, res) => { const t = parseBody(testCase, req); const r = await query('UPDATE test_cases SET name=$2,input=$3,expected_output=$4,weight=$5,hidden=$6,ordinal=$7 WHERE id=$1 RETURNING *', [param(req, 'tcId'), t.name, t.input, t.expected_output, t.weight, t.hidden, t.ordinal]); if (!r.length) throw notFound('Test case'); res.json(r[0]); }));
adminRouter.delete('/test-cases/:tcId', h(async (req, res) => { await query('DELETE FROM test_cases WHERE id=$1', [param(req, 'tcId')]); res.status(204).end(); }));

// --- Users, programs, capstones, audit, stats ---
adminRouter.get('/stats', h(async (_req, res) => {
  const s = await one<any>(`SELECT (SELECT COUNT(*)::int FROM users) AS users, (SELECT COUNT(*)::int FROM users WHERE plan<>'plan_free') AS paying, (SELECT COUNT(*)::int FROM enrollments WHERE status='active') AS active_enrollments,
    (SELECT COUNT(*)::int FROM submissions WHERE created_at > now() - interval '30 days') AS submissions_30d, (SELECT COUNT(*)::int FROM certificates) AS certificates, (SELECT COUNT(*)::int FROM badges_earned) AS badges,
    (SELECT COALESCE(SUM(total_cents),0)::int FROM orders WHERE status='paid' AND paid_at > now() - interval '30 days') AS revenue_30d_cents, (SELECT COUNT(*)::int FROM bookings WHERE status='booked') AS bookings, (SELECT COUNT(*)::int FROM events WHERE processed_at IS NULL) AS pending_events`);
  res.json(s);
}));
adminRouter.get('/users', h(async (req, res) => { const { limit, offset } = paging(req); const q = typeof req.query.q === 'string' ? `%${req.query.q}%` : '%'; res.json({ users: await query(`SELECT id, email, display_name, roles, plan, academic_verified, created_at FROM users WHERE email ILIKE $1 OR display_name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, [q, limit, offset]) }); }));
adminRouter.patch('/users/:id', requireRole('admin'), h(async (req, res) => { const b = parseBody(z.object({ roles: z.array(z.enum(['student', 'instructor', 'admin'])).optional(), plan: z.string().optional() }), req); const r = await query('UPDATE users SET roles=COALESCE($2, roles), plan=COALESCE($3, plan) WHERE id=$1 RETURNING id, roles, plan', [param(req, 'id'), b.roles ?? null, b.plan ?? null]); if (!r.length) throw notFound('User'); await audit(req.user!.id, 'user.update', param(req, 'id'), b); res.json(r[0]); }));
adminRouter.get('/programs', h(async (_req, res) => { res.json({ programs: await query(`SELECT p.code, p.name, p.track_slug, p.kind, p.published, p.price_cents, (SELECT COUNT(*)::int FROM enrollments e WHERE e.program_code=p.code) AS enrollments FROM programs p ORDER BY p.ordinal`) }); }));
adminRouter.patch('/programs/:code', h(async (req, res) => { const b = parseBody(z.object({ published: z.boolean().optional(), price_cents: z.number().int().min(0).optional(), featured: z.boolean().optional(), tagline: z.string().max(200).optional() }), req); const r = await query('UPDATE programs SET published=COALESCE($2,published), price_cents=COALESCE($3,price_cents), featured=COALESCE($4,featured), tagline=COALESCE($5,tagline) WHERE code=upper($1) RETURNING code, published, price_cents, featured', [param(req, 'code'), b.published ?? null, b.price_cents ?? null, b.featured ?? null, b.tagline ?? null]); if (!r.length) throw notFound('Program'); res.json(r[0]); }));
/** Instructor review of a capstone: marks the item done with a score and triggers certificate issuance. */
adminRouter.post('/capstones/review', h(async (req, res) => {
  const b = parseBody(z.object({ userId: z.string().uuid(), programCode: z.string(), score: z.number().min(0).max(100), feedback: z.string().max(4000).optional() }), req);
  const item = await one<any>(`SELECT ci.id FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE pt.program_code=upper($1) AND ci.kind='capstone' LIMIT 1`, [b.programCode]);
  if (!item) throw notFound('Capstone');
  await withTx(async (c) => {
    await c.query(`INSERT INTO item_progress(user_id, item_id, status, score, completed_at) VALUES ($1,$2,'done',$3,now()) ON CONFLICT (user_id, item_id) DO UPDATE SET status='done', score=EXCLUDED.score, completed_at=now()`, [b.userId, item.id, b.score]);
    for (const kind of ['tech', 'law'] as const) await c.query(`INSERT INTO credit_ledger(user_id,kind,amount,source_type,source_id,program_code,title,score_label,item_kind) VALUES ($1,$2,8,'capstone',$3,upper($3),$4,$5,'Capstone') ON CONFLICT DO NOTHING`, [b.userId, kind, b.programCode, `${b.programCode.toUpperCase()}® Capstone`, `${Math.round(b.score)}%`]);
  });
  let issued: { issued: boolean; verificationId?: string } = { issued: false };
  if (b.score >= 70) { try { issued = await issueCertificate(b.userId, b.programCode.toUpperCase(), b.score, req.user!.id); } catch { issued = { issued: false }; } }
  await audit(req.user!.id, 'capstone.review', `${b.userId}:${b.programCode}`, { score: b.score });
  res.json({ reviewed: true, ...issued });
}));
adminRouter.post('/certificates/:vid/revoke', requireRole('admin'), h(async (req, res) => { const { reason } = parseBody(z.object({ reason: z.string().min(3).max(500) }), req); const r = await query('UPDATE certificates SET revoked=true, revoked_reason=$2 WHERE verification_id=upper($1) RETURNING verification_id', [param(req, 'vid'), reason]); if (!r.length) throw notFound('Certificate'); await audit(req.user!.id, 'certificate.revoke', param(req, 'vid'), { reason }); res.json({ revoked: true }); }));
adminRouter.get('/audit', h(async (req, res) => { const { limit, offset } = paging(req, { limit: 50, max: 500 }); res.json({ entries: await query('SELECT id, actor, action, target, meta, ip, created_at FROM audit_log ORDER BY id DESC LIMIT $1 OFFSET $2', [limit, offset]) }); }));
adminRouter.get('/bookings', h(async (_req, res) => { res.json({ bookings: await query('SELECT * FROM bookings ORDER BY slot DESC LIMIT 200') }); }));
adminRouter.get('/flags', h(async (_req, res) => { res.json({ flags: await query('SELECT key, value FROM feature_flags ORDER BY key') }); }));
adminRouter.put('/flags/:key', requireRole('admin'), h(async (req, res) => { const { value } = parseBody(z.object({ value: z.unknown() }), req); await query('INSERT INTO feature_flags(key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value', [param(req, 'key'), JSON.stringify(value)]); res.json({ key: param(req, 'key'), value }); }));

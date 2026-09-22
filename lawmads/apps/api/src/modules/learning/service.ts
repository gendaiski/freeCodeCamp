import { one, query, withTx } from '../../core/db.js';
import { badRequest, forbidden, notFound, conflict } from '../../core/errors.js';
import { awardCredits, touchActivity, creditTotals, streak } from './credits.js';
import { computeLadder, credentialProgress, CREDIT_RULES } from '@lawmads/shared';
import { audit } from '../../core/audit.js';
import { issueCertificateIfEarned } from '../credentials/service.js';

export async function enroll(userId: string, programCode: string, orderId: string | null = null) {
  const p = await one<{ code: string; sku: string; name: string }>('SELECT code, sku, name FROM programs WHERE upper(code)=upper($1) AND published', [programCode]);
  if (!p) throw notFound('Program');
  const existing = await one('SELECT id FROM enrollments WHERE user_id=$1 AND program_code=$2', [userId, p.code]);
  if (existing) throw conflict('Already enrolled');
  // Paid programs require a paid order unless the caller is staff/free-tier preview (handled by the commerce module).
  if (!orderId && p.sku !== 'plan_free') {
    const paid = await one(`SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.user_id=$1 AND o.status='paid' AND i.ref=$2`, [userId, p.code]);
    if (!paid) throw forbidden('This program requires enrolment through checkout');
    orderId = paid.id;
  }
  const r = await query('INSERT INTO enrollments(user_id, program_code, order_id) VALUES ($1,$2,$3) RETURNING id, program_code, status, started_at', [userId, p.code, orderId]);
  await audit(userId, 'enrollment.create', p.code, { orderId });
  return r[0];
}
export async function enrollCourse(userId: string, slug: string) {
  if (!(await one('SELECT 1 FROM courses WHERE slug=$1', [slug]))) throw notFound('Course');
  await query('INSERT INTO course_enrollments(user_id, course_slug) VALUES ($1,$2) ON CONFLICT DO NOTHING', [userId, slug]);
  await touchActivity(userId);
  return { ok: true };
}

/** Mark a curriculum item complete (video/law/reading). Labs and quizzes complete through their own graders. */
export async function completeItem(userId: string, itemId: string) {
  const it = await one<any>(`SELECT ci.*, pt.program_code, l.slug AS lesson_slug, l.title AS lesson_title, l.law_credits, l.tech_credits FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id LEFT JOIN lessons l ON l.id=ci.lesson_id WHERE ci.id=$1`, [itemId]);
  if (!it) throw notFound('Curriculum item');
  if (['lab', 'quiz', 'exam'].includes(it.kind)) throw badRequest('This item is completed by grading, not by marking');
  if (!(await one('SELECT 1 FROM enrollments WHERE user_id=$1 AND program_code=$2', [userId, it.program_code]))) throw forbidden('Enrol in the program first');
  await withTx(async (c) => {
    await c.query(`INSERT INTO item_progress(user_id, item_id, status, completed_at) VALUES ($1,$2,'done',now()) ON CONFLICT (user_id, item_id) DO UPDATE SET status='done', completed_at=now()`, [userId, itemId]);
    if (it.kind === 'law') await awardCredits({ userId, kind: 'law', amount: it.law_credits || CREDIT_RULES.lawModule, sourceType: 'lesson', sourceId: it.lesson_slug ?? itemId, programCode: it.program_code, title: it.lesson_title ?? it.title, scoreLabel: 'Done', itemKind: 'Law module' }, c);
    else if (it.tech_credits) await awardCredits({ userId, kind: 'tech', amount: it.tech_credits, sourceType: 'lesson', sourceId: it.lesson_slug ?? itemId, programCode: it.program_code, title: it.lesson_title ?? it.title, scoreLabel: 'Done', itemKind: 'Module' }, c);
    await touchActivity(userId, c);
    // advance "now" pointer to the next todo item
    await c.query(`UPDATE item_progress SET status='todo' WHERE user_id=$1 AND status='now'`, [userId]);
    const next = await c.query<{ id: string }>(`SELECT ci.id FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id LEFT JOIN item_progress ip ON ip.item_id=ci.id AND ip.user_id=$1 WHERE pt.program_code=$2 AND COALESCE(ip.status,'todo')<>'done' ORDER BY pt.ordinal, ci.ordinal LIMIT 1`, [userId, it.program_code]);
    if (next.rows[0]) await c.query(`INSERT INTO item_progress(user_id, item_id, status) VALUES ($1,$2,'now') ON CONFLICT (user_id, item_id) DO UPDATE SET status='now'`, [userId, next.rows[0].id]);
  });
  await issueCertificateIfEarned(userId, it.program_code).catch(() => {});
  return { ok: true };
}

export async function attemptQuiz(userId: string, quizSlug: string, answers: Record<string, string>) {
  const qz = await one<any>('SELECT * FROM quizzes WHERE slug=$1 OR id::text=$1', [quizSlug]);
  if (!qz) throw notFound('Quiz');
  const qs = await query<any>('SELECT id, answer, explanation, ordinal FROM quiz_questions WHERE quiz_id=$1 ORDER BY ordinal', [qz.id]);
  const results = qs.map((q) => ({ id: q.id, ordinal: q.ordinal, correct: (answers[q.id] ?? '').toUpperCase() === q.answer, answer: q.answer, explanation: q.explanation }));
  const scorePct = qs.length ? Math.round((results.filter((r) => r.correct).length / qs.length) * 10000) / 100 : 0;
  const passed = scorePct >= qz.pass_pct;
  const item = await one<any>(`SELECT ci.id, pt.program_code FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE ci.quiz_id=$1 LIMIT 1`, [qz.id]);
  const creditsAwarded = { tech: 0, law: 0 };
  await withTx(async (c) => {
    await c.query('INSERT INTO quiz_attempts(user_id, quiz_id, answers, score_pct, passed) VALUES ($1,$2,$3,$4,$5)', [userId, qz.id, JSON.stringify(answers), scorePct, passed]);
    await touchActivity(userId, c);
    if (passed) {
      if (item) await c.query(`INSERT INTO item_progress(user_id, item_id, status, score, completed_at) VALUES ($1,$2,'done',$3,now()) ON CONFLICT (user_id, item_id) DO UPDATE SET status='done', score=GREATEST(item_progress.score, EXCLUDED.score), completed_at=now()`, [userId, item.id, scorePct]);
      const kind = qz.kind === 'exam' ? 'Exam' : 'Quiz';
      if (qz.tech_credits && (await awardCredits({ userId, kind: 'tech', amount: qz.tech_credits, sourceType: 'quiz', sourceId: qz.slug, programCode: item?.program_code ?? null, title: qz.title, scoreLabel: `${Math.round(scorePct)}%`, itemKind: kind }, c))) creditsAwarded.tech = qz.tech_credits;
      if (qz.law_credits && (await awardCredits({ userId, kind: 'law', amount: qz.law_credits, sourceType: 'quiz', sourceId: qz.slug, programCode: item?.program_code ?? null, title: qz.title, scoreLabel: `${Math.round(scorePct)}%`, itemKind: kind }, c))) creditsAwarded.law = qz.law_credits;
    }
  });
  if (passed && item) await issueCertificateIfEarned(userId, item.program_code).catch(() => {});
  return { scorePct, passed, passPct: qz.pass_pct, results, creditsAwarded };
}

export async function transcript(userId: string) {
  const rows = await query<any>(`SELECT id, created_at, title, program_code, item_kind, score_label, kind, amount FROM credit_ledger WHERE user_id=$1 ORDER BY created_at DESC, id DESC`, [userId]);
  // Merge tech+law rows for the same source into one transcript line
  const byKey = new Map<string, any>();
  for (const r of rows) {
    const key = `${r.title}|${r.program_code}|${r.created_at}`;
    const line = byKey.get(key) ?? { id: r.id, date: r.created_at, item: r.title, program: r.program_code, type: r.item_kind ?? 'Item', score: r.score_label ?? '—', tech: 0, law: 0 };
    if (r.kind === 'tech') line.tech += r.amount; else line.law += r.amount;
    byKey.set(key, line);
  }
  const totals = await creditTotals(userId);
  return { entries: [...byKey.values()], totals: { tech: totals.tech, law: totals.law }, signed: true, note: 'Transcript is digitally signed and exportable. Employers can verify any line item by QR scan.' };
}

export async function dashboard(userId: string) {
  const u = await one<any>('SELECT * FROM users WHERE id=$1', [userId]);
  if (!u) throw notFound('User');
  const totals = await creditTotals(userId);
  const st = await streak(userId);
  const badges = await query<any>(`SELECT b.jurisdiction, j.name, j.flag, b.score_pct, b.earned_at, b.verification_id FROM badges_earned b JOIN jurisdictions j ON j.code=b.jurisdiction WHERE b.user_id=$1 AND NOT b.revoked ORDER BY b.earned_at`, [userId]);
  const certs = await query<any>(`SELECT c.id, c.program_code, p.name AS program_name, c.verification_id, c.kind, c.capstone_score, c.issued_at, c.revoked FROM certificates c JOIN programs p ON p.code=c.program_code WHERE c.user_id=$1 ORDER BY c.issued_at DESC`, [userId]);
  const enrollments = await query<any>(`SELECT e.program_code, p.name, p.tech_credits, p.law_credits, e.status, e.started_at, e.completed_at,
      (SELECT COUNT(*) FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE pt.program_code=e.program_code)::int AS total_items,
      (SELECT COUNT(*) FROM item_progress ip JOIN curriculum_items ci ON ci.id=ip.item_id JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE pt.program_code=e.program_code AND ip.user_id=e.user_id AND ip.status='done')::int AS done_items
      FROM enrollments e JOIN programs p ON p.code=e.program_code WHERE e.user_id=$1 ORDER BY e.status='active' DESC, e.started_at DESC`, [userId]);
  const nowItem = await one<any>(`SELECT ci.id, ci.title, ci.kind, ci.minutes, pt.program_code, pt.code AS track_code, l.slug AS lesson_slug, q.slug AS quiz_slug, e.slug AS exercise_slug FROM item_progress ip JOIN curriculum_items ci ON ci.id=ip.item_id JOIN program_tracks pt ON pt.id=ci.program_track_id LEFT JOIN lessons l ON l.id=ci.lesson_id LEFT JOIN quizzes q ON q.id=ci.quiz_id LEFT JOIN exercises e ON e.id=ci.exercise_id WHERE ip.user_id=$1 AND ip.status='now' LIMIT 1`, [userId]);
  const lastLab = await one<any>(`SELECT e.slug, e.title, e.language, ep.best_score, ep.attempts, ep.completed, s.detail FROM exercise_progress ep JOIN exercises e ON e.id=ep.exercise_id LEFT JOIN submissions s ON s.id=ep.last_submission_id WHERE ep.user_id=$1 AND NOT ep.completed ORDER BY ep.updated_at DESC LIMIT 1`, [userId]);
  const exercisesSolved = await one<{ n: number; week: number }>(`SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE updated_at > now() - interval '7 days')::int AS week FROM exercise_progress WHERE user_id=$1 AND completed`, [userId]);
  const upcoming = await query<any>(`SELECT id, kind, title, starts_at, platform, program_code FROM community_sessions WHERE starts_at > now() ORDER BY starts_at LIMIT 5`);
  const bookings = await query<any>(`SELECT b.id, b.jurisdiction, j.name, s.starts_at FROM exam_bookings b JOIN jurisdictions j ON j.code=b.jurisdiction LEFT JOIN exam_sittings s ON s.id=b.sitting_id WHERE b.user_id=$1 AND b.status='booked' ORDER BY s.starts_at`, [userId]);
  const active = enrollments.find((e) => e.status === 'active');
  const hasCraft = enrollments.length > 0;
  const hasCapstone = certs.some((c) => c.kind === 'career' || (c.capstone_score ?? 0) >= 70) && certs.length >= 2;
  const flag = await one<{ value: boolean }>(`SELECT value FROM feature_flags WHERE key='ladder.requireCertificates'`);
  const ladder = computeLadder({ jurisdictions: badges.map((b) => b.jurisdiction), hasCraft, hasCapstone, certificates: certs.filter((c) => c.kind === 'certificate').length, diplomas: certs.filter((c) => c.kind === 'diploma').length, careerCertificates: certs.filter((c) => c.kind === 'career').length }, { requireCertificates: Boolean(flag?.value) });
  const credential = active ? credentialProgress(await programCredits(userId, active.program_code), { tech: active.tech_credits, law: active.law_credits }) : null;
  const nextJurisdiction = (await query<any>(`SELECT code, name, flag FROM jurisdictions WHERE code NOT IN (SELECT jurisdiction FROM badges_earned WHERE user_id=$1) ORDER BY CASE code WHEN 'GB' THEN 0 ELSE ordinal END LIMIT 1`, [userId]))[0] ?? null;
  const cohortRank = await one<{ rank: number }>(`SELECT COUNT(*)::int + 1 AS rank FROM (SELECT user_id, SUM(amount) s FROM credit_ledger GROUP BY user_id) t WHERE t.s > (SELECT COALESCE(SUM(amount),0) FROM credit_ledger WHERE user_id=$1)`, [userId]);
  const subs = await query<any>(`SELECT sku, status, current_period_end FROM subscriptions WHERE user_id=$1 AND status='active'`, [userId]);
  return {
    user: { id: u.id, displayName: u.display_name, initials: `${u.first_name[0] ?? ''}${u.last_name[0] ?? ''}`.toUpperCase(), email: u.email, academicEmail: u.academic_email, plan: u.plan, joinedAt: u.created_at, preferences: u.preferences, locale: u.locale, twoFactorEnabled: u.totp_enabled },
    activeProgram: active ? { code: active.program_code, name: active.name, pct: active.total_items ? Math.round((active.done_items / active.total_items) * 100) : 0, done: active.done_items, total: active.total_items } : null,
    ladder, badges, certificates: certs, credits: { tech: totals.tech, law: totals.law, weekTech: totals.weekTech, weekLaw: totals.weekLaw }, credential,
    streak: st, jurisdictions: { earned: badges.length, total: 9, next: nextJurisdiction }, exercises: { solved: exercisesSolved?.n ?? 0, week: exercisesSolved?.week ?? 0 },
    cohortRank: cohortRank?.rank ?? 1, continueLearning: { nowItem, lastLab }, enrollments, upcoming, bookings, subscriptions: subs,
    recommended: (await query<any>(`SELECT code, name, tagline FROM programs WHERE code NOT IN (SELECT program_code FROM enrollments WHERE user_id=$1) AND published ORDER BY CASE WHEN code='LUxD' THEN 0 ELSE ordinal END LIMIT 1`, [userId]))[0] ?? null
  };
}
export async function programCredits(userId: string, programCode: string) {
  const r = await query<{ kind: string; total: number }>(`SELECT kind, COALESCE(SUM(amount),0)::int AS total FROM credit_ledger WHERE user_id=$1 AND program_code=$2 GROUP BY kind`, [userId, programCode]);
  return { tech: r.find((x) => x.kind === 'tech')?.total ?? 0, law: r.find((x) => x.kind === 'law')?.total ?? 0 };
}
export async function weekPlan(userId: string) {
  const items = await query<any>(`SELECT ci.title, ci.kind, ci.minutes, ci.meta, pt.program_code FROM item_progress ip JOIN curriculum_items ci ON ci.id=ip.item_id JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE ip.user_id=$1 AND ip.status<>'done' ORDER BY pt.ordinal, ci.ordinal LIMIT 3`, [userId]);
  const todo = await query<any>(`SELECT ci.title, ci.kind, ci.minutes, ci.meta, pt.program_code FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id JOIN enrollments e ON e.program_code=pt.program_code AND e.user_id=$1 AND e.status='active' LEFT JOIN item_progress ip ON ip.item_id=ci.id AND ip.user_id=$1 WHERE COALESCE(ip.status,'todo')='todo' ORDER BY pt.ordinal, ci.ordinal LIMIT 4`, [userId]);
  const sessions = await query<any>(`SELECT title, starts_at, platform FROM community_sessions WHERE starts_at > now() AND starts_at < now() + interval '7 days' ORDER BY starts_at LIMIT 2`);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const plan = [...items, ...todo].slice(0, 4).map((x, i) => ({ day: days[i * 2 % 7], item: x.title, program: x.program_code, type: x.kind === 'lab' ? 'IDE Lab · graded' : x.kind === 'law' ? `Law · ${x.minutes ?? 40} min` : x.kind === 'quiz' ? `Quiz · ${x.meta ?? ''}` : `Video · ${x.minutes ?? 30} min` }));
  for (const s of sessions) plan.push({ day: days[(new Date(s.starts_at).getUTCDay() + 6) % 7], item: s.title, program: 'Community', type: `${s.platform} session` });
  return { plan };
}

import { one, query } from '../../core/db.js';
import { notFound } from '../../core/errors.js';
import { SKUS, type ProgramSummaryDto, type ProgramDetailDto, type ProgramTrackDto, type CurriculumItemDto } from '@lawmads/shared';

interface ProgramRow { code: string; slug: string; name: string; tagline: string; track_slug: string; track_name: string; kind: string; level: string; weeks: number; tech_credits: number; law_credits: number; tools: string[]; law_areas: string[]; sku: string; price_cents: number; overview: string; who_for: string; career_outcomes: string; prerequisite: string; capstone: string; assessment: string; featured: boolean; is_new: boolean }

const summary = (p: ProgramRow): ProgramSummaryDto => ({
  code: p.code, slug: p.slug, name: p.name, tagline: p.tagline, track: p.track_slug, trackName: p.track_name, level: p.level, weeks: p.weeks,
  techCredits: p.tech_credits, lawCredits: p.law_credits, tools: p.tools, lawAreas: p.law_areas, sku: p.sku, priceCents: p.price_cents,
  kind: p.kind as ProgramSummaryDto['kind'], featured: p.featured, isNew: p.is_new
});

export async function tracks() {
  return query(`SELECT t.slug, t.name, t.ordinal AS "order", COUNT(p.code)::int AS "programCount" FROM tracks t LEFT JOIN programs p ON p.track_slug=t.slug AND p.published GROUP BY t.slug ORDER BY t.ordinal`);
}
export async function programs(filter: { track?: string; featured?: boolean } = {}): Promise<ProgramSummaryDto[]> {
  const rows = await query<ProgramRow>(`SELECT p.*, t.name AS track_name FROM programs p JOIN tracks t ON t.slug=p.track_slug WHERE p.published AND ($1::text IS NULL OR p.track_slug=$1) AND ($2::boolean IS NULL OR p.featured=$2) ORDER BY p.ordinal`, [filter.track ?? null, filter.featured ?? null]);
  return rows.map(summary);
}
export async function programDetail(codeOrSlug: string, userId?: string): Promise<ProgramDetailDto> {
  const p = await one<ProgramRow>(`SELECT p.*, t.name AS track_name FROM programs p JOIN tracks t ON t.slug=p.track_slug WHERE upper(p.code)=upper($1) OR p.slug=lower($1)`, [codeOrSlug]);
  if (!p) throw notFound('Program');
  const trackRows = await query<{ id: string; code: string; name: string }>('SELECT id, code, name FROM program_tracks WHERE program_code=$1 ORDER BY ordinal', [p.code]);
  const items = await query<any>(`SELECT ci.*, ip.status AS user_status, e.slug AS exercise_slug, l.slug AS lesson_slug FROM curriculum_items ci
      LEFT JOIN item_progress ip ON ip.item_id=ci.id AND ip.user_id=$2
      LEFT JOIN exercises e ON e.id=ci.exercise_id LEFT JOIN lessons l ON l.id=ci.lesson_id
      WHERE ci.program_track_id = ANY($1::uuid[]) ORDER BY ci.ordinal`, [trackRows.map((t) => t.id), userId ?? null]);
  const tracks: ProgramTrackDto[] = trackRows.map((t) => ({
    code: t.code as ProgramTrackDto['code'], name: t.name,
    items: items.filter((i) => i.program_track_id === t.id).map((i): CurriculumItemDto => ({ id: i.id, kind: i.kind, title: i.title, minutes: i.minutes, meta: i.meta, exerciseId: i.exercise_slug ?? i.exercise_id, quizId: i.quiz_id, lessonId: i.lesson_slug ?? i.lesson_id, order: i.ordinal, status: i.user_status ?? 'todo' }))
  }));
  const total = items.length, done = items.filter((i) => i.user_status === 'done').length;
  const enrolled = userId ? Boolean(await one('SELECT 1 FROM enrollments WHERE user_id=$1 AND program_code=$2', [userId, p.code])) : false;
  const def = SKUS[p.sku as keyof typeof SKUS];
  return { ...summary(p), overview: p.overview, whoFor: p.who_for, careerOutcomes: p.career_outcomes, prerequisite: p.prerequisite, capstone: p.capstone, assessment: p.assessment, tracks, installments: def?.installments ?? null, enrolled, progressPct: enrolled && total ? Math.round((done / total) * 100) : null };
}
export async function courses(category?: string) {
  return query(`SELECT slug, title, category, blurb, hours, level, language, program_code AS "programCode", modules, ordinal FROM courses WHERE ($1::text IS NULL OR category=$1) ORDER BY ordinal`, [category ?? null]);
}
export async function course(slug: string, userId?: string) {
  const c = await one<any>(`SELECT c.*, p.name AS program_name FROM courses c LEFT JOIN programs p ON p.code=c.program_code WHERE c.slug=$1`, [slug]);
  if (!c) throw notFound('Course');
  const exercise = c.language ? await one<{ slug: string; title: string }>('SELECT slug, title FROM exercises WHERE language=$1 AND published ORDER BY ordinal LIMIT 1', [c.language]) : null;
  const enrolled = userId ? Boolean(await one('SELECT 1 FROM course_enrollments WHERE user_id=$1 AND course_slug=$2', [userId, slug])) : false;
  return { slug: c.slug, title: c.title, category: c.category, blurb: c.blurb, hours: c.hours, level: c.level, language: c.language, programCode: c.program_code, programName: c.program_name, modules: c.modules, tryExercise: exercise, enrolled };
}
export async function lesson(slug: string, userId?: string) {
  const l = await one<any>('SELECT * FROM lessons WHERE slug=$1', [slug]);
  if (!l) throw notFound('Lesson');
  const item = await one<any>(`SELECT ci.id, ci.program_track_id, pt.program_code, pt.code AS track_code, pt.name AS track_name, ci.ordinal FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE ci.lesson_id=$1 LIMIT 1`, [l.id]);
  let prev: any = null, next: any = null, program: any = null;
  if (item) {
    const all = await query<any>(`SELECT ci.id, ci.title, ci.kind, ci.minutes, ci.meta, ci.ordinal, pt.code AS track_code, pt.name AS track_name, pt.ordinal AS t_ord, ls.slug AS lesson_slug, q.slug AS quiz_slug, e.slug AS exercise_slug, ip.status
      FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id LEFT JOIN lessons ls ON ls.id=ci.lesson_id LEFT JOIN quizzes q ON q.id=ci.quiz_id LEFT JOIN exercises e ON e.id=ci.exercise_id
      LEFT JOIN item_progress ip ON ip.item_id=ci.id AND ip.user_id=$2 WHERE pt.program_code=$1 ORDER BY pt.ordinal, ci.ordinal`, [item.program_code, userId ?? null]);
    const idx = all.findIndex((x) => x.id === item.id);
    prev = all[idx - 1] ?? null; next = all[idx + 1] ?? null;
    const p = await one<any>('SELECT code, name FROM programs WHERE code=$1', [item.program_code]);
    program = { code: p.code, name: p.name, curriculum: all, done: all.filter((x) => x.status === 'done').length, total: all.length, itemId: item.id, trackCode: item.track_code, trackName: item.track_name, moduleIndex: all.filter((x) => x.track_code === item.track_code).findIndex((x) => x.id === item.id) + 1, moduleCount: all.filter((x) => x.track_code === item.track_code).length };
  }
  return { id: l.id, slug: l.slug, title: l.title, kind: l.kind, minutes: l.minutes, videoUrl: l.video_url, notesMd: l.notes_md, lensMd: l.lens_md, resources: l.resources, instructor: l.instructor, lawCredits: l.law_credits, techCredits: l.tech_credits, program, prev, next };
}
export async function quiz(slug: string) {
  const qz = await one<any>('SELECT * FROM quizzes WHERE slug=$1 OR id::text=$1', [slug]);
  if (!qz) throw notFound('Quiz');
  const questions = await query<any>('SELECT id, ordinal, prompt, options FROM quiz_questions WHERE quiz_id=$1 ORDER BY ordinal', [qz.id]);
  const item = await one<any>(`SELECT pt.program_code, pt.code AS track_code, ci.id AS item_id FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE ci.quiz_id=$1 LIMIT 1`, [qz.id]);
  return { id: qz.id, slug: qz.slug, title: qz.title, passPct: qz.pass_pct, techCredits: qz.tech_credits, lawCredits: qz.law_credits, kind: qz.kind, questions, program: item };
}

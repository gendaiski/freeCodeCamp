/** Idempotent seed: reference data is upserted; demo accounts are recreated by email. */
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { pool, withTx } from '../../core/db.js';
import { hashPassword, signCredential } from '../../core/crypto.js';
import { LANGUAGES } from '@lawmads/shared';
import { TRACKS, PROGRAMS, LUID_CURRICULUM, LESSONS, QUIZZES, COURSES } from './catalog.js';
import { JURISDICTION_ROWS, COVERAGE } from './jurisdictions.js';
import { EXERCISES } from './exercises.js';
import { CHAPTERS, POSTS, SESSIONS, DESIGNS, PRODUCTS, LAW_INSTRUMENTS, LAW_ARTICLES, AI_MODELS, BLOG, PODCAST_SERIES, PODCAST_FEATURED, PROMOS, FLAGS } from './content.js';
import type pg from 'pg';

type C = pg.PoolClient;
const q = (c: C, text: string, params: unknown[] = []) => c.query(text, params);
const daysFromNow = (d: number, h = 16) => { const x = new Date(); x.setUTCDate(x.getUTCDate() + d); x.setUTCHours(h, 0, 0, 0); return x.toISOString(); };
const daysAgo = (d: number) => { const x = new Date(); x.setUTCDate(x.getUTCDate() - d); return x.toISOString(); };

export async function seed(log: (s: string) => void = () => {}): Promise<void> {
  await withTx(async (c) => {
    // --- reference data ------------------------------------------------------
    for (const [slug, name, ord] of TRACKS) await q(c, `INSERT INTO tracks(slug,name,ordinal) VALUES($1,$2,$3) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name, ordinal=EXCLUDED.ordinal`, [slug, name, ord]);
    for (const l of LANGUAGES) await q(c, `INSERT INTO languages(slug,name,monaco,judge0_id,grading,agentic,file_name,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,monaco=EXCLUDED.monaco,judge0_id=EXCLUDED.judge0_id,grading=EXCLUDED.grading,agentic=EXCLUDED.agentic,file_name=EXCLUDED.file_name,ordinal=EXCLUDED.ordinal`,
      [l.slug, l.name, l.monaco, l.judge0Id, l.grading, l.agentic, l.fileName, LANGUAGES.indexOf(l) + 1]);
    log(`languages: ${LANGUAGES.length}`);

    for (const j of JURISDICTION_ROWS) await q(c, `INSERT INTO jurisdictions(code,slug,name,name_ar,flag,region,family,family_label,badge_code,hardness,syllabus,pass_rate_pct,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT(code) DO UPDATE SET slug=EXCLUDED.slug,name=EXCLUDED.name,name_ar=EXCLUDED.name_ar,flag=EXCLUDED.flag,region=EXCLUDED.region,family=EXCLUDED.family,family_label=EXCLUDED.family_label,badge_code=EXCLUDED.badge_code,hardness=EXCLUDED.hardness,syllabus=EXCLUDED.syllabus,pass_rate_pct=EXCLUDED.pass_rate_pct,ordinal=EXCLUDED.ordinal`,
      [j.code, j.slug, j.name, j.nameAr, j.flag, j.region, j.family, j.familyLabel, j.badgeCode, j.hardness, JSON.stringify(j.syllabus), j.passRate, j.ordinal]);
    for (const [code, entries, cov, pdf, note] of COVERAGE) await q(c, `INSERT INTO coverage_stats(jurisdiction,entries,coverage_pct,pdf_linked_pct,note) VALUES($1,$2,$3,$4,$5) ON CONFLICT(jurisdiction) DO UPDATE SET entries=EXCLUDED.entries,coverage_pct=EXCLUDED.coverage_pct,pdf_linked_pct=EXCLUDED.pdf_linked_pct,note=EXCLUDED.note`, [code, entries, cov, pdf, note]);
    // sittings: next 8 weeks, two per jurisdiction
    await q(c, `DELETE FROM exam_sittings WHERE starts_at > now() AND id NOT IN (SELECT sitting_id FROM exam_bookings WHERE sitting_id IS NOT NULL)`);
    for (const j of JURISDICTION_ROWS) for (const d of [12, 40]) await q(c, `INSERT INTO exam_sittings(jurisdiction,starts_at,capacity) VALUES($1,$2,100)`, [j.code, daysFromNow(d + j.ordinal, 10)]);
    log(`jurisdictions: ${JURISDICTION_ROWS.length}`);

    // --- exercises -----------------------------------------------------------
    for (const e of EXERCISES) {
      const r = await q(c, `INSERT INTO exercises(slug,title,language,ordinal,difficulty,instructions_md,checks,starter_code,solution_code,hints,structural_rules,tech_credits,published)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)
        ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,language=EXCLUDED.language,ordinal=EXCLUDED.ordinal,difficulty=EXCLUDED.difficulty,instructions_md=EXCLUDED.instructions_md,checks=EXCLUDED.checks,starter_code=EXCLUDED.starter_code,solution_code=EXCLUDED.solution_code,hints=EXCLUDED.hints,structural_rules=EXCLUDED.structural_rules,tech_credits=EXCLUDED.tech_credits
        RETURNING id`, [e.slug, e.title, e.language, e.ordinal, e.difficulty, e.instructions, JSON.stringify(e.checks), e.starter, e.solution, JSON.stringify(e.hints), JSON.stringify(e.structural ?? []), e.credits]);
      const id = r.rows[0].id;
      await q(c, `DELETE FROM test_cases WHERE exercise_id=$1`, [id]);
      let i = 0;
      for (const t of e.tests) await q(c, `INSERT INTO test_cases(exercise_id,name,input,expected_output,weight,hidden,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7)`, [id, t.name, t.input, t.expected, t.weight ?? 1, t.hidden ?? true, i++]);
    }
    log(`exercises: ${EXERCISES.length}`);

    // --- lessons + quizzes (referenced by the curriculum) --------------------
    for (const l of LESSONS) await q(c, `INSERT INTO lessons(slug,title,kind,minutes,notes_md,lens_md,resources,law_credits) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,kind=EXCLUDED.kind,minutes=EXCLUDED.minutes,notes_md=EXCLUDED.notes_md,lens_md=EXCLUDED.lens_md,resources=EXCLUDED.resources,law_credits=EXCLUDED.law_credits`,
      [l.slug, l.title, l.kind, l.minutes, l.notes, l.lens, JSON.stringify(l.resources), l.law ?? 0]);
    for (const qz of QUIZZES) {
      const r = await q(c, `INSERT INTO quizzes(slug,title,pass_pct,tech_credits,law_credits,kind) VALUES($1,$2,$3,$4,$5,$6)
        ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,pass_pct=EXCLUDED.pass_pct,tech_credits=EXCLUDED.tech_credits,law_credits=EXCLUDED.law_credits,kind=EXCLUDED.kind RETURNING id`,
        [qz.slug, qz.title, qz.passPct, qz.tech, (qz as any).law ?? 0, (qz as any).kind ?? 'quiz']);
      await q(c, `DELETE FROM quiz_questions WHERE quiz_id=$1`, [r.rows[0].id]);
      for (const [i, [prompt, opts, answer, expl]] of qz.questions.entries())
        await q(c, `INSERT INTO quiz_questions(quiz_id,ordinal,prompt,options,answer,explanation) VALUES($1,$2,$3,$4,$5,$6)`, [r.rows[0].id, i + 1, prompt, JSON.stringify((opts as readonly string[]).map((t, k) => ({ key: 'ABCD'[k], text: t }))), answer, expl]);
    }
    log(`lessons: ${LESSONS.length}, quizzes: ${QUIZZES.length}`);

    // --- programs, curriculum ----------------------------------------------
    for (const [i, p] of PROGRAMS.entries()) {
      const kind = p.kind ?? 'certificate';
      const sku = p.sku ?? (kind === 'diploma' ? 'diploma' : kind === 'career' ? 'career_certificate' : kind === 'course_certificate' ? 'course_certificate' : 'certificate');
      const price = p.price ?? (sku === 'diploma' ? 89000 : sku === 'career_certificate' ? 149000 : sku === 'course_certificate' ? 12000 : 39000);
      await q(c, `INSERT INTO programs(code,slug,name,tagline,track_slug,kind,level,weeks,tech_credits,law_credits,tools,law_areas,sku,price_cents,overview,who_for,career_outcomes,prerequisite,capstone,assessment,featured,is_new,ordinal)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
        ON CONFLICT(code) DO UPDATE SET slug=EXCLUDED.slug,name=EXCLUDED.name,tagline=EXCLUDED.tagline,track_slug=EXCLUDED.track_slug,kind=EXCLUDED.kind,level=EXCLUDED.level,weeks=EXCLUDED.weeks,tech_credits=EXCLUDED.tech_credits,law_credits=EXCLUDED.law_credits,tools=EXCLUDED.tools,law_areas=EXCLUDED.law_areas,sku=EXCLUDED.sku,price_cents=EXCLUDED.price_cents,overview=EXCLUDED.overview,who_for=EXCLUDED.who_for,career_outcomes=EXCLUDED.career_outcomes,prerequisite=EXCLUDED.prerequisite,capstone=EXCLUDED.capstone,assessment=EXCLUDED.assessment,featured=EXCLUDED.featured,is_new=EXCLUDED.is_new,ordinal=EXCLUDED.ordinal`,
        [p.code, p.code.toLowerCase(), p.name, p.tagline, p.track, kind, p.level, p.weeks, p.tech, p.law, p.tools, p.lawAreas, sku, price, p.overview, p.whoFor ?? '', p.outcomes, p.prereq ?? 'None', p.capstone, p.assessment ?? 'Capstone review + track assessments.', p.featured ?? false, p.isNew ?? false, i + 1]);
      // generic three tracks + capstone from module titles
      const tracks: Array<[string, string, Array<{ kind: string; title: string; minutes?: number | null; meta?: string | null; lesson?: string; quiz?: string; exercise?: string }>]> = [];
      if (p.code === 'LUID') {
        for (const code of ['A', 'B', 'C', 'CAP'] as const) tracks.push([code, LUID_CURRICULUM[code].name, [...LUID_CURRICULUM[code].items] as any]);
      } else if (p.tracks) {
        const mk = (titles: readonly string[], kind: string) => titles.map((t, k) => ({ kind: kind === 'C' ? 'law' : /\(IDE/i.test(t) ? 'lab' : 'video', title: t, minutes: kind === 'C' ? 40 + k * 5 : 25 + k * 6, meta: /\(IDE/i.test(t) ? 'graded' : null }));
        tracks.push(['A', 'Track A — Foundations', [...mk(p.tracks.A, 'A'), { kind: 'quiz', title: 'Foundations Check', meta: '10 Q' }]]);
        tracks.push(['B', 'Track B — Applied Practice', mk(p.tracks.B, 'B')]);
        tracks.push(['C', 'Track C — The Law of the Craft', [...mk(p.tracks.C, 'C'), { kind: 'exam', title: 'Track Exam', meta: '25 Q' }]]);
        tracks.push(['CAP', 'Capstone', [{ kind: 'capstone', title: p.capstone, meta: 'instructor-reviewed' }]]);
      }
      for (const [k, [code, name, items]] of tracks.entries()) {
        const tr = await q(c, `INSERT INTO program_tracks(program_code,code,name,ordinal) VALUES($1,$2,$3,$4) ON CONFLICT(program_code,code) DO UPDATE SET name=EXCLUDED.name,ordinal=EXCLUDED.ordinal RETURNING id`, [p.code, code, name, k]);
        const trackId = tr.rows[0].id;
        await q(c, `DELETE FROM curriculum_items WHERE program_track_id=$1`, [trackId]);
        for (const [n, it] of items.entries()) {
          const lesson = it.lesson ? (await q(c, `SELECT id FROM lessons WHERE slug=$1`, [it.lesson])).rows[0]?.id ?? null : null;
          const quiz = it.quiz ? (await q(c, `SELECT id FROM quizzes WHERE slug=$1`, [it.quiz])).rows[0]?.id ?? null : null;
          const ex = it.exercise ? (await q(c, `SELECT id FROM exercises WHERE slug=$1`, [it.exercise])).rows[0]?.id ?? null : null;
          await q(c, `INSERT INTO curriculum_items(program_track_id,ordinal,kind,title,minutes,meta,lesson_id,quiz_id,exercise_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [trackId, n, it.kind, it.title, it.minutes ?? null, it.meta ?? null, lesson, quiz, ex]);
        }
      }
    }
    log(`programs: ${PROGRAMS.length}`);
    for (const [slug, title, cat, blurb, hours, level, lang, prog] of COURSES) await q(c, `INSERT INTO courses(slug,title,category,blurb,hours,level,language,program_code,modules,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,category=EXCLUDED.category,blurb=EXCLUDED.blurb,hours=EXCLUDED.hours,level=EXCLUDED.level,language=EXCLUDED.language,program_code=EXCLUDED.program_code,modules=EXCLUDED.modules,ordinal=EXCLUDED.ordinal`,
      [slug, title, cat, blurb, hours, level, lang, prog, JSON.stringify([{ title: 'Orientation & setup', minutes: 12, kind: 'video' }, { title: 'Core concepts by practice', minutes: 45, kind: 'video' }, { title: 'Graded exercise', minutes: 30, kind: 'lab' }, { title: 'The law of the craft', minutes: 35, kind: 'law' }, { title: 'Course quiz', minutes: 15, kind: 'quiz' }]), COURSES.findIndex((x) => x[0] === slug) + 1]);

    // --- community, shop, content -----------------------------------------
    for (const [i, [slug, name, icon, blurb, base]] of CHAPTERS.entries()) await q(c, `INSERT INTO chapters(slug,name,icon,blurb,ordinal,base_members) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,icon=EXCLUDED.icon,blurb=EXCLUDED.blurb,ordinal=EXCLUDED.ordinal,base_members=EXCLUDED.base_members`, [slug, name, icon, blurb, i + 1, base]);
    if ((await q(c, `SELECT 1 FROM posts LIMIT 1`)).rowCount === 0) {
      for (const p of POSTS) {
        const r = await q(c, `INSERT INTO posts(chapter_slug,author_name,title,body,link_label,link_kind,link_ref) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [p.chapter, p.author, p.title, p.body, p.linkLabel, p.linkKind, p.linkRef]);
        for (const body of p.comments) await q(c, `INSERT INTO comments(post_id,author_name,body) VALUES($1,$2,$3)`, [r.rows[0].id, 'Community member', body]);
      }
    }
    await q(c, `DELETE FROM community_sessions WHERE starts_at > now()`);
    for (const [kind, title, d, h, platform, prog] of SESSIONS) await q(c, `INSERT INTO community_sessions(kind,title,starts_at,platform,program_code) VALUES($1,$2,$3,$4,$5)`, [kind, title, daysFromNow(d, h), platform, prog]);
    if ((await q(c, `SELECT 1 FROM design_submissions LIMIT 1`)).rowCount === 0) for (const [title, designer, , winner, votes] of DESIGNS) await q(c, `INSERT INTO design_submissions(designer,title,month,votes,winner) VALUES($1,$2,$3,$4,$5)`, [designer, title, '2026-07', votes, winner]);
    for (const [i, [slug, name, tag, blurb, price, sku, icon]] of PRODUCTS.entries()) await q(c, `INSERT INTO products(slug,name,tag,blurb,price_cents,sku,icon,ordinal) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,tag=EXCLUDED.tag,blurb=EXCLUDED.blurb,price_cents=EXCLUDED.price_cents,sku=EXCLUDED.sku,icon=EXCLUDED.icon,ordinal=EXCLUDED.ordinal`, [slug, name, tag, blurb, price, sku, icon, i + 1]);

    for (const li of LAW_INSTRUMENTS) await q(c, `INSERT INTO law_instruments(id,jurisdiction,kind,title_en,title_ar,year,area,source_pdf) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(id) DO UPDATE SET title_en=EXCLUDED.title_en,title_ar=EXCLUDED.title_ar,year=EXCLUDED.year,area=EXCLUDED.area,source_pdf=EXCLUDED.source_pdf,kind=EXCLUDED.kind`, [li.id, li.jurisdiction, li.kind, li.titleEn, li.titleAr, li.year, li.area, li.pdf]);
    for (const a of LAW_ARTICLES) {
      const inst = LAW_INSTRUMENTS.find((x) => x.id === a.instrument)!;
      await q(c, `INSERT INTO law_articles(id,instrument_id,jurisdiction,article,text_en,text_ar,in_force_from,construed_by,provenance) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)
        ON CONFLICT(id) DO UPDATE SET text_en=EXCLUDED.text_en,text_ar=EXCLUDED.text_ar,in_force_from=EXCLUDED.in_force_from,construed_by=EXCLUDED.construed_by,provenance=EXCLUDED.provenance`,
        [a.id, a.instrument, inst.jurisdiction, a.article, a.en, a.ar, a.from, a.construed, JSON.stringify({ source_pdf: inst.pdf, page: a.prov.page, ocr_confidence: a.prov.ocr, human_verified: a.prov.verified, last_verified: '2026-09-01' })]);
    }
    for (const [i, [slug, name, cat, blurb, lives]] of AI_MODELS.entries()) await q(c, `INSERT INTO ai_models(slug,name,category,blurb,lives_in,ordinal) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,category=EXCLUDED.category,blurb=EXCLUDED.blurb,lives_in=EXCLUDED.lives_in,ordinal=EXCLUDED.ordinal`, [slug, name, cat, blurb, lives, i + 1]);
    for (const [i, [slug, title, cat, excerpt, author, mins]] of BLOG.entries()) await q(c, `INSERT INTO blog_posts(slug,title,category,excerpt,body_md,author,read_minutes,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(slug) DO UPDATE SET title=EXCLUDED.title,category=EXCLUDED.category,excerpt=EXCLUDED.excerpt,body_md=EXCLUDED.body_md,author=EXCLUDED.author,read_minutes=EXCLUDED.read_minutes`,
      [slug, title, cat, excerpt, `# ${title}\n\n${excerpt}\n\n## The argument\n\nLegal education inherited a settled-world assumption: that law is national, that knowledge lives in one place, and that the student travels to it and stays. Two forces broke that assumption — globalisation made legal work routinely cross-border, and technology made the tools of practice as important as the doctrine.\n\n## What we do about it\n\nEvery Lawmads program pairs a technology craft with the law that governs it, and every credential is signed and verifiable by QR. Counts, prices and pass rates on this site come from the platform’s data, not from copy.\n\n## Read next\n\nThe Delta Brief goes out weekly — a five-minute read on law × technology.`, author, mins, daysAgo(i * 7 + 2)]);
    // 48 episodes: 4 authored + 44 generated across the four series
    for (const [n, slug, title, guest, role, series, dur, summary] of PODCAST_FEATURED) await q(c, `INSERT INTO podcast_episodes(number,slug,title,guest,guest_role,series,duration_sec,summary,transcript_md,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(number) DO UPDATE SET slug=EXCLUDED.slug,title=EXCLUDED.title,guest=EXCLUDED.guest,guest_role=EXCLUDED.guest_role,series=EXCLUDED.series,duration_sec=EXCLUDED.duration_sec,summary=EXCLUDED.summary`,
      [n, slug, title, guest, role, series, dur, summary, `**What you got wrong:** ${summary}`, daysAgo((48 - n) * 7 + 3)]);
    const topics = ['e-signature validity', 'contract automation', 'legal data provenance', 'AI supervision files', 'company filing APIs', 'OSINT admissibility', 'tokenised assets', 'legal design', 'cross-border privacy', 'clause linting', 'bilingual drafting'];
    for (let n = 1; n <= 44; n++) {
      const series = PODCAST_SERIES[n % 4]!;
      const topic = topics[n % topics.length]!;
      await q(c, `INSERT INTO podcast_episodes(number,slug,title,guest,guest_role,series,duration_sec,summary,published_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(number) DO NOTHING`,
        [n, `ep-${n}-${topic.replace(/\s+/g, '-')}`, `What we got wrong about ${topic}`, `Guest ${n}`, 'Practitioner', series, 38 * 60 + (n * 37) % 600, `A ${series} conversation on ${topic} — the eval that failed and the border it broke at.`, daysAgo((48 - n) * 7 + 3)]);
    }
    for (const p of PROMOS) await q(c, `INSERT INTO promo_codes(code,percent_off,max_redemptions) VALUES($1,$2,$3) ON CONFLICT(code) DO UPDATE SET percent_off=EXCLUDED.percent_off,max_redemptions=EXCLUDED.max_redemptions`, [p.code, p.percentOff, p.maxRedemptions]);
    for (const [k, v] of FLAGS) await q(c, `INSERT INTO feature_flags(key,value) VALUES($1,$2) ON CONFLICT(key) DO NOTHING`, [k, JSON.stringify(v)]);

    // --- demo accounts -------------------------------------------------------
    await seedDemoUsers(c);
    // Seeded verification ids occupy 0301–0342; new credentials continue from 1000.
    await q(c, `SELECT setval('verification_seq', GREATEST((SELECT last_value FROM verification_seq), 1000))`);
    log('demo accounts: 4');
  });
}

export const DEMO_PASSWORD = 'lawmads-demo';

async function upsertUser(c: C, email: string, first: string, last: string, roles: string[], plan: string, extra: Record<string, unknown> = {}) {
  const r = await q(c, `INSERT INTO users(email,first_name,last_name,display_name,roles,plan,academic_email,academic_verified,preferences)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::jsonb, '{"darkIde":true,"aiHints":true,"publicProfile":true,"reminders":true}'::jsonb))
    ON CONFLICT(email_lower) DO UPDATE SET first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,display_name=EXCLUDED.display_name,roles=EXCLUDED.roles,plan=EXCLUDED.plan,academic_email=EXCLUDED.academic_email,academic_verified=EXCLUDED.academic_verified RETURNING id`,
    [email, first, last, `${first} ${last}`, roles, plan, extra.academicEmail ?? null, Boolean(extra.academicEmail), null]);
  const id = r.rows[0].id as string;
  await q(c, `INSERT INTO user_credentials(user_id,password_hash) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash`, [id, hashPassword(DEMO_PASSWORD)]);
  return id;
}

async function seedDemoUsers(c: C) {
  const admin = await upsertUser(c, 'admin@lawmads.test', 'Lawmads', 'Admin', ['admin', 'instructor', 'student'], 'plan_pro_annual');
  await upsertUser(c, 'instructor@lawmads.test', 'Lead', 'Faculty', ['instructor', 'student'], 'plan_pro_annual');
  await upsertUser(c, 'student@lawmads.test', 'Demo', 'Student', ['student'], 'plan_free');
  const ahmed = await upsertUser(c, 'aelgendy@thelawtechlabs.com', 'Ahmed', 'El Gendy', ['admin', 'instructor', 'student'], 'plan_pro_annual', { academicEmail: 'a.elgendy@lawmads.edu' });
  void admin;

  // Wipe and rebuild Ahmed's learning state so the dashboard matches the wireframe exactly.
  for (const t of ['credit_ledger', 'activity_days', 'enrollments', 'item_progress', 'quiz_attempts', 'badges_earned', 'exam_attempts', 'exam_bookings', 'certificates', 'exercise_progress', 'submissions', 'chapter_members', 'documents', 'builder_projects', 'subscriptions', 'orders'])
    await q(c, `DELETE FROM ${t} WHERE user_id=$1`, [ahmed]);

  // Enrollments: LDT completed, LUID in progress
  await q(c, `INSERT INTO enrollments(user_id,program_code,status,started_at,completed_at) VALUES($1,'LDT','completed',$2,$3)`, [ahmed, daysAgo(140), daysAgo(102)]);
  await q(c, `INSERT INTO enrollments(user_id,program_code,status,started_at) VALUES($1,'LUID','active',$2)`, [ahmed, daysAgo(90)]);
  await q(c, `INSERT INTO subscriptions(user_id,sku,status,current_period_end) VALUES($1,'plan_pro_annual','active',now() + interval '300 days'),($1,'addon_editor_student','active',now() + interval '20 days')`, [ahmed]);

  // LUID item progress: A1 done, A2 now (34% ≈ 12/35 items overall reported by the API from real rows)
  const luidItems = (await q(c, `SELECT ci.id, ci.title, pt.code FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE pt.program_code='LUID' ORDER BY pt.ordinal, ci.ordinal`)).rows;
  const a1 = luidItems.find((r) => r.title.startsWith('Module 1: Basic UI'));
  const a2 = luidItems.find((r) => r.title.startsWith('Module 2: UI Design Patterns'));
  if (a1) await q(c, `INSERT INTO item_progress(user_id,item_id,status,completed_at) VALUES($1,$2,'done',$3)`, [ahmed, a1.id, daysAgo(4)]);
  if (a2) await q(c, `INSERT INTO item_progress(user_id,item_id,status) VALUES($1,$2,'now')`, [ahmed, a2.id]);
  // LDT: everything done
  const ldtItems = (await q(c, `SELECT ci.id FROM curriculum_items ci JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE pt.program_code='LDT'`)).rows;
  for (const it of ldtItems) await q(c, `INSERT INTO item_progress(user_id,item_id,status,completed_at) VALUES($1,$2,'done',$3)`, [ahmed, it.id, daysAgo(105)]);

  // Transcript rows (wireframe) + adjustments so totals are 124 tech / 96 law
  const ledger: Array<[string, number, string, string, string, string, string, string, number]> = [
    ['tech', 6, 'project', 'luid-user-flows', 'LUID', 'User Flows v. Task Flows', '92%', 'Project', 82],
    ['tech', 2, 'quiz', 'luid-uiux-difference', 'LUID', 'UI/UX Design Difference', '88%', 'Quiz', 86],
    ['law', 8, 'exam', 'luid-copyright', 'LUID', 'Copyrights Law & Relative Rights', '95%', 'Exam', 90],
    ['tech', 10, 'exercise', 'javascript-3', 'LDT', 'IP Clause Validator', '100%', 'IDE Exercise', 96],
    ['tech', 8, 'capstone', 'ldt-capstone', 'LDT', 'LDT® Capstone — NDA workflow redesign', '92%', 'Capstone', 102],
    ['law', 8, 'capstone', 'ldt-capstone', 'LDT', 'LDT® Capstone — NDA workflow redesign', '92%', 'Capstone', 102],
    ['law', 6, 'badge', 'AE', 'LDT', 'UAE Jurisdiction Badge Exam', 'Pass', 'Exam', 104],
    ['law', 6, 'badge', 'EG', 'LDT', 'Egypt Jurisdiction Badge Exam', 'Pass', 'Exam', 115],
    ['tech', 98, 'adjustment', 'prior-learning-tech', 'LDT', 'Prior learning recognised (LDT® track record)', '—', 'Adjustment', 130],
    ['law', 68, 'adjustment', 'prior-learning-law', 'LDT', 'Prior learning recognised (LDT® track record)', '—', 'Adjustment', 130]
  ];
  for (const [kind, amt, st, sid, prog, title, score, ik, ago] of ledger) await q(c, `INSERT INTO credit_ledger(user_id,kind,amount,source_type,source_id,program_code,title,score_label,item_kind,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [ahmed, kind, amt, st, sid, prog, title, score, ik, daysAgo(ago)]);
  for (let d = 0; d < 7; d++) await q(c, `INSERT INTO activity_days(user_id,day) VALUES($1, (now() - ($2 || ' days')::interval)::date) ON CONFLICT DO NOTHING`, [ahmed, d]);

  // Badges EG 95 / AE 88 with signed verification records
  for (const [code, score, ago, vid] of [['EG', 95, 115, 'LWM-2026-0301'], ['AE', 88, 104, 'LWM-2026-0322']] as const) {
    const att = await q(c, `INSERT INTO exam_attempts(user_id,jurisdiction,score_pct,passed,examined_by,created_at) VALUES($1,$2,$3,true,'Ahmed El Gendy',$4) RETURNING id`, [ahmed, code, score, daysAgo(ago)]);
    const payload = { type: 'badge', verificationId: vid, holder: 'Ahmed El Gendy', jurisdiction: code, score, examinedBy: 'Ahmed El Gendy', earnedAt: daysAgo(ago) };
    await q(c, `INSERT INTO badges_earned(user_id,jurisdiction,attempt_id,score_pct,verification_id,signature,earned_at) VALUES($1,$2,$3,$4,$5,$6,$7)`, [ahmed, code, att.rows[0].id, score, vid, signCredential(payload), daysAgo(ago)]);
  }
  // LDT certificate LWM-2026-0342
  const certPayload = { type: 'certificate', verificationId: 'LWM-2026-0342', holder: 'Ahmed El Gendy', program: 'LDT', programName: 'Legal Design Thinking Foundations', capstoneScore: 92, issuedAt: '2026-06-12T00:00:00.000Z', techCredits: 8, lawCredits: 8, awardedBy: 'The Legal Technology Academy' };
  await q(c, `INSERT INTO certificates(user_id,program_code,verification_id,kind,capstone_score,payload,signature,issued_at) VALUES($1,'LDT','LWM-2026-0342','certificate',92,$2,$3,'2026-06-12')`, [ahmed, JSON.stringify(certPayload), signCredential(certPayload)]);

  // IDE progress: html-3 attempted (2 of 4 checks), javascript-3 completed
  const html3 = (await q(c, `SELECT id FROM exercises WHERE slug='html-3'`)).rows[0].id;
  const js3 = (await q(c, `SELECT id FROM exercises WHERE slug='javascript-3'`)).rows[0].id;
  await q(c, `INSERT INTO exercise_progress(user_id,exercise_id,best_score,attempts,failed_attempts,completed,credited) VALUES($1,$2,50,1,1,false,false),($1,$3,100,1,0,true,true)`, [ahmed, html3, js3]);
  const solvedRows = (await q(c, `SELECT id FROM exercises WHERE language IN ('javascript','python','sql','html') AND slug NOT IN ('html-3','javascript-3') LIMIT 36`)).rows;
  for (const r of solvedRows) await q(c, `INSERT INTO exercise_progress(user_id,exercise_id,best_score,attempts,completed,credited) VALUES($1,$2,100,1,true,true) ON CONFLICT DO NOTHING`, [ahmed, r.id]);

  await q(c, `INSERT INTO chapter_members(chapter_slug,user_id) VALUES('lawyers-who-code',$1),('lawyers-who-design',$1) ON CONFLICT DO NOTHING`, [ahmed]);
  await q(c, `INSERT INTO builder_credits(user_id,balance) VALUES($1,50) ON CONFLICT DO NOTHING`, [ahmed]);
  // Work Space document (the wireframe's Services Agreement)
  const clauses = [
    { id: 'c1', heading: '1. Definitions', text_en: 'In this Agreement, "Deliverables" means the software, designs and documentation produced by the Supplier under a Statement of Work, and "Intellectual Property Rights" means all rights subsisting in copyright, patents, database rights and trade marks.', text_ar: 'في هذه الاتفاقية، تعني "المخرجات" البرمجيات والتصميمات والوثائق التي ينتجها المورد بموجب بيان العمل، وتعني "حقوق الملكية الفكرية" جميع الحقوق القائمة في حق المؤلف وبراءات الاختراع وحقوق قواعد البيانات والعلامات التجارية.' },
    { id: 'c2', heading: '2. Formation', text_en: 'This Agreement is concluded upon the exchange of two concordant expressions of the parties\' common intention.', text_ar: 'تنعقد هذه الاتفاقية بمجرد تبادل الطرفين التعبير عن إرادتين متطابقتين.' },
    { id: 'c3', heading: '3. Assignment of Intellectual Property', text_en: 'The Supplier hereby irrevocably assigns to the Client all right, title and interest in and to the Deliverables.', text_ar: 'يتنازل المورد بموجب هذا تنازلاً لا رجعة فيه للعميل عن جميع الحقوق والملكية والمصلحة في المخرجات.' }
  ];
  const doc = await q(c, `INSERT INTO documents(user_id,title,governing_law,language_mode,version,content) VALUES($1,'Services Agreement — El Gendy & Partners','EG','en',3,$2) RETURNING id`, [ahmed, JSON.stringify(clauses)]);
  await q(c, `INSERT INTO document_versions(document_id,version,content) VALUES($1,3,$2)`, [doc.rows[0].id, JSON.stringify(clauses)]);
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  seed(console.log).then(() => { console.log('seed complete'); return pool.end(); }).catch((e) => { console.error(e); process.exit(1); });
}

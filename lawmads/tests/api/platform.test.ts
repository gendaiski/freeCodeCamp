/** API integration tests — run against TEST_DATABASE_URL; the suite migrates and seeds it itself. */
process.env.NODE_ENV = 'test';
process.env.EXECUTOR = 'local';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../../apps/api/src/app.js';
import { pool } from '../../apps/api/src/core/db.js';
import { redis } from '../../apps/api/src/core/redis.js';
import { migrate } from '../../apps/api/src/db/migrate.js';
import { seed } from '../../apps/api/src/db/seed/index.js';

let server: Server; let base = '';
const email = `t${Date.now().toString(36)}@student.edu.eg`;
let access = '', refresh = '', adminAccess = '';
const j = async (path: string, init: RequestInit & { token?: string } = {}) => {
  const res = await fetch(base + path, { ...init, headers: { 'content-type': 'application/json', ...(init.token ? { authorization: `Bearer ${init.token}` } : {}), ...(init.headers ?? {}) } });
  const text = await res.text();
  let body: any = null; try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: res.status, body };
};
const post = (path: string, body: unknown, token?: string) => j(path, { method: 'POST', body: JSON.stringify(body), token });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Migrate + seed the test database on every run so fixtures (and their signatures) always match the running configuration.
before(async () => { await migrate(); await seed(); const app = createApp(); await new Promise<void>((r) => { server = app.listen(0, r); }); base = `http://127.0.0.1:${(server.address() as any).port}`; });
after(async () => { server.close(); await pool.end(); try { redis.disconnect(); } catch { /* */ } });

test('healthz reports postgres', async () => { const r = await j('/healthz'); assert.equal(r.status, 200); assert.equal(r.body.checks.postgres, true); });

test('register → login → refresh → me (academic email gets the student rate)', async () => {
  const reg = await post('/api/v1/auth/register', { email, password: 'correct-horse-9', firstName: 'Test', lastName: 'Lawmad', goal: 'design', jurisdictions: ['EG', 'GB'], acceptTerms: true });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  assert.equal(reg.body.user.isStudent, true);
  const dup = await post('/api/v1/auth/register', { email, password: 'correct-horse-9', firstName: 'T', lastName: 'L', acceptTerms: true });
  assert.equal(dup.status, 409);
  const bad = await post('/api/v1/auth/login', { email, password: 'wrong-password' });
  assert.equal(bad.status, 401);
  const login = await post('/api/v1/auth/login', { email, password: 'correct-horse-9' });
  assert.equal(login.status, 200); access = login.body.accessToken; refresh = login.body.refreshToken;
  const ref = await post('/api/v1/auth/refresh', { refreshToken: refresh });
  assert.equal(ref.status, 200); assert.notEqual(ref.body.refreshToken, refresh); refresh = ref.body.refreshToken;
  const replay = await post('/api/v1/auth/refresh', { refreshToken: login.body.refreshToken });
  assert.equal(replay.status, 401, 'rotated refresh token must not be reusable');
  const me = await j('/api/v1/auth/me', { token: access });
  assert.equal(me.status, 200); assert.equal(me.body.user.email, email);
  assert.equal((await j('/api/v1/auth/me')).status, 401);
});

test('catalog: stats are data-driven, 26 programs, LUID detail has 4 tracks and installments', async () => {
  const s = await j('/api/v1/catalog/stats');
  assert.equal(s.body.jurisdictions, 9); assert.equal(s.body.gradedExercises, 57); assert.equal(s.body.ideTracks, 19); assert.equal(s.body.languages, 18);
  const p = await j('/api/v1/catalog/programs'); assert.equal(p.body.programs.length, 26);
  const d = await j('/api/v1/catalog/programs/luid');
  assert.equal(d.body.code, 'LUID'); assert.equal(d.body.tracks.length, 4); assert.deepEqual(d.body.installments, { count: 3, eachCents: 14000 });
  assert.ok(d.body.tracks[1].items.some((i: any) => i.kind === 'lab' && i.exerciseId === 'html-3'));
  const l = await j('/api/v1/catalog/lessons/luid-a2-ui-design-patterns'); assert.equal(l.body.program.code, 'LUID'); assert.ok(l.body.next && l.body.prev);
});

test('track designer: Egypt + UK + LUID is International; tools-only issues no credential', async () => {
  const r = await post('/api/v1/track-designer/qualify', { jurisdictions: ['EG', 'GB'], craft: 'LUID' });
  assert.equal(r.body.tier, 'international'); assert.equal(r.body.rarity, 'rarest');
  const t = await post('/api/v1/track-designer/qualify', { jurisdictions: ['EG', 'AE'], craft: 'PYTHON' });
  assert.equal(t.body.credentialIssues, false);
});

test('IDE: languages, exercise projection, run, submit → graded → credits → transcript; solution gate', async () => {
  const langs = await j('/api/v1/ide/languages', { token: access });
  assert.equal(langs.body.languages.length, 19); assert.equal(langs.body.executor, 'local');
  const ex = await j('/api/v1/ide/exercises/javascript-2', { token: access });
  assert.equal(ex.status, 200); assert.equal(ex.body.hidden_tests, 2); assert.equal(ex.body.sample_tests.length, 1);
  const run = await post('/api/v1/ide/run', { exerciseId: 'javascript-2', code: 'const [a,b]=require("fs").readFileSync(0,"utf8").trim().split(/\\s+/).map(Number);console.log(a+b);', stdin: '3 4' }, access);
  assert.equal(run.status, 200); assert.equal(run.body.stdout.trim(), '7');
  // a wrong submission first → failed attempt
  const bad = await post('/api/v1/ide/submissions', { exerciseId: 'javascript-2', code: 'console.log(0)' }, access);
  assert.equal(bad.status, 202);
  let s: any;
  for (let i = 0; i < 60; i++) { s = (await j(`/api/v1/ide/submissions/${bad.body.submissionId}`, { token: access })).body; if (['graded', 'error', 'runtime_error'].includes(s.status)) break; await sleep(250); }
  assert.equal(s.status, 'graded'); assert.equal(s.passed, false); assert.equal(s.score, 0);
  assert.equal((await j('/api/v1/ide/exercises/javascript-2/solution', { token: access })).status, 403, 'solution locked until 3 failed attempts');
  const good = await post('/api/v1/ide/submissions', { exerciseId: 'javascript-2', code: ex.body.starter_code.replace('// TODO', 'console.log(a + b);') }, access);
  for (let i = 0; i < 60; i++) { s = (await j(`/api/v1/ide/submissions/${good.body.submissionId}`, { token: access })).body; if (s.status === 'graded') break; await sleep(250); }
  assert.equal(s.status, 'graded', JSON.stringify(s.detail)); assert.equal(s.passed, true); assert.equal(s.score, 100); assert.equal(s.credits, 3);
  assert.equal(s.detail.tests.length, 3);
  assert.equal(s.detail.tests[1].expected, undefined, 'hidden test outputs are not leaked');
  const tr = await j('/api/v1/me/transcript', { token: access });
  assert.equal(tr.body.totals.tech, 3); assert.ok(tr.body.entries.some((e: any) => e.item === 'Variables' && e.type === 'IDE Exercise'));
  // idempotent credit: resubmitting does not double-award
  const again = await post('/api/v1/ide/submissions', { exerciseId: 'javascript-2', code: ex.body.starter_code.replace('// TODO', 'console.log(a + b);') }, access);
  for (let i = 0; i < 60; i++) { s = (await j(`/api/v1/ide/submissions/${again.body.submissionId}`, { token: access })).body; if (s.status === 'graded') break; await sleep(250); }
  assert.equal((await j('/api/v1/me/transcript', { token: access })).body.totals.tech, 3);
  assert.equal((await j('/api/v1/ide/exercises/javascript-2/solution', { token: access })).status, 200, 'solution unlocks once completed');
});

test('IDE: structural grading (HTML landing page) reports 2 of 4 checks then passes', async () => {
  const ex = await j('/api/v1/ide/exercises/html-3', { token: access });
  const partial = await post('/api/v1/ide/submissions', { exerciseId: 'html-3', code: '<html><body><nav><a>x</a></nav><h1>Firm</h1><button>Go</button></body></html>' }, access);
  let s: any; for (let i = 0; i < 40; i++) { s = (await j(`/api/v1/ide/submissions/${partial.body.submissionId}`, { token: access })).body; if (s.status === 'graded') break; await sleep(100); }
  assert.equal(s.score, 75); assert.equal(s.passed, false); assert.ok(s.detail.checks.find((c: any) => /background-color/.test(c.name) && !c.passed));
  const run = await post('/api/v1/ide/run', { exerciseId: 'html-3', code: ex.body.starter_code }, access);
  assert.equal(run.body.checks.length, 4);
  const sol = await j('/api/v1/ide/exercises/html-3/solution', { token: access }); assert.equal(sol.status, 403);
});

test('IDE: n8n structural grading needs valid JSON', async () => {
  const bad = await post('/api/v1/ide/submissions', { exerciseId: 'n8n-1', code: '{ not json' }, access);
  let s: any; for (let i = 0; i < 40; i++) { s = (await j(`/api/v1/ide/submissions/${bad.body.submissionId}`, { token: access })).body; if (s.status === 'graded') break; await sleep(100); }
  assert.equal(s.score, 0);
});

test('quiz attempt: 80% passes, credits once', async () => {
  const q = await j('/api/v1/catalog/quizzes/luid-ui-patterns-check');
  assert.equal(q.body.questions.length, 10);
  const answers: Record<string, string> = {}; for (const [i, qq] of q.body.questions.entries()) answers[qq.id] = i < 8 ? ['B', 'A', 'B', 'B', 'B', 'A', 'B', 'B'][i]! : 'D';
  const r = await post('/api/v1/me/quizzes/luid-ui-patterns-check/attempts', { answers }, access);
  assert.equal(r.status, 200); assert.equal(r.body.scorePct, 80); assert.equal(r.body.passed, true); assert.equal(r.body.creditsAwarded.tech, 2);
  const r2 = await post('/api/v1/me/quizzes/luid-ui-patterns-check/attempts', { answers }, access);
  assert.equal(r2.body.creditsAwarded.tech, 0);
});

test('commerce: DELTA30 quote = $273, mock checkout enrolls, paid enrolment marks first item "now"', async () => {
  const quote = await post('/api/v1/commerce/quote', { sku: 'certificate', ref: 'LUID', promo: 'DELTA30' }, access);
  assert.equal(quote.body.totalCents, 27300); assert.equal(quote.body.discount.kind, 'promo');
  const declined = await post('/api/v1/commerce/checkout', { sku: 'certificate', ref: 'LUID', promo: 'DELTA30', card: { number: '4000 0000 0000 0002', expiry: '12/29', cvc: '123' } }, access);
  assert.equal(declined.status, 400);
  assert.equal((await post('/api/v1/me/enrollments', { programCode: 'LUID' }, access)).status, 403, 'paid program needs checkout');
  const paid = await post('/api/v1/commerce/checkout', { sku: 'certificate', ref: 'LUID', promo: 'DELTA30', installments: true, card: { number: '4242 4242 4242 4242', expiry: '12/29', cvc: '123' } }, access);
  assert.equal(paid.status, 201, JSON.stringify(paid.body)); assert.equal(paid.body.dueTodayCents, 10100, '(27300 + 3000 premium) / 3, rounded up'); assert.equal(paid.body.fulfilment.kind, 'enrollment');
  const dash = await j('/api/v1/me/dashboard', { token: access });
  assert.equal(dash.body.activeProgram.code, 'LUID'); assert.ok(dash.body.continueLearning.nowItem);
  const orders = await j('/api/v1/commerce/orders', { token: access }); assert.equal(orders.body.orders[0].status, 'paid');
  // complete a law lesson → law credits
  const detail = await j('/api/v1/catalog/programs/LUID', { token: access });
  const law = detail.body.tracks[2].items.find((i: any) => i.kind === 'law');
  const done = await post(`/api/v1/me/items/${law.id}/complete`, {}, access);
  assert.equal(done.status, 200);
  assert.equal((await j('/api/v1/me/transcript', { token: access })).body.totals.law, 4);
});

test('badges: buy a badge exam, book, sit the paper, earn a signed badge, verify publicly', async () => {
  assert.equal((await post('/api/v1/badges/EG/book', {}, access)).status, 403);
  const paid = await post('/api/v1/commerce/checkout', { sku: 'badge_exam', ref: 'EG', card: { number: '4242424242424242', expiry: '01/30', cvc: '999' } }, access);
  assert.equal(paid.status, 201); assert.equal(paid.body.totalCents, 5530, 'student rate 30% off $79');
  const book = await post('/api/v1/badges/EG/book', {}, access); assert.equal(book.status, 201);
  const paper = await j('/api/v1/badges/EG/paper', { token: access }); assert.ok(paper.body.questions.length >= 10);
  const key = ['A', 'B', 'B', 'C', 'B', 'B']; const answers: Record<string, string> = {};
  for (const [i, q] of paper.body.questions.entries()) answers[q.id] = key[i] ?? 'A';
  const sit = await post('/api/v1/badges/EG/sit', { answers }, access);
  assert.equal(sit.status, 200, JSON.stringify(sit.body)); assert.equal(sit.body.passed, true); assert.match(sit.body.verificationId, /^LWM-\d{4}-\d{4}$/);
  assert.equal(sit.body.ladder.tier, 'local');
  const v = await j(`/api/v1/verify/${sit.body.verificationId}`);
  assert.equal(v.status, 200); assert.equal(v.body.kind, 'badge'); assert.equal(v.body.signatureValid, true); assert.equal(v.body.revoked, false); assert.match(v.body.qr, /^data:image\/png/);
  const detail = await j('/api/v1/badges/egypt', { token: access }); assert.equal(detail.body.mine.score_pct >= 70, true);
});

test('public verification of the seeded certificate LWM-2026-0342', async () => {
  const v = await j('/api/v1/verify/lwm-2026-0342');
  assert.equal(v.status, 200); assert.equal(v.body.kind, 'certificate'); assert.equal(v.body.holder, 'Ahmed El Gendy'); assert.equal(v.body.signatureValid, true); assert.equal(v.body.ladder, 'Regional Lawmad');
  assert.equal((await j('/api/v1/verify/LWM-0000-0000')).status, 404);
});

test('demo dashboard matches the wireframe numbers', async () => {
  const login = await post('/api/v1/auth/login', { email: 'aelgendy@thelawtechlabs.com', password: 'lawmads-demo' });
  assert.equal(login.status, 200); adminAccess = login.body.accessToken;
  const d = await j('/api/v1/me/dashboard', { token: adminAccess });
  assert.equal(d.body.credits.tech, 124); assert.equal(d.body.credits.law, 96); assert.equal(d.body.ladder.tier, 'regional'); assert.equal(d.body.streak.days, 7);
  assert.equal(d.body.badges.length, 2); assert.equal(d.body.certificates[0].verification_id, 'LWM-2026-0342'); assert.equal(d.body.jurisdictions.next.code, 'GB');
  assert.equal(d.body.activeProgram.code, 'LUID');
});

test('law database: bilingual search hits the same provision in both languages, with provenance', async () => {
  const en = await j('/api/v1/law/search?q=' + encodeURIComponent('contract makes the law'));
  assert.ok(en.body.results.some((r: any) => r.id === 'eg-cc-1948-art147'));
  const ar = await j('/api/v1/law/search?q=' + encodeURIComponent('العقد شريعة المتعاقدين'));
  assert.equal(ar.body.language, 'ar'); assert.ok(ar.body.results.some((r: any) => r.id === 'eg-cc-1948-art147'));
  const a = await j('/api/v1/law/articles/eg-cc-1948-art147'); assert.equal(a.body.provenance.human_verified, true); assert.equal(a.body.construing.length, 1);
  const ov = await j('/api/v1/law'); assert.equal(ov.body.stats.totalEntries, 143814); assert.equal(ov.body.stats.egyptianCorpus, 47214);
  const key = await post('/api/v1/law/api-keys', { tier: 'api' }, access); assert.equal(key.status, 201); assert.match(key.body.key, /^lwm_live_/);
  const keyed = await j('/api/v1/law/search?q=moral', { headers: { 'x-api-key': key.body.key } }); assert.equal(keyed.status, 200);
  assert.equal((await j('/api/v1/law/search?q=moral', { headers: { 'x-api-key': 'lwm_live_nope' } })).status, 400);
});

test('AI models: precedent answer is grounded with citations and audited', async () => {
  const m = await j('/api/v1/ai/models'); assert.equal(m.body.models.length, 6);
  const g = await post('/api/v1/ai/generate', { model: 'lawmad-precedent', prompt: 'هل يجوز التنازل عن حق المؤلف الأدبي؟', jurisdiction: 'EG' }, access);
  assert.equal(g.status, 200); assert.ok(g.body.citations.length >= 1, JSON.stringify(g.body)); assert.equal(g.body.supervision.humanReview, 'required'); assert.ok(g.body.confidence > 0.5);
  assert.equal((await post('/api/v1/ai/generate', { model: 'nope', prompt: 'x' }, access)).status, 404);
  assert.equal((await j('/api/v1/ai/history', { token: access })).body.generations.length >= 1, true);
});

test('workspace: create from template, insert authority, assist, version and revert', async () => {
  const c = await post('/api/v1/workspace/documents', { title: 'Services Agreement', template: 'services', governingLaw: 'EG' }, access);
  assert.equal(c.status, 201);
  const id = c.body.id;
  const auth = await post(`/api/v1/workspace/documents/${id}/authorities`, { clauseId: 'c3', articleId: 'eg-ipl-2002-art149' }, access);
  assert.equal(auth.status, 201); assert.equal(typeof auth.body.supports, 'boolean');
  const find = await post(`/api/v1/workspace/documents/${id}/assist`, { action: 'find-authority', clauseId: 'c2' }, access);
  assert.ok(find.body.suggestions.length >= 1);
  const doc = await j(`/api/v1/workspace/documents/${id}`, { token: access }); assert.equal(doc.body.authorities.length, 1); assert.equal(doc.body.stats.authorities, 1);
  const save = await j(`/api/v1/workspace/documents/${id}`, { method: 'PUT', token: access, body: JSON.stringify({ content: [...doc.body.content, { id: 'c4', heading: '4. Governing law', text_en: 'Egypt.', text_ar: 'مصر.' }] }) });
  assert.equal(save.body.version, 2);
  const rev = await post(`/api/v1/workspace/documents/${id}/revert`, { version: 1 }, access); assert.equal(rev.body.version, 3);
  assert.equal((await j(`/api/v1/workspace/documents/${id}`, { token: access })).body.content.length, 3);
});

test('community + shop + content + bookings + builder', async () => {
  const cm = await j('/api/v1/community', { token: access });
  assert.equal(cm.body.chapters.length, 4); assert.ok(cm.body.stats.members >= 2941);
  const join = await post('/api/v1/community/chapters/lawyers-who-code/join', {}, access); assert.equal(join.body.joined, true);
  const post1 = cm.body.posts[0];
  const v1 = await post(`/api/v1/community/posts/${post1.id}/vote`, {}, access); assert.equal(v1.body.voted, true);
  const v2 = await post(`/api/v1/community/posts/${post1.id}/vote`, {}, access); assert.equal(v2.body.voted, false);
  const cmt = await post(`/api/v1/community/posts/${post1.id}/comments`, { body: 'Nice edge-case handling.' }, access); assert.equal(cmt.status, 201);
  assert.equal((await j('/api/v1/shop/products')).body.products.length, 3);
  const blog = await j('/api/v1/content/blog'); assert.equal(blog.body.stats.posts, 6);
  const pod = await j('/api/v1/content/podcast'); assert.equal(pod.body.stats.episodes, 48); assert.equal(pod.body.latest.number, 48);
  const slots = await j('/api/v1/bookings/slots'); assert.equal(slots.body.slots.length, 4);
  const bk = await post('/api/v1/bookings', { fullName: 'Nour A.', email: 'nour@example.com', interest: 'AI & Automation track', slot: slots.body.slots[0].at }); assert.equal(bk.status, 201);
  const proj = await post('/api/v1/builder/projects', { brief: 'El Gendy & Partners is a corporate and commercial law firm in Cairo. Bilingual Arabic and English. Practice areas: M&A, e-commerce, data protection.', style: 'Editorial', languages: ['en', 'ar'] }, access);
  assert.equal(proj.status, 201);
  const gen = await post(`/api/v1/builder/projects/${proj.body.id}/generate`, {}, access);
  assert.equal(gen.status, 200, JSON.stringify(gen.body)); assert.equal(gen.body.result.pages, 6); assert.ok(gen.body.result.images >= 4); assert.equal(gen.body.result.videos, 1);
  const pub = await post(`/api/v1/builder/projects/${proj.body.id}/publish`, { domain: 'elgendy-partners.law' }, access); assert.equal(pub.body.published, true);
});

test('admin: RBAC, stats, capstone review issues a certificate', async () => {
  assert.equal((await j('/api/v1/admin/stats', { token: access })).status, 403);
  const stats = await j('/api/v1/admin/stats', { token: adminAccess }); assert.equal(stats.status, 200); assert.ok(stats.body.users >= 5);
  const me = await j('/api/v1/auth/me', { token: access });
  // grant the test user enough credits then review the capstone
  const review = await post('/api/v1/admin/capstones/review', { userId: me.body.user.id, programCode: 'LDT', score: 92 }, adminAccess);
  assert.equal(review.status, 200);
  // LDT needs 8/8 credits: capstone gives 8/8, so the certificate issues
  assert.equal(review.body.issued, true, JSON.stringify(review.body));
  const v = await j(`/api/v1/verify/${review.body.verificationId}`); assert.equal(v.body.kind, 'certificate'); assert.equal(v.body.program, 'LDT');
  const ex = await post('/api/v1/admin/exercises', { title: 'Admin test', language: 'python', starter_code: 'print()', solution_code: 'print("x")', test_cases: [{ name: 'x', input: '', expected_output: 'x', hidden: false }] }, adminAccess);
  assert.equal(ex.status, 201); assert.equal(ex.body.published, false);
  assert.equal((await j('/api/v1/ide/exercises/' + ex.body.id, { token: access })).status, 403, 'unpublished exercise hidden from students');
  await post(`/api/v1/admin/exercises/${ex.body.id}/publish`, {}, adminAccess);
  assert.equal((await j('/api/v1/ide/exercises/' + ex.body.id, { token: access })).status, 200);
  assert.equal((await j(`/api/v1/admin/exercises/${ex.body.id}`, { method: 'DELETE', token: adminAccess })).status, 204);
});

test('Phase-1 aliases and HMAC-signed internal dispatch', async () => {
  assert.equal((await j('/api/v1/exercises', { token: access })).status, 200);
  const r = await post('/api/v1/internal/dispatch', { submissionId: '00000000-0000-0000-0000-000000000000' });
  assert.equal(r.status, 401);
  const { hmacHex } = await import('../../apps/api/src/core/crypto.js');
  const body = JSON.stringify({ submissionId: '00000000-0000-0000-0000-000000000000' });
  const ok = await fetch(base + '/api/v1/internal/dispatch', { method: 'POST', headers: { 'content-type': 'application/json', 'x-lawmads-signature': hmacHex(body) }, body });
  assert.equal(ok.status, 202);
});

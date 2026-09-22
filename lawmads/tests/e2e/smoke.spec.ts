import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const API = process.env.E2E_API_URL ?? 'http://localhost:4000';
const SHOTS = process.env.E2E_SHOTS ?? '';
const EMAIL = process.env.E2E_EMAIL ?? 'aelgendy@thelawtechlabs.com';
const PASSWORD = process.env.E2E_PASSWORD ?? 'lawmads-demo';

// Routes that must render for an anonymous visitor.
const PUBLIC: [string, RegExp][] = [
  ['/', /Delta Generation|Lawmads/i],
  ['/programs', /Program/i],
  ['/programs/LDT', /Legal Design/i],
  ['/learn/luid/luid-a1-basic-ui-principles', /UI|Lesson|Sign in/i],
  ['/quiz/luid-ui-patterns-check', /quiz|Sign in/i],
  ['/ide', /language|IDE/i],
  ['/ide/python', /Python/i],
  ['/ide/python/python-1', /Python/i],
  ['/community', /Community|Chapter/i],
  ['/shop', /Shop|product/i],
  ['/law', /Law|jurisdiction/i],
  ['/law/explorer', /Explorer|search/i],
  ['/ai', /model/i],
  ['/pricing', /Pricing|plan/i],
  ['/schedule', /Schedule|book/i],
  ['/checkout/certificate', /Checkout|Sign in/i],
  ['/badges', /Badge|jurisdiction/i],
  ['/badges/EG', /Egypt/i],
  ['/track-designer', /Track Designer|craft/i],
  ['/courses', /Course/i],
  ['/courses/figma-for-legal-designers', /Figma/i],
  ['/blog', /Blog|post/i],
  ['/blog/why-the-delta-generation-needs-two-credentials', /Delta Generation/i],
  ['/builder', /Builder/i],
  ['/podcast', /Podcast|episode/i],
  ['/podcast/the-lawyer-who-shipped-the-regulators-own-api', /regulator/i],
  ['/signin', /Sign in|Email/i],
  ['/get-started', /Get started|build/i],
  ['/verify/LWM-2026-0342', /LWM-2026-0342/],
  ['/company/what-is-lawmads', /Lawmads/i],
  ['/company/success-stories', /Success|stories/i],
  ['/no-such-route-xyz', /not found|404/i]
];

// Routes that require a session.
const PRIVATE: [string, RegExp][] = [
  ['/dashboard', /credit|Dashboard|Ahmed/i],
  ['/dashboard/transcript', /transcript|credit/i],
  ['/dashboard/certificates', /certificate/i],
  ['/dashboard/settings', /setting|order/i],
  ['/workspace', /Workspace|document/i],
  ['/checkout/certificate', /Checkout|total/i],
  ['/admin', /Admin|user/i],
  ['/admin/exercises', /exercise/i]
];

interface Problem { route: string; kind: 'console' | 'pageerror' | 'request'; detail: string }
const problems: Problem[] = [];

function watch(page: Page, route: string) {
  // Resource failures are reported by requestfailed (with their URL); third-party font hosts are optional and skipped.
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push({ route, kind: 'console', detail: m.text().slice(0, 300) }); });
  // ERR_ABORTED is the browser cancelling an in-flight load on navigation (or a Vite dev reload), not a server failure.
  page.on('requestfailed', (r) => { if (!/fonts\.(googleapis|gstatic)\.com/.test(r.url()) && r.failure()?.errorText !== 'net::ERR_ABORTED') problems.push({ route, kind: 'request', detail: `FAILED ${r.failure()?.errorText ?? ''} ${r.url()}` }); });
  page.on('pageerror', (e) => problems.push({ route, kind: 'pageerror', detail: String(e).slice(0, 300) }));
  page.on('response', (r) => {
    const u = r.url();
    // 401 on private data for anonymous visitors is expected; everything else >= 400 is a finding.
    if (u.includes('/api/') && r.status() >= 400 && r.status() !== 401) problems.push({ route, kind: 'request', detail: `${r.status()} ${r.request().method()} ${u.replace(API, '')}` });
  });
}

async function visit(page: Page, route: string, expectText: RegExp, tag: string) {
  await page.goto(route, { waitUntil: 'networkidle' });
  await expect(page.locator('body')).toContainText(expectText, { timeout: 15_000 });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${tag}-${route.replace(/[^a-z0-9]+/gi, '_') || 'root'}.png`, fullPage: false });
}

test.beforeAll(() => { if (SHOTS) mkdirSync(SHOTS, { recursive: true }); });

test('API is healthy', async ({ request }) => {
  const r = await request.get(`${API}/healthz`);
  expect(r.ok()).toBeTruthy();
  const j = await r.json();
  expect(j.checks.postgres).toBe(true);
});

test('all public routes render for an anonymous visitor', async ({ page }) => {
  for (const [route, re] of PUBLIC) {
    watch(page, route);
    await visit(page, route, re, 'anon');
    page.removeAllListeners();
  }
});

test('sign in, then every private route renders', async ({ page }) => {
  watch(page, '/signin');
  await page.goto('/signin', { waitUntil: 'networkidle' });
  await page.getByLabel('Email address').fill(EMAIL);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.startsWith('/signin'), { timeout: 15_000 });
  page.removeAllListeners();
  for (const [route, re] of PRIVATE) {
    watch(page, route);
    await visit(page, route, re, 'auth');
    page.removeAllListeners();
  }
});

test('IDE: run and submit a Python exercise end to end', async ({ page, request }) => {
  const login = await request.post(`${API}/api/v1/auth/login`, { data: { email: EMAIL, password: PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const { accessToken } = await login.json();
  const ex = await (await request.get(`${API}/api/v1/ide/exercises/python-1`)).json();
  const sol = await (await request.get(`${API}/api/v1/ide/exercises/python-1/solution`, { headers: { authorization: `Bearer ${accessToken}` } })).json();
  const code: string = sol.solution_code ?? ex.starter_code;
  const run = await request.post(`${API}/api/v1/ide/run`, { headers: { authorization: `Bearer ${accessToken}` }, data: { exerciseId: 'python-1', code } });
  expect(run.ok(), await run.text()).toBeTruthy();
  const sub = await request.post(`${API}/api/v1/ide/submissions`, { headers: { authorization: `Bearer ${accessToken}` }, data: { exerciseId: 'python-1', code } });
  expect(sub.ok(), await sub.text()).toBeTruthy();
  const s = await sub.json();
  const id = s.submissionId;
  let final: any = s;
  // Submissions are graded asynchronously (queued → running → graded | error).
  for (let i = 0; i < 20 && !['graded', 'error'].includes(final.status); i++) {
    await new Promise((r) => setTimeout(r, 500));
    final = await (await request.get(`${API}/api/v1/ide/submissions/${id}`, { headers: { authorization: `Bearer ${accessToken}` } })).json();
  }
  expect(final.status).toBe('graded');
  expect(final.passed).toBe(true);
  expect(final.score).toBe(100);
  void page;
});

test.afterAll(() => {
  if (problems.length) {
    console.log('\n=== browser findings ===');
    for (const p of problems) console.log(`${p.kind.padEnd(9)} ${p.route.padEnd(50)} ${p.detail}`);
  }
  expect(problems, JSON.stringify(problems, null, 1)).toEqual([]);
});

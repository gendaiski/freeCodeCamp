# Lawmads® — Platform Specification & Tech Stack

Version 1.0 · 2026-09-22 · Companion documents: `REVIEW.md` (wireframe review), `ACTION-PLAN.md` (build sequence), `DEBUG-REVIEW.md` (verification), `openapi.yaml` (API contract, also served at `/api/v1/openapi.yaml`).

---

## 1. What the platform is

Lawmads is The Legal Technology Academy: lawyers learn design, development and data science **by practice**, always paired with the law that governs the craft. Every credential pairs one technology track with the law of one or two jurisdictions, is graded automatically where a machine can grade and by a human where it cannot, and is issued as a digitally signed, publicly verifiable certificate.

Personas: **student** (lawyer / law student), **instructor** (authors exercises, reviews capstones), **admin** (platform, users, flags, revocations), **verifier** (anonymous: employer or bar checking a credential), **API consumer** (law-database keys).

Surfaces (28 routed views + 3 auxiliary): Home · Programs · Program detail · Lesson player · Quiz · IDE launcher · IDE playground (incl. n8n canvas) · Dashboard (5 tabs) · Community · Lawyer Work Space AI · Law Database · Law Explorer · Legal LLM Models · Pricing · Schedule a call · Checkout · Badge exams · Badge detail · Track designer · E-Shop · Get started · Sign in · Courses · Course detail · Blog · Post · Podcast · Episode · Web Builder · Public verification · Company pages · Admin.

---

## 2. Tech stack

| Layer | Choice | Why |
|---|---|---|
| Language | **TypeScript 5.6**, `strict`, `noUncheckedIndexedAccess`, ESM (`NodeNext`) end to end | One language across API, web and shared rules; the grading, pricing and ladder rules live in `packages/shared` and are executed identically by the server and the UI. |
| Runtime | **Node 22** | LTS; native `fetch`, `node:test`, `crypto.scrypt`. |
| API | **Express 4** + `zod` + `pino` + `helmet` + `cors` | Boring, well-understood, easy to hire for; every body is validated by a zod schema before it reaches a service. |
| Database | **PostgreSQL 16** (`pg`), plain SQL migrations | Full-text search (English + Arabic via `ar_norm()`), `pg_trgm`, generated `tsvector` columns, transactions for grading/fulfilment. No ORM — the SQL is the documentation. |
| Cache / queues | **Redis 7** (`ioredis`) | Rate limits, refresh-token registry, free-tier runtime quota, login lockout. Every use has an in-memory fallback so a dev box without Redis still works. |
| Code execution | **Judge0 CE** (self-hosted, isolated Docker network) behind an `Executor` interface; `LocalExecutor` for dev/test | Judge0 gives 18 language sandboxes with limits and callbacks. The interface keeps the grading pipeline independent of the sandbox; config refuses `local` in production. |
| Web | **React 18 + Vite 5 + react-router 6** | Fast builds, route-level code splitting (each page is its own chunk), no framework lock-in. |
| Editor | **Monaco** (`@monaco-editor/react`, bundled locally with workers) | The VS Code editor; bundled so the IDE works offline and under CSP. |
| Styling | Hand-written CSS design system (`styles.css`, tokens, logical properties) | Exact match to the wireframe's editorial look; logical properties (`inset-inline-start`, `margin-inline`) make RTL free. |
| Auth | JWT access (15 min, HS256) + rotating opaque refresh tokens; scrypt passwords; in-house TOTP | No auth SaaS dependency; refresh rotation and per-account lockout cover the common attacks. |
| Credentials | HMAC-SHA256 over canonical JSON + QR (`qrcode`) | Verifiable offline from the payload; a signing service (KMS) can replace the key without changing the format. |
| AI | `AiProvider` interface: `MockProvider` (default) / `AnthropicProvider` (`@anthropic-ai/sdk`, `claude-opus-5`) | Retrieval-grounded: every generation is given law-database passages and returns citations + confidence + a supervision notice; all generations are audited. |
| Payments | `PaymentProvider`: `MockProvider` (default, accepts `4242…`) / `StripeProvider` | Quote → charge → fulfil is provider-agnostic; installments and promo/student rules are in `packages/shared/pricing.ts`. |
| Tests | `node:test` (unit + integration) · **Playwright 1.48** (browser) | No test-framework dependency for the server; real Postgres/Redis in CI. |
| Tooling | npm workspaces, `tsx`, ESLint 9 (`typescript-eslint`), GitHub Actions | |
| Delivery | Docker Compose: `postgres`, `redis`, `api`, `web` (nginx), `judge0-server/workers/db/redis` on `judge0-net` | One command brings up the whole stack; Judge0 has no route to the app database. |

Additions relative to the original Build Brief, with reasons: **Monaco bundled locally** (offline/CSP, see DEBUG-REVIEW F3); **`ar_norm()` migration** (Arabic search needs normalisation of alef/ya/ta-marbuta and clitic variants — trigram alone ignores non-ASCII); **Redis** (quota and token registry needed a shared store once the API scales past one process); **Playwright** (the brief asked for a debug review — it needed a browser).

---

## 3. Architecture

```
lawmads/
├─ packages/shared/     pure rules + DTO types (no I/O): jurisdictions, languages, grading, credits, ladder, trackDesigner, pricing
├─ apps/api/            Express API — src/core (config, db, redis, crypto, auth, http, errors, rateLimit, audit, hmac)
│                                    src/modules/<domain>/{service,routes}.ts  (auth, catalog, learning, credentials, ide, trackdesigner,
│                                    commerce, community, lawdb, ai, builder, workspace, content, admin)
│                                    src/db/{migrate.ts, seed/}
├─ apps/web/            React SPA — src/lib (api client, auth, i18n, hooks, format), src/components (Shell, ui, CodeEditor, Markdown), src/pages (32)
├─ db/migrations/       001_init.sql (65 tables) · 002_arabic_search.sql
├─ tests/               api/platform.test.ts (integration) · e2e/smoke.spec.ts (browser)
├─ docs/                REVIEW, ACTION-PLAN, SPECS, DEBUG-REVIEW, openapi.yaml, screenshots/
├─ docker-compose.yml · judge0/judge0.conf · .github/workflows/ci.yml · .env.example
```

**Modular monolith.** Each domain module owns its routes and service; modules talk through services, never through each other's tables' internals. `modules/register.ts` mounts them under `/api/v1/<prefix>`; `ideCompatRouter` additionally aliases the Phase‑1 paths (`/run`, `/submissions`, `/exercises`, `/judge0/callback`, `/internal/dispatch`) at `/api/v1/` so the existing WordPress plugin keeps working.

**Request path.** `helmet` → CORS allow-list → JSON (1 MB, raw body kept for HMAC) → pino access log → router → `optionalAuth`/`requireAuth`/`requireRole` → `rateLimit` → `h(handler)` (async error capture) → `parseBody(zodSchema)` → service → `errorHandler` (HttpError / ZodError / body-parser / `22P02` / 500).

**Background loops** (`apps/api/src/index.ts`): Judge0 reconciliation every 15 s (submissions stuck in `running` are re-fetched by token and finalised), outbox dispatch every 10 s (`events` table → WordPress grade sync when configured).

**Executors.** `LocalExecutor` runs code in a child process with a timeout (Python, Node, C, C++, Java, Go, PHP, Ruby, Rust, SQL via `sqlrunner.py`); `Judge0Executor` submits base64 sources with `callback_url`, and `fetch(token)` supports the reconciler. Structural graders (HTML/CSS landing page, React/TS component, n8n workflow JSON, Cursor prompts) run in-process without a sandbox.

**Providers.** `PaymentProvider` and `AiProvider` are chosen by env at boot; mocks are the default so the whole platform runs with zero external accounts.

---

## 4. Functional specification (rules the code enforces)

### 4.1 Identity & access
- Register (email, password ≥ 8, names, optional academic email) → session `{ accessToken (15 min), refreshToken (14 days, single use), user }`. Refresh rotates; reuse of a consumed refresh token is rejected. Logout revokes.
- Passwords: scrypt (N=2^15) with per-user salt. 2FA: TOTP (RFC 6238), setup → enable with a valid code → disable.
- Roles: `student`, `instructor`, `admin` (array). `requireRole` gates admin/instructor routes; destructive admin actions (delete exercise, revoke certificate, change roles, set flags) need `admin`.
- Lockout: 10 failed sign-ins per account per 15 min → 429; plus 30 auth requests / min / IP.
- Phase‑1 SSO: `POST /auth/sso` accepts the WordPress plugin's JWT (`WP_JWT_ISSUER`/`AUDIENCE`), links or creates the user by `wp_user_id`, returns a native session.
- Academic email (`.edu`, `.ac.`, `.edu.<cc>`) marks `academic_verified` → student pricing.

### 4.2 Catalogue & learning
- 8 tracks, 26 programs (certifications + diplomas), each with tracks A/B/C of curriculum items (`video`, `reading`, `lab` = IDE exercise, `quiz`, `capstone`), price, installments (3 × ceil(price/3)), credits (tech/law).
- Enrolment is free-of-charge for open lessons; paid programs are enrolled on fulfilment of an order. Completing an item awards credits once (idempotent); lessons award on completion, labs on a passing submission, quizzes on ≥ pass mark (80 %) — first pass only.
- Transcript = credit ledger grouped by program and half (tech / law); dashboard aggregates credits, streak (consecutive `activity_days`, survives until midnight UTC), jurisdictions, ladder, "jump back in" and a week plan.
- 17 courses (short, tool-focused) with their own enrolment.

### 4.3 IDE & grading
- 19 tracks (18 programming languages counting HTML and CSS separately, plus agentic-AI tracks n8n/Cursor), 57 graded exercises (3 per track: beginner → intermediate → advanced), each with starter code, visible sample tests, hidden tests, 2 hints, reference solution.
- `run` executes with user stdin, unjudged. `submissions` grades against all test cases: output normalised (CRLF, trailing whitespace), weighted score, `passed` when score ≥ pass mark and no error status; result stored with per-test detail (hidden tests never reveal expected output).
- Solution gate: the reference solution is revealed only after `reveal_solution_after` failed attempts (or completion).
- Free tier: runtime quota `FREE_TIER_RUNTIME_MINUTES` per month per user (Redis); paid plans unlimited. Run/submit limited to 60/min/user.
- Judge0 path: submission stored `queued` → dispatched (HMAC-signed internal call or direct) → `running` → callback (`PUT`/`POST /judge0/callback`) finalises under a status guard (a late duplicate callback cannot regress a `graded` row) → outbox event → credits.

### 4.4 Credentials
- **Certificate** (program): issued when all curriculum items are complete **and** the capstone is reviewed ≥ 70 % by an instructor/admin (`/admin/capstones/review`). Payload (holder, program, score, credits, issued at) is canonicalised and HMAC-signed; `verification_id` = `LWM-YYYY-NNNN` from `verification_seq`.
- **Badge** (jurisdiction): buy the exam SKU → book a sitting → sit the paper (server-graded MCQ, pass ≥ 70 %) → signed badge.
- **Ladder** (`packages/shared/ladder.ts`): Local (1 jurisdiction + craft) · Regional (2, same region) · International (2, different regions/legal families) · Global (3) · Master (4 + capstone). Flag `ladder.requireCertificates` additionally requires a certificate.
- **Public verification** `GET /verify/:id` (rate-limited, case-insensitive): kind, holder, program/jurisdiction, signature validity, revocation, ladder, QR. Every lookup is logged (`verification_log`). Admin can revoke with a reason.

### 4.5 Commerce
- SKUs in cents (`pricing.ts`): plans (free, pro monthly $29, pro annual $228 = $19/mo, student monthly $13), certificate $390, diploma $890, badge exam $79 (bundle 9 × $79 anchored), enterprise seat $59/mo min 10 seats, editor add-on, DB tiers, builder credit packs.
- Quote rules: promo `DELTA30` (30 % off pro annual, first 500 redemptions) **or** 30 % verified-student rate — **never stacked, the better wins**; installments = 3 × ceil((price + $30 fee)/3), first due today.
- Checkout: quote → provider charge → order + payment rows → fulfilment in one transaction (enrolment / subscription / badge exam entitlement / credits) → receipt. Refund within 14 days via provider, order marked. Bookings: 30-min slots, video or WhatsApp.

### 4.6 Community, shop, content
- Chapters (Code, Design, Data, Trade …) with join, posts (link kinds: ide, figma, dataset, vote, url), votes, comments; design submissions with voting (Tees Projects); products with jurisdictional print-on-demand notes; live sessions.
- Blog (posts, categories, stats), podcast (episodes, series, hosts, subscribe links), newsletter, press.

### 4.7 Law database & AI
- Instruments (codes, cassation principles, constitutional rulings) with bilingual articles; generated `tsv_en` and `tsv_ar` (over `ar_norm(text)`); search = OR of query terms with Arabic clitic variants (و/ف/ب/ل/ك/ال prefixes) ranked by `ts_rank`, trigram/ILIKE fallback, provenance (instrument, article, source PDF ref). Semantic endpoint returns the top-5 grounded passages. API keys (research / professional / api tiers) with per-tier limits.
- Legal LLM models (Lawmad-Draft, -Precedent, -Tutor, -Analyst …): `generate` retrieves passages first, calls the provider with the passages as the only source material, returns `{ text, citations[], confidence, supervision: { humanReview: true } }`, and writes `ai_generations` (model, prompt hash, tokens, latency) for audit. History per user.

### 4.8 Lawyer Work Space AI
- Documents = ordered clauses (`{ id, heading, text_en, text_ar }`) with governing law and language mode (en / ar / bi); every `PUT` creates a version; revert to any version; authorities (law articles) attached to clauses with a fit note; assistant actions `explain`, `find-authority`, `redline`, `arabic`, `risk-scan` grounded in attached authorities; export as Markdown or a DOCX-ready structure. Templates: services agreement, NDA, employment, data-processing.

### 4.9 Web Builder
- Brief + style + languages + model choices → project with credits deducted per generation (partner-model catalogue) → generated pages (hero, practice areas, team, contact; bilingual) → editable page tree → publish to a domain slug → export.

### 4.10 Track designer
- Two distinct jurisdictions + one craft → `qualify()` returns the ladder rung, the credential name (e.g. "Egypt + United Kingdom + LUID® — International Lawmad"), rarity note and the programs to take; tools-only crafts return `credential: null` with an explanation.

### 4.11 Admin
- Exercise CRUD with test cases, publish/unpublish; program pricing/featured/tagline; users (roles, plan); capstone review queue; certificate revocation; audit log (every state change: `audit_log` with actor, action, target, ip); feature flags (`feature_flags`, e.g. `ladder.requireCertificates`, `builder.enabled`); platform stats (users, paying, enrolments, submissions 30 d, revenue 30 d, certificates, badges, bookings, pending LMS-sync events).

---

## 5. Data model

65 tables (`db/migrations/001_init.sql`), UUID keys, `created_at/updated_at`, foreign keys with `ON DELETE` rules, indexes on every lookup path.

| Group | Tables |
|---|---|
| Identity | `users`, `user_credentials`, `oauth_identities` |
| Catalogue | `tracks`, `programs`, `program_tracks`, `curriculum_items`, `lessons`, `quizzes`, `quiz_questions`, `courses` |
| IDE | `languages`, `exercises`, `test_cases`, `submissions`, `submission_tests`, `exercise_progress` |
| Learning | `enrollments`, `course_enrollments`, `item_progress`, `quiz_attempts`, `credit_ledger`, `activity_days` |
| Credentials | `jurisdictions`, `exam_sittings`, `exam_bookings`, `exam_attempts`, `badges_earned`, `certificates`, `verification_seq` (sequence), `verification_log` |
| Commerce | `promo_codes`, `orders`, `order_items`, `payments`, `installment_schedules`, `subscriptions`, `bookings` |
| Community | `chapters`, `chapter_members`, `posts`, `post_votes`, `comments`, `community_sessions`, `design_submissions`, `design_votes`, `products` |
| Law & AI | `law_instruments`, `law_articles` (+ generated `tsv_en`, `tsv_ar`), `coverage_stats`, `api_keys`, `ai_models`, `ai_generations` |
| Builder & workspace | `builder_projects`, `builder_jobs`, `builder_credits`, `documents`, `document_versions`, `document_authorities` |
| Content | `blog_posts`, `podcast_episodes`, `newsletter_subscribers` |
| Platform | `audit_log`, `events` (outbox), `feature_flags` |

Migrations are forward-only (`npm run db:migrate`, `--reset` for dev). The seed (`npm run db:seed`) is idempotent: reference data is upserted, demo accounts recreated. Demo accounts (password `lawmads-demo`): `aelgendy@thelawtechlabs.com` (admin + instructor + student, the wireframe's Ahmed: 124 tech / 96 law credits, LDT® certificate `LWM-2026-0342`, badges EG 95 % / AE 88 %, 7-day streak), `admin@lawmads.test`, `instructor@lawmads.test`, `student@lawmads.test`.

---

## 6. API reference (summary)

Base `/api/v1`. JSON in/out. Errors: `{ error: { code, message, details? } }` with 400 `validation_error`/`bad_request`/`bad_json`, 401, 403, 404, 409, 413, 429, 500. Auth: `Authorization: Bearer <access>`. Internal: `X-Signature: sha256=<hmac of raw body>` + `X-Timestamp`. Full schemas: `openapi.yaml`.

| Module | Endpoints (auth) |
|---|---|
| auth | `POST register, login, refresh, logout, sso, session` · `GET/PATCH me` · `POST password, 2fa/setup, 2fa/enable, 2fa/disable` (user) · `GET oauth/:provider/start` |
| catalog | `GET tracks, programs, programs/:code, courses, courses/:slug, lessons/:slug, quizzes/:slug, stats` |
| me (learning) | `GET dashboard, transcript, week` · `POST enrollments, courses/:slug/enroll, items/:id/complete, quizzes/:slug/attempts` (user) |
| ide | `GET languages, exercises, exercises/:id` · `GET exercises/:id/hint, exercises/:id/solution` (user) · `POST run, submissions` (user, 60/min) · `GET submissions/:id` (owner) · `PUT/POST judge0/callback` · `POST internal/dispatch` (HMAC) · Phase‑1 aliases at `/api/v1/{exercises,run,submissions,judge0/callback,internal/dispatch}` |
| badges / verify / certificates | `GET badges, badges/ladder, badges/:code` · `POST badges/:code/book, badges/:code/sit` · `GET badges/:code/paper` (user) · `GET verify/:id` (public, limited) · `GET certificates/:id/download` (owner) |
| track-designer | `GET options` · `POST qualify` |
| commerce / bookings | `GET plans` · `POST quote` · `POST checkout` (user) · `GET orders` · `POST orders/:id/refund` (owner) · `GET bookings/slots` · `POST bookings` |
| community / shop | `GET community, posts, posts/:id` · `POST chapters/:slug/join, posts, posts/:id/vote, posts/:id/comments, designs, designs/:id/vote` (user) · `GET shop/products` |
| law | `GET law, search, instruments, articles/:id` · `POST semantic` · `GET/POST api-keys`, `DELETE api-keys/:id` (user) |
| ai | `GET models` · `POST generate` (limited) · `GET history` (user) |
| builder | `GET options` · `GET/POST projects` · `GET projects/:id` · `POST projects/:id/generate, /publish` · `PUT projects/:id/pages` · `GET projects/:id/export` (user) |
| workspace | `GET/POST documents` · `GET/PUT documents/:id` · `POST documents/:id/{revert,authorities,assist}` · `DELETE documents/:id/authorities/:aid` · `GET documents/:id/export` (user) |
| content | `GET blog, blog/:slug, podcast, podcast/:slug, press` · `POST newsletter` |
| admin | exercises CRUD + test cases + publish · `GET stats, users, programs, audit, bookings, flags` · `PATCH users/:id, programs/:code` · `POST capstones/review, certificates/:vid/revoke` · `PUT flags/:key` (instructor/admin; destructive = admin) |
| ops | `GET /healthz` (postgres, redis, executor, version) · `GET /api/v1/openapi.yaml` |

---

## 7. Front end

- **Routing** (`App.tsx`): 37 route patterns → 32 page components, lazy-loaded per route; `Protected` redirects to `/signin?next=…`; `/admin` additionally requires a staff role.
- **Shell**: announcement + promo bars, header with five mega-menus (Company, Programs, Courses, Tools, AI), "Design your track" CTA, language toggle (ع / EN), auth-aware right side (Sign in / Get started vs Dashboard + avatar), mobile drawer, breadcrumb bar, footer.
- **Design system** (`styles.css`): tokens (`--red #E01E1E`, `--ink`, `--paper`, `--stone`, `--line`, mono/logo/body families), primitives (`.btn`, `.card`, `.chip`, `.tag`, `.stats`, `.table`, `.ladder`, `.steps`, `.marquee`, `.ide__*`, `.ws__*`, `.auth`, `.modal`, `.drawer`), responsive breakpoints 1100 / 960 / 600 / 420 / 360 px, logical properties throughout.
- **i18n / RTL** (`lib/i18n.tsx`): key table EN/AR, `dir` on `<html>` follows the language, `unicode-bidi: plaintext` keeps untranslated Latin runs correct; preference persisted per browser.
- **Data layer** (`lib/api.ts`, `lib/hooks.ts`): typed fetch wrapper with automatic refresh-on-401 and single-flight refresh, `useApi(path, deps)` with cancellation, `ApiError` surfaced by `ErrorBox`.
- **IDE** (`pages/Ide.tsx`, `components/CodeEditor.tsx`, `pages/N8nCanvas.tsx`): Monaco with language mode from the track, stdin console, run vs submit, test results with hidden-test masking, hints, solution gate, live HTML preview for structural tracks, n8n visual canvas editing the workflow JSON.

---

## 8. Security

- Transport & headers: `helmet` (HSTS, nosniff, frame options), CORS allow-list with credentials, `trust proxy 1`, no `x-powered-by`.
- Input: every body zod-validated with length caps (code ≤ 200 kB, prompts ≤ 20 kB, JSON ≤ 1 MB → 413); path ids validated (`22P02` → 400); all SQL parametrised.
- Auth: scrypt, short-lived JWT + rotating opaque refresh (jti hashed in Redis), TOTP, per-IP and per-account throttles, audit of every login/failed login.
- Authorisation: role middleware; ownership checks on submissions, orders, documents, projects, API keys (IDOR → 403).
- Service-to-service: HMAC-SHA256 over the raw body with timestamp window for `/internal/dispatch`; Judge0 callbacks validated by token lookup.
- Credentials: HMAC-signed canonical payloads; verification is public but rate-limited and logged; revocation is explicit and audited.
- Sandbox: Judge0 on an isolated network with CPU/memory/time limits, no network in submissions; `EXECUTOR=local` refused when `NODE_ENV=production`; secrets refused at their defaults in production (`config.ts` guards).
- Supply chain: no runtime CDN scripts (Monaco bundled); fonts are the only third-party request and degrade gracefully.

---

## 9. Configuration

See `.env.example`. Required in production: `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SERVICE_HMAC_SECRET`, `CERTIFICATE_SIGNING_KEY` (all ≥ 32 random bytes), `DATABASE_URL`, `REDIS_URL`, `EXECUTOR=judge0`, `JUDGE0_URL`, `GRADING_CALLBACK_BASE`, `CORS_ALLOWED_ORIGINS`, `PUBLIC_WEB_ORIGIN`, `PUBLIC_API_ORIGIN`. Optional: `PAYMENT_PROVIDER=stripe` + keys, `AI_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (+ `ANTHROPIC_MODEL`, default `claude-opus-5`), `WP_*` bridge, OAuth client ids, `FREE_TIER_RUNTIME_MINUTES`, `LOG_LEVEL`.

---

## 10. Build, run, deploy

```
npm install
cp .env.example .env            # edit secrets
npm run db:migrate && npm run db:seed
npm run dev                     # api :4000 + web :5173 (proxy /api)
npm run build && npm run preview   # production bundle on :4173
docker compose up --build       # full stack incl. Judge0 (web on :8080 → api)
```

CI (`.github/workflows/ci.yml`): typecheck → lint → unit + API tests (Postgres 16 + Redis 7 services) → build → seed → start API + preview → Playwright smoke.

Production checklist: secrets set; `EXECUTOR=judge0`; Judge0 workers sized (`judge0/judge0.conf`); Postgres backups + `pg_trgm`; Redis persistence for refresh tokens; nginx `web` serving `/` with SPA fallback and proxying `/api`; HTTPS termination; self-hosted fonts; Stripe webhooks; Anthropic key and the fallback decision (§DEBUG-REVIEW 5).

---

## 11. Testing

| Suite | Location | Covers |
|---|---|---|
| Unit (17) | `packages/shared/src/*.test.ts` | credential halves, streaks, weighted scores, output normalisation, Judge0 status map, ladder rungs, discount non-stacking, installments, bundle anchors, formatting, track-designer qualification |
| API integration (18) | `tests/api/platform.test.ts` | health; register → login → refresh → me; catalogue numbers; track designer; IDE run/submit/grade/credits/transcript/solution gate; structural HTML and n8n grading; quiz; checkout with DELTA30 = $273 and fulfilment; badge purchase → book → sit → signed badge → public verify; seeded certificate verification; wireframe dashboard numbers; bilingual law search; grounded AI answer with audit; workspace lifecycle; community/shop/content/bookings/builder; admin RBAC + capstone → certificate; Phase‑1 aliases + HMAC dispatch |
| Browser (4) | `tests/e2e/smoke.spec.ts` | API health; 32 public routes; sign-in + 8 private routes; run + submit end to end — with zero console errors / failed requests asserted |

---

## 12. Status matrix

| Capability | Status |
|---|---|
| Auth, sessions, 2FA, roles, lockout, SSO bridge | **Complete** |
| Catalogue, enrolment, lessons, quizzes, credits, transcript, dashboard | **Complete** |
| IDE: 19 tracks, 57 exercises, run/submit, grading (output + structural), hints, solution gate, quota | **Complete** (Judge0 path written; exercised only via `LocalExecutor` here) |
| Certificates, badges, ladder, public verification, revocation | **Complete** (PDF rendering: client-side from the download payload) |
| Commerce: plans, quotes, promo/student rules, installments, checkout, orders, refunds, bookings | **Complete with Mock provider**; Stripe provider written, unexercised |
| Community, shop, blog, podcast, newsletter | **Complete** |
| Law database: bilingual FTS, provenance, API keys | **Complete** on a 13-provision sample corpus |
| Legal LLM models: grounded generation, citations, audit | **Complete with Mock provider**; Anthropic provider written, unexercised |
| Lawyer Work Space AI: clauses, versions, authorities, assistant, export | **Complete** (DOCX binary rendering pending) |
| Web Builder: brief → pages → publish → export, credits | **Complete** (generation via provider abstraction) |
| Admin: exercises, programs, users, capstones, revocation, flags, audit | **Complete** |
| Front end: 28 views, design system, RTL, mobile | **Complete** (see DEBUG-REVIEW §5 for 320 px note) |
| OAuth callback exchange, Stripe webhooks, DOCX/PDF binaries, font self-hosting, corpus ingestion, translation of content | **Roadmap** |

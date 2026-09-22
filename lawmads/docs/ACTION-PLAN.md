# Lawmads — Full-Stack Development Action Plan

This is the plan I execute. It is sequenced so that every step leaves a runnable, tested system, and so that the Phase-1 contracts already in the codebase survive unchanged.

## 0. Ground rules
- Stack is the elected one: **React 18 + TypeScript + Vite** · **Node 22 + Express + TypeScript** · **PostgreSQL 16** · **Redis 7** · **Monaco** · **Judge0 CE** (self-hosted, isolated). No substitutions; additions are listed in `SPECS.md §Tech stack` with a reason each.
- One repo, three workspaces: `apps/web`, `apps/api`, `packages/shared`. Module folders inside `apps/api/src/modules/*` are the future service seams (they mirror the Phase-1 services: `ide` = playground-api + grading-service, `admin` = admin-api).
- Every API route is `/api/v1/...`, validated with zod, documented in `docs/openapi.yaml`.
- Sandbox isolation is never relaxed. Untrusted code runs only in Judge0 (prod) or the local executor's process sandbox (dev/test), never in the API process.
- Everything countable in the UI (jurisdictions, exercises, members, prices) comes from the API, never from copy.

## 1. Sequence

| # | Step | Output | Exit criterion |
|---|---|---|---|
| 1 | Review + plan | `docs/REVIEW.md`, this file | — |
| 2 | Scaffold | workspaces, tsconfig, scripts, `.env.example`, `docker-compose.yml`, CI workflow | `npm install && npm run typecheck` clean on empty modules |
| 3 | Schema + seed | `db/migrations/001..00n.sql`, `db/seed.ts` | `npm run db:migrate && npm run db:seed` on a fresh DB; seed is idempotent |
| 4 | API core | config, db pool, redis, logger, error envelope, auth (register/login/refresh/logout/SSO/2FA), RBAC, rate limits, audit | auth tests green |
| 5 | LMS domain | catalog, enrolment, lessons, quizzes, credits ledger, transcript, certificates + verification, badges + exams + ladder, track designer | dashboard payload assembled from real rows |
| 6 | IDE domain | languages, exercises, run, submit, executor (Judge0 / local), grading pipeline, reconciliation, credits award, WP grade-sync adapter, admin CRUD | FizzBuzz E2E: submit → graded 100 → +credits → transcript row |
| 7 | Commerce + rest | plans, promos, checkout/orders/installments, bookings, community, shop, law DB search, AI models, web builder jobs, workspace docs, blog/podcast | each has list/detail/mutate endpoints with tests |
| 8 | Web shell | tokens, typography, header + mega-menus + drawer, footer, router, auth store, API client, i18n (EN/AR, RTL) | all routes render (empty states) |
| 9 | Web views | 28 views wired to the API, Monaco playground, n8n canvas, dashboard | Playwright smoke passes |
| 10 | Debug review | typecheck, lint, unit, integration, build, run, curl smoke, screenshots; fix all findings | `docs/DEBUG-REVIEW.md` lists every failure found and its fix |
| 11 | Specs | `docs/SPECS.md`, `docs/openapi.yaml`, `README.md` | — |
| 12 | Ship | conventional commits, push | branch pushed |

## 2. Data model (target)

Identity: `users`, `user_credentials`, `oauth_identities`, `refresh_tokens` (Redis), `user_preferences`, `academic_emails`.
Catalog: `tracks`, `programs`, `program_tracks` (A/B/C/Capstone), `curriculum_items`, `courses`, `course_modules`, `lessons`, `quizzes`, `quiz_questions`, `quiz_options`.
Learning: `enrollments`, `lesson_progress`, `quiz_attempts`, `credit_ledger`, `activity_days` (streak), `transcript_entries`.
Credentials: `certificates` (signed payload, verification_id, revoked), `jurisdictions`, `badge_exams`, `exam_sittings`, `exam_attempts`, `badges_earned`, `verification_log`.
IDE: `languages`, `exercises`, `test_cases`, `submissions`, `submission_tests`, `exercise_progress`, `hints`.
Commerce: `plans`, `prices`, `promo_codes`, `orders`, `order_items`, `payments`, `installment_schedules`, `subscriptions`, `bookings`.
Community: `chapters`, `chapter_members`, `posts`, `post_votes`, `comments`, `sessions`, `design_submissions`, `design_votes`.
Shop: `products`, `product_variants` (orders reuse commerce).
Law DB: `law_instruments`, `law_articles` (bilingual, provenance JSONB, FTS vectors), `law_merits`, `coverage_stats`, `api_keys`, `api_usage`.
AI: `ai_models`, `ai_generations` (audit: prompt hash, citations, confidence, supervisor).
Builder: `builder_projects`, `builder_jobs`, `builder_pages`, `credit_packs`.
Workspace: `documents`, `document_versions`, `document_authorities`.
Content: `blog_posts`, `blog_categories`, `podcast_episodes`, `podcast_hosts`, `newsletter_subscribers`.
Ops: `audit_log`, `events` (outbox), `feature_flags`.

## 3. API surface (summary — full reference in `SPECS.md`)
`/auth/*` · `/me/*` (dashboard, transcript, certificates, badges, preferences) · `/catalog/*` (tracks, programs, courses, lessons, quizzes) · `/enrollments` · `/progress` · `/ide/*` (languages, exercises, run, submissions, hints, solution) · `/internal/dispatch`, `/judge0/callback` (kept) · `/admin/*` (exercises, test-cases, programs, users, audit) · `/badges/*` (jurisdictions, exams, sittings, attempts, ladder) · `/verify/:id` (public) · `/track-designer/qualify` · `/commerce/*` (plans, quote, checkout, orders) · `/bookings` · `/community/*` · `/shop/*` · `/law/*` (search, articles, coverage, api-keys) · `/ai/*` (models, generate) · `/builder/*` · `/workspace/*` · `/content/*` (blog, podcast, newsletter) · `/healthz`, `/openapi.yaml`.

## 4. Front-end routes (28) → components
`/` Home · `/programs` Catalog · `/programs/:code` Detail · `/learn/:program/:lesson` Lesson · `/quiz/:id` · `/ide` Launcher · `/ide/:language` Playground · `/dashboard/(overview|programs|transcript|certificates|settings)` · `/community` · `/workspace` · `/law` · `/law/explorer` · `/ai` · `/pricing` · `/schedule` · `/checkout/:sku` · `/badges` · `/badges/:jurisdiction` · `/track-designer` · `/shop` · `/get-started` · `/signin` · `/courses` · `/courses/:slug` · `/blog` · `/blog/:slug` · `/builder` · `/podcast` · `/verify/:id` (public) · `/admin/*`.

## 5. Beyond this session (roadmap, in priority order)
1. Judge0 cluster deployment (compose file included) and language-runtime smoke tests for all 18 languages.
2. Stripe adapter + webhooks; regional pricing tables; invoices.
3. Google/Microsoft OAuth client registration; email delivery (verification, receipts, reminders).
4. Law DB ingestion pipeline (gazette PDF → OCR → article alignment) and Elasticsearch + embeddings.
5. Theia workspace (Phase 2), Theia AI tutor agents, collaborative editing (Yjs).
6. Word Online adapter for the Work Space; terminology/glossary ETL.
7. Proctoring vendor integration for badge sittings.
8. Kubernetes manifests; blue/green; observability (OpenTelemetry).

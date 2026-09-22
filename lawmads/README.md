# Lawmads® — The Legal Technology Academy

Full-stack platform: React + TypeScript front end, Node/Express API, PostgreSQL, Redis, Judge0 code sandbox. Lawyers learn design, development and data science by practice, paired with the law that governs each craft, and earn digitally signed, publicly verifiable credentials.

## Documents

| | |
|---|---|
| `docs/REVIEW.md` | Page-by-page review of the wireframe (28 views) and the Phase‑1 code, with the decisions taken |
| `docs/ACTION-PLAN.md` | The build sequence that was followed |
| `docs/SPECS.md` | Functional specification, data model, API summary, tech stack and reasons, security, deployment, status matrix |
| `docs/openapi.yaml` | Full API contract (also served at `GET /api/v1/openapi.yaml`) |
| `docs/DEBUG-REVIEW.md` | Verification results, findings fixed, probes, known limitations |
| `docs/screenshots/` | Captures of the built product (desktop, phone, Arabic/RTL) |

## Quick start

Prerequisites: Node 22, PostgreSQL 16 (with `pg_trgm`), Redis 7 (optional in dev — everything falls back to memory).

```bash
npm install
cp .env.example .env                       # set DATABASE_URL etc.
createdb lawmads && createdb lawmads_test  # or use docker compose
npm run db:migrate && npm run db:seed
npm run dev                                # API http://localhost:4000 · web http://localhost:5173
```

Demo accounts (password `lawmads-demo`): `aelgendy@thelawtechlabs.com` (admin/instructor/student, the wireframe's demo state), `admin@lawmads.test`, `instructor@lawmads.test`, `student@lawmads.test`.

## Scripts

| Script | What |
|---|---|
| `npm run dev` | API (`tsx watch`) + web (Vite) concurrently |
| `npm run build` | Typecheck + Vite production bundle (`apps/web/dist`) |
| `npm run preview` | Serve the bundle on :4173 with `/api` proxied to :4000 |
| `npm run typecheck` · `npm run lint` | Strict TypeScript across all workspaces · ESLint 9 |
| `npm test` | Shared unit tests + API integration suite (needs `TEST_DATABASE_URL`; the suite migrates and seeds it) |
| `npm run test:e2e` | Playwright browser smoke against a running stack (`E2E_BASE_URL`, default :5173) |
| `npm run db:migrate [-- --reset]` · `npm run db:seed` | Forward-only migrations · idempotent seed |

## Full stack with Docker

```bash
docker compose up --build
```

Brings up Postgres, Redis, the API, the web (nginx, :8080) and a self-hosted Judge0 CE on an isolated network. Set real secrets in `.env` first (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `SERVICE_HMAC_SECRET`, `CERTIFICATE_SIGNING_KEY`), and `EXECUTOR=judge0`.

## Layout

```
packages/shared   pure rules and DTO types shared by API and web
apps/api          Express API — core/, modules/<domain>/{service,routes}.ts, db/
apps/web          React SPA — lib/, components/, pages/
db/migrations     SQL migrations (65 tables, Arabic search normalisation)
tests             API integration + Playwright E2E
```

## Repository note

The project currently lives under `lawmads/` inside a fork of freeCodeCamp for delivery purposes. It has no dependency on the surrounding repository; move it to its own repository and relocate `.github/workflows/ci.yml` to the root (drop the `lawmads/**` path filters and `working-directory`).

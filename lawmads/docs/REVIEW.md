# Lawmads — Platform Review

**Reviewed:** 22 Sep 2026 · **Reviewer:** Claude (Law Tech Labs build session)
**Inputs reviewed**

| Source | Version | How it was read |
|---|---|---|
| `/Figma/Sitemap & Wireframes/Lawmads/index.html` (the current single-file platform, 28 routed views) | content 2026-09-16, 719,795 B | Dropbox text extraction (69,103 chars, every view read end-to-end). The HTML/CSS/JS source itself is blocked by this session's egress policy (`dl.dropboxusercontent.com` → 403). |
| `lawmads-RECORD.md`, `lawmads-SKILL.md`, `lawmads-SECTION-MAP.md` | 2026-09-16 | full |
| `/Final Polish/Finals/Lawmads/Platform/` — the existing **Phase-1 codebase** (monorepo, 11 conventional commits, 3 Jul 2026) | 0.1.0 | README, architecture.md, docker-compose, `.env.example`, `001_init.sql`, `seed.sql`, the three OpenAPI specs, `lawmads-sso.php`, `wp-init.sh`, `judge0.conf`, package manifests, git reflog. **The 60 `.ts/.tsx` source files could not be read** — Dropbox's extractor rejects TypeScript — so their behaviour is inferred from the contracts and docs. |
| `Lawmads - Claude Code Build Brief.md` | Jul 2026 | full |
| `Lawmads - Product & Business Model.docx` (24-program catalog, pricing, KPIs, IDE election) | Jul 2026 | full |
| `Lawmads - Ultimate Master Document.docx` | Jul 2026 | headings + unique sections (the system-brief body duplicates the "Claude Main Structure" doc, read in full) |
| `Lawmads - AI & Automation Track.docx`, `Lawmads IDE - Technical Discussion Paper`, `Lawmads Academy.docx`, Brand Profile, Programs & Expansion, Rollout Plan, Figma Make Prompt | Jul–Aug 2026 | full |

---

## 1. Executive summary

Lawmads is a **legal-technology academy platform** with five sellable products on one shared platform: the Academy (LMS + IDE), Certificates & Diplomas (signed, QR-verifiable), the Lawyer Work Space / Intelligent Editor, the Bilingual Law Database, and the Lawyer Who® Community (+ e-shop). The September 2026 wireframe is a **complete, coherent product surface**: 28 routed views, one design language, real pricing, real copy, an honest tone ("honest limits" sections on the database, badges, track designer) that is a genuine brand asset.

What exists in code today is **Phase 1 of the IDE only** (Monaco playground + Judge0 + WordPress/Tutor SSO + exercise admin). It is well-engineered for its scope — isolated sandbox plane, HMAC-signed service calls, JWT rotation, weighted scoring with a reconciliation sweep, versioned OpenAPI. But it covers roughly **5% of the surface the wireframe now shows**, and it assumes WordPress/Tutor LMS is the LMS, which the wireframe has silently moved away from (native dashboard, transcript, credits, badges, checkout, community — none of which Tutor models).

**Verdict:** the product is specified well enough to build. The blocking decision is the LMS core (§5). Everything else is execution.

---

## 2. Page-by-page review (28 routed views)

Legend — **UX**: what the page does and how well it hangs together · **Data**: entities the backend must own · **Gaps**: what the wireframe leaves undefined or contradicts elsewhere.

### 2.1 Home
- **UX:** Announcement bar (IDE launch) → red promo bar (DELTA30) → sticky header with five mega-menus (Company / Programs / Courses / Tools / AI) + Pricing + Track designer → hero ("Delta Generation") → press band → four product pillars → 6 certification cards → IDE section with live code mock → Verified Lawmad ladder with prices → Web Builder promo → Community stats → three offers → Blog/Podcast → Schedule-a-call → Partners marquee → footer. Long but well-sequenced; every section has a CTA that resolves to a real route.
- **Data:** featured programs (6), ladder tiers + prices, offers (3), community stats, latest episode, call slots, partners.
- **Gaps:** Hero trust row says **"9 jurisdictions"**, the badge page says **"Nine jurisdictions… all nine for $299"** but the same page's CTA says **"Get all seven — $299"**, the mega-menu says **"All badge exams 7"**, and the track designer filter says **"All seven"**. The Figma prompt and Master Document list 6–7. → **Decision needed: 7 or 9.** The catalogue lists 9 (Egypt, UK, UAE, KSA, Qatar, Oman, Bahrain, Netherlands, Germany). I build for 9 and make the count data-driven so copy can never drift again.
- Community members: hero says **2,941**, community page chapters sum to **10,320** and the home chapter cards to **2,941**. Data-driven fix.

### 2.2 Programs catalog
- **UX:** Black header, 7 track filter chips, 24 program cards with tool-logo tiles, credential code, weeks/tools/credits meta. "Design your track" interstitial. Good.
- **Data:** tracks (7), programs (24) with level, duration, credits (T/L), tools, law areas, price tier.
- **Gaps:** Mega-menu lists 22 named programs + "View all 24"; Product doc specifies 21 programs + 6 career certificates + AI track of 5 (+ CUR® in the menu, which no document specifies). I seed **26 programs** (all named in either the menu or the docs) and let the catalog count itself.

### 2.3 Program detail (LUID®)
- **UX:** Header pills, three-track curriculum accordions with VIDEO/QUIZ/LAB/LAW/EXAM/CAPSTONE tags and durations, career outcomes, sticky enrolment box ($390 or 3 × $140), "Preview first lesson". Excellent — this is the best-specified page and matches the Product doc's LUID spec exactly.
- **Data:** program → tracks (A/B/C/Capstone) → items (kind, duration, exercise/quiz link). Enrolment options: one-time vs installments.
- **Gaps:** Only LUID is fully authored. The other 25 programs have curricula in the Product doc / AI-track doc at module-title level — enough to seed structure, not lesson content.

### 2.4 Lesson player
- **UX:** Left curriculum sidebar with ✓/▶ states and progress (34% · 12/35), video area, lesson notes with a "Lawmads lens" callout, resources, prev/next. Solid.
- **Data:** lesson (video_url, notes_md, resources), user lesson progress, next/prev computed from curriculum order.
- **Gaps:** No video source. I store a URL and render a player; content is out of scope.

### 2.5 Quiz
- **UX:** 10-question single-answer, 80% pass, "+2 Tech Credits". Clean.
- **Data:** quiz, questions, options, attempts, scoring rule → credit award.
- **Gaps:** Only Q1 is authored. Seed 10 real questions for the LUID Track A quiz.

### 2.6 IDE launcher ("Choose a language")
- **UX:** 18 language tiles + 2 agentic tracks (n8n, Cursor), each "3 exercises: two fundamentals → legal-themed capstone". Attempts counter, Tech Credits balance.
- **Data:** languages (20 tracks), exercises (60), user attempt counts.
- **Gaps:** The launcher shows **19 tiles** (17 language tiles + n8n + Cursor); "18 languages" holds only if HTML and CSS are counted separately, and **57 graded exercises = 19 × 3** — consistent, but fragile. The IDE paper's language list is 13; the wireframe adds TypeScript, Ruby, Rust, Kotlin, Swift. Judge0 CE covers all of them except Dart (no CE runtime — flagged). I seed 57 exercises and derive every count from data.

### 2.7 IDE playground
- **UX:** Instructions panel with Ex 1/2/3 tabs, checks list, hint button, "Show correct answer" after failed submit; Monaco-style editor; Run / Submit; Live Preview / Console; Test Results; 🏆 completion popup "+10 Tech Credits synced". n8n track swaps editor for a node canvas with live `workflow.json`; Cursor track is `.cursorrules` → agent prompts → task spec.
- **Data:** exactly the Phase-1 model (exercises, test_cases, submissions, submission_tests, progress) + hints + credits award.
- **Gaps:** Phase-1 code supports only `javascript|python|sql` (an enum in the DB!). Must widen to all 20. The n8n and Cursor tracks need a structural grader (JSON schema / rubric), not stdin/stdout.

### 2.8 Dashboard (Overview · My Programs · Transcript · Certificates & Badges · Settings)
- **UX:** The richest page. Identity strip (Regional Lawmad 🥉, Egypt ✓ UAE ✓, streak), quick actions, six stat tiles, "Continue learning" feed with contextual copy ("Your last run passed 2 of 4 checks"), ladder card, credential-progress card (Tech 12/12 · Law 7/10), upcoming events, enrolled programs, weekly schedule, signed transcript table, certificates with verification IDs, badge grid, settings with preferences (dark IDE theme, AI hints off in exams, public profile, reminders).
- **Data:** credits ledger, streak (daily activity), enrolments + progress, transcript rows (every graded item), certificates, badges, events, preferences, academic email.
- **Gaps:** None material — this page is the acceptance test for the whole backend.

### 2.9 Community (Lawyer Who®)
- **UX:** 4 chapters with member counts, feed (posts with upvotes, comments, "Fork in IDE"), upcoming sessions (Whereby), e-shop teaser, Tees Projects vote.
- **Data:** chapters, memberships, posts, votes, comments, sessions, monthly design contest.
- **Gaps:** Member counts differ from home (see 2.1). Comments UI not drawn — I implement the endpoint and a minimal thread.

### 2.10 Lawyer Work Space AI
- **UX:** Word-like editor with EN/AR/BI modes, left authority panel (Codes & laws / Cassation merits / Clauses / Templates), right drafting assistant, risk scan, redline, "Find authority", citations count, save/version state.
- **Data:** documents, versions, inserted authorities (FK to law DB), AI actions log.
- **Gaps:** The Master Document specifies **Microsoft Word Online + Graph API** as the base; the wireframe is a native editor. Word Online cannot be built or tested here and needs a Microsoft 365 tenant. I build the native editor (contenteditable + structured clauses) with the authority/AI panels, and leave a documented Word-Online adapter boundary.

### 2.11 Law Database (product) · 2.12 Explorer
- **UX:** Stats (143,814 entries · 9 jurisdictions · 47,214 Egyptian · 98.2% PDF-linked), live bilingual search, coverage table, the record JSON with provenance, API (cURL/Python/JS/semantic), "Honest limits", four user types, four tiers ($12/$29/$299/contract), FAQ. Explorer: filter by source type, table (Instrument · العنوان · Jurisdiction · Type).
- **Data:** instruments, articles (text_en/text_ar, in_force_from, amended_by, provenance{source_pdf,page,ocr_confidence,human_verified}, construed_by), coverage per jurisdiction, API keys + rate limits.
- **Gaps:** No corpus exists. I ship the schema, bilingual search (Postgres FTS + trigram, Arabic-safe), provenance model and a seeded sample (Civil Code art. 147 etc.); Elasticsearch/embeddings are a documented production upgrade.

### 2.13 Legal LLM Models
- **UX:** Arabic chat mock with sources + confidence, 6 model cards (Draft, Precedent, Clause, Translate, Tutor, Analyst), supervision framework, access tiers.
- **Data:** model registry, generation log (audit), provider config.
- **Gaps:** No provider named beyond "grounded in the Law Database". I implement a provider abstraction (mock by default; Anthropic Messages API when a key is set) with mandatory citation extraction from the law DB.

### 2.14 Pricing
- **UX:** Four plans (Free / Pro $19 annual · $29 monthly / Certifications $390 / $890 / $1,490 / Enterprise $59 seat), student 30%, regional pricing note.
- **Data:** plans, prices, regional multipliers, student discount rule.
- **Gaps:** Home promo says **Jurisdiction Bundle $299 (strike $316)**, badge page says **$299 (strike $711 = 9 × $79)**, Figma prompt says **$199 (strike $237)**. I seed $299 / anchor 9 × $79 = $711.

### 2.15 Schedule a call · 2.16 Checkout
- **UX:** Booking form (name, email, interest, slot) + "what to expect". Checkout: one-time vs 3 × $140, card fields, promo (DELTA30 −30%), test card 4242…, order summary, 14-day refund.
- **Data:** bookings; orders, order_items, payments, promo codes, installment plans.
- **Gaps:** No PSP named. Provider abstraction with a mock provider (accepts 4242…) and a Stripe adapter interface.

### 2.17 Badge exams (ladder) · 2.18 Badge detail (LWM-EG)
- **UX:** Ladder (Regional 2 / Global 3 / Master 4 + capstone), bundle/single/student pricing, format (55–70 Q · 80–100 min · 70% · proctored · 1 free resit · valid forever), published pass rates, preparation, live verification card (`LWM-2026-0342`, `signature: valid ✓`, `revoked: false`), FAQ. Detail: sources of law, courts, market demand, syllabus weighting, sample questions, sittings, examiner, "not a practising certificate".
- **Data:** jurisdictions, badge exams, sittings, attempts (score, pass, resit used), badges earned, verification records, pass-rate stats.
- **Gaps:** Ladder wording conflicts with the Product doc (which adds certificate requirements: Regional = 2 J + 1 cert; Global = 3 J + 2 certs/diploma; Master = 4 J + career cert). The wireframe's dashboard uses the simpler jurisdiction-count rule with a capstone for Master. I implement the rule as a single pure function with the wireframe semantics and the certificate requirement as a configurable flag (default off) so the business can switch.

### 2.19 Track designer (qualification builder)
- **UX:** Choose exactly two jurisdictions (grouped MENA/Europe; common/civil/sharia/hybrid tags) + one craft (certification tracks vs tools-only) → "You would qualify as" with what it does / does not qualify you to do, roles, market subjects, gap to next rung, compare, four-step "what happens next". Strong differentiator.
- **Data:** jurisdictions with legal-family + region, crafts, pairing rules, role/subject copy per pairing.
- **Gaps:** Rule engine is implied, not written. I write it: same-region pair → Regional; cross-region → International (rarer); common+civil bonus; tools-only → "skill, no credential".

### 2.20 E-Shop
- **UX:** Three tees ($25/$29/$29), Tees Projects submission. Simple.
- **Data:** products, variants, cart/orders (reuses commerce), design submissions + votes.

### 2.21 Get started (3 steps) · 2.22 Sign in
- **UX:** Google/Microsoft SSO buttons, email form, goal → track mapping, jurisdictions of interest, plan selection with student rate on academic email. Sign in with 2FA note.
- **Data:** users, credentials, oauth identities, onboarding answers, plan.
- **Gaps:** OAuth needs client IDs; I implement the provider hooks and email/password fully; 2FA (TOTP) implemented as optional.

### 2.23 Courses · 2.27 Course detail
- **UX:** 180+ standalone courses, 4 filters, "included with Pro"; detail with syllabus accordion, "Start this course", "Try an exercise first". 
- **Data:** courses (distinct from programs), modules, exercises link.
- **Gaps:** Menu names 17 courses; "180+" is aspirational. Seed the 17.

### 2.24 Blog & News · 2.28 Post detail · 2.26 Podcast
- **UX:** Blog list with 4 categories, stats; post detail with related posts and "The Delta Brief" subscribe. Podcast: 48 episodes, player, segments, series, hosts, subscribe links, transcripts "indexed into the Law Database".
- **Data:** posts, categories, episodes, hosts, newsletter subscriptions.

### 2.25 Web Builder
- **UX:** Describe practice → style → model pickers (Gemini / Seedance / Imagen / Veo) → generate → live preview ("6 pages · 4 images · 1 video · 18s") → edit → publish to domain; credit packs; BYO key.
- **Data:** builder projects, generation jobs, pages, assets, credit balance.
- **Gaps:** Third-party generation is out of scope offline; I implement the job pipeline and a deterministic mock generator that produces a real multi-page site spec so the UI is fully exercised.

### Cross-cutting findings
1. **Copy/data drift** (jurisdiction count 7 vs 9, exercise count 57 vs 60, member counts, bundle price) — all fixed by making counts and prices data-driven.
2. **Single-file architecture** (SKILL: "one `<style>`, one `<script>`, no build, no browser storage") was right for a wireframe and is wrong for a product: no auth, no persistence, no code-splitting (720 KB page). The router/section conventions map 1:1 onto React Router routes.
3. **Accessibility** was addressed in the 09-16 pass (keyboard cards, drawer). Must carry over: focus management in mega-menus, `aria-expanded`, RTL for Arabic.
4. **Every credential claim** in the wireframe is careful ("not a practising certificate"). Verification must therefore be real: signed payloads, public verification page, revocation.

---

## 3. Review of the existing Phase-1 codebase

**Strengths (keep):**
- Two-plane Docker topology; Judge0 workers on an isolated network, `ENABLE_NETWORK=false`, no shared volumes.
- Uniform stdin/stdout grading contract; one Judge0 job per test case; weighted `computeScore`; atomic finalisation guard; 15 s reconciliation sweep for lost callbacks.
- HS256 SSO from WordPress → access/refresh pair with jti tracking; HMAC-signed service→service and service→WordPress calls; `audit_log`.
- Versioned OpenAPI for all three services; Conventional Commits; E2E test that reads the grade back from WordPress.

**Weaknesses (fix):**
| # | Finding | Severity | Action |
|---|---|---|---|
| P1 | `exercise_language` is a Postgres **enum of 3** values; wireframe needs 20 tracks | High | Replace with a `languages` reference table |
| P2 | LMS = WordPress/Tutor **free** (Pro never installed); grade sync writes `user_meta` and calls `mark_lesson_complete`; no gradebook, no credits, no transcript, no certificates | High | Native LMS core; keep WP as an optional identity/grade adapter |
| P3 | Three microservices + two SPAs for one bounded context adds five deploy units and HMAC plumbing before there is traffic | Medium | Modular monolith (one API, one web app) with the same route contracts; split later along the existing module boundaries |
| P4 | Admin panel decodes the JWT **client-side only** and stores it in `sessionStorage`; instructors paste tokens by hand | Medium | Real login + httpOnly refresh cookie; admin routes inside the main app behind RBAC |
| P5 | Judge0 pinned at `1.13.1` (2024 CVEs patched, but 1.14+ exists) | Low | Pin to latest CE; keep isolation |
| P6 | No CI workflow in the repo despite the brief | Medium | Add GitHub Actions: typecheck, unit, integration (Postgres service), build |
| P7 | No rate limiting on `/run` beyond monthly minutes; no per-IP limits on auth | Medium | Add token-bucket limits |
| P8 | i18n present in playground only | Low | i18n + RTL at the shell level |

---

## 4. What the documents say that the wireframe does not
- **Master Document / Discussion Paper:** Theia IDE (Phase 2), Electron (Phase 3), messaging + academic email (`@lawmads.edu`), video meetings (Whereby), Word Online editor, terminology/glossary ETL, Kafka/RabbitMQ event bus, Kubernetes. → Documented as roadmap; the API is designed so none of it requires a schema break (events table, adapter interfaces).
- **AI & Automation Track doc:** CFB®, LNA®, AICP, CM®, AAI® with full curricula and prices ($120 / $390 / $890 / $490 / $490; AI Track Pass $1,690). → Seeded.
- **Brand Profile / Rollout Plan / Programs & Expansion:** SQE line, tier names Base/Ridge/Summit (provisional; the wireframe uses Local/Regional/International/Global/Master), UK entity & CPD footing. → Not product features; recorded in specs as business constraints (never imply SRA endorsement; publish pass rates with methodology — the badge page already does this).

---

## 5. Decisions taken for the build (with rationale)

| Decision | Choice | Why |
|---|---|---|
| LMS core | **Native** (Postgres) with a `LmsSyncAdapter` interface; WordPress/Tutor grade sync kept as an adapter | The wireframe's dashboard/transcript/credits/badges/checkout cannot be expressed in Tutor; WordPress cannot run in this environment; the brief's WP election predates the September product |
| Topology | **Modular monolith**: `apps/api` (Express) + `apps/web` (React) + `packages/shared`; modules keep Phase-1 route contracts (`/api/v1/run`, `/submissions`, `/judge0/callback`, `/admin/exercises…`) | Fewer moving parts pre-traffic; module folders are the future service seams |
| Editor | Monaco (elected); Theia = Phase 2 as documented | — |
| Execution | `Executor` interface: `Judge0Executor` (prod) · `LocalExecutor` (dev/test: Node, Python, SQLite via Python, HTML preview client-side) | Judge0 needs privileged Docker, unavailable here; contract unchanged |
| Datastore | PostgreSQL 16 + Redis 7 (elected) | — |
| Payments | `PaymentProvider` interface: `MockProvider` (test card 4242) · `StripeProvider` skeleton | No PSP named |
| AI | `AiProvider` interface: `MockProvider` · `AnthropicProvider` | Grounding + citations enforced in our layer, not the vendor's |
| Auth | Email+password (argon2id), JWT access 15 min + rotating refresh (Redis jti), optional TOTP 2FA, OAuth hooks (Google/Microsoft), WP SSO exchange retained | Matches wireframe sign-in/sign-up |
| Jurisdictions | 9, data-driven | Catalogue lists nine |
| Ladder rule | Wireframe semantics (2/3/4 jurisdictions; Master needs capstone), certificate requirement behind a flag | Avoid contradicting the live product copy |

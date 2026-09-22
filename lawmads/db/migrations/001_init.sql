-- =============================================================================
-- Lawmads Platform — schema v1
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           CITEXT,
  email_lower     TEXT GENERATED ALWAYS AS (lower(email::text)) STORED,
  first_name      TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL DEFAULT '',
  display_name    TEXT NOT NULL DEFAULT '',
  roles           TEXT[] NOT NULL DEFAULT ARRAY['student'],
  plan            TEXT NOT NULL DEFAULT 'plan_free',
  locale          TEXT NOT NULL DEFAULT 'en',
  academic_email  TEXT,
  academic_verified BOOLEAN NOT NULL DEFAULT false,
  wp_user_id      TEXT,                           -- Phase-1 WordPress identity bridge
  onboarding      JSONB NOT NULL DEFAULT '{}'::jsonb,
  preferences     JSONB NOT NULL DEFAULT '{"darkIde":true,"aiHints":true,"publicProfile":true,"reminders":true}'::jsonb,
  totp_secret     TEXT,
  totp_enabled    BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_idx ON users (email_lower);
CREATE UNIQUE INDEX users_wp_idx ON users (wp_user_id) WHERE wp_user_id IS NOT NULL;

CREATE TABLE user_credentials (
  user_id       UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,                    -- scrypt: salt$N$r$p$hash (base64)
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE oauth_identities (
  provider    TEXT NOT NULL,                       -- google | microsoft
  subject     TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, subject)
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
CREATE TABLE tracks (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  ordinal     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE programs (
  code            TEXT PRIMARY KEY,                -- LUID, LTS, AICP ...
  slug            TEXT NOT NULL UNIQUE,
  name            TEXT NOT NULL,
  tagline         TEXT NOT NULL DEFAULT '',
  track_slug      TEXT NOT NULL REFERENCES tracks(slug),
  kind            TEXT NOT NULL DEFAULT 'certificate',   -- certificate | diploma | career | course_certificate
  level           TEXT NOT NULL DEFAULT 'Beginner',
  weeks           INTEGER NOT NULL DEFAULT 12,
  tech_credits    INTEGER NOT NULL DEFAULT 0,
  law_credits     INTEGER NOT NULL DEFAULT 0,
  tools           TEXT[] NOT NULL DEFAULT '{}',
  law_areas       TEXT[] NOT NULL DEFAULT '{}',
  sku             TEXT NOT NULL DEFAULT 'certificate',
  price_cents     INTEGER NOT NULL DEFAULT 39000,
  overview        TEXT NOT NULL DEFAULT '',
  who_for         TEXT NOT NULL DEFAULT '',
  career_outcomes TEXT NOT NULL DEFAULT '',
  prerequisite    TEXT NOT NULL DEFAULT 'None',
  capstone        TEXT NOT NULL DEFAULT '',
  assessment      TEXT NOT NULL DEFAULT '',
  featured        BOOLEAN NOT NULL DEFAULT false,
  is_new          BOOLEAN NOT NULL DEFAULT false,
  published       BOOLEAN NOT NULL DEFAULT true,
  ordinal         INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE program_tracks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_code  TEXT NOT NULL REFERENCES programs(code) ON DELETE CASCADE,
  code          TEXT NOT NULL,                     -- A | B | C | CAP
  name          TEXT NOT NULL,
  ordinal       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (program_code, code)
);

CREATE TABLE lessons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'video',       -- video | law | reading
  minutes     INTEGER,
  video_url   TEXT,
  notes_md    TEXT NOT NULL DEFAULT '',
  lens_md     TEXT NOT NULL DEFAULT '',            -- "The Lawmads lens" callout
  resources   JSONB NOT NULL DEFAULT '[]'::jsonb,
  instructor  TEXT NOT NULL DEFAULT 'Lead Faculty',
  law_credits INTEGER NOT NULL DEFAULT 0,          -- awarded on completion for law lessons
  tech_credits INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE quizzes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT NOT NULL UNIQUE,
  title         TEXT NOT NULL,
  pass_pct      INTEGER NOT NULL DEFAULT 80,
  tech_credits  INTEGER NOT NULL DEFAULT 2,
  law_credits   INTEGER NOT NULL DEFAULT 0,
  kind          TEXT NOT NULL DEFAULT 'quiz'       -- quiz | exam
);
CREATE TABLE quiz_questions (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id   UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  ordinal   INTEGER NOT NULL,
  prompt    TEXT NOT NULL,
  options   JSONB NOT NULL,                        -- [{key:"A",text:"..."}]
  answer    TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT ''
);

-- IDE ------------------------------------------------------------------------
CREATE TABLE languages (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  monaco      TEXT NOT NULL,
  judge0_id   INTEGER,
  grading     TEXT NOT NULL DEFAULT 'stdio',       -- stdio | browser | structural
  agentic     BOOLEAN NOT NULL DEFAULT false,
  file_name   TEXT NOT NULL DEFAULT 'main.txt',
  ordinal     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE exercises (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  TEXT NOT NULL UNIQUE,
  title                 TEXT NOT NULL,
  language              TEXT NOT NULL REFERENCES languages(slug),
  ordinal               INTEGER NOT NULL DEFAULT 1,   -- 1..3 within the language track
  difficulty            TEXT NOT NULL DEFAULT 'beginner',
  instructions_md       TEXT NOT NULL DEFAULT '',
  checks                JSONB NOT NULL DEFAULT '[]'::jsonb,   -- human-readable check list
  starter_code          TEXT NOT NULL DEFAULT '',
  solution_code         TEXT NOT NULL DEFAULT '',
  hints                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  structural_rules      JSONB NOT NULL DEFAULT '[]'::jsonb,   -- for browser/structural grading
  time_limit_sec        NUMERIC(5,2),
  memory_limit_kb       INTEGER,
  reveal_solution_after INTEGER NOT NULL DEFAULT 3,
  feedback              JSONB NOT NULL DEFAULT '{}'::jsonb,
  tech_credits          INTEGER NOT NULL DEFAULT 3,
  published             BOOLEAN NOT NULL DEFAULT true,
  course_ref            TEXT,
  lesson_ref            TEXT,
  created_by            UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX exercises_language_idx ON exercises (language, ordinal);

CREATE TABLE test_cases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id     UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT 'case',
  input           TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  weight          NUMERIC(5,2) NOT NULL DEFAULT 1.0,
  hidden          BOOLEAN NOT NULL DEFAULT true,
  ordinal         INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX test_cases_exercise_idx ON test_cases (exercise_id);

CREATE TABLE submissions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL DEFAULT 'submit',    -- run | submit
  code          TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'queued',
  score         NUMERIC(5,2),
  passed        BOOLEAN,
  runtime_ms    INTEGER,
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_to_lms BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  graded_at     TIMESTAMPTZ
);
CREATE INDEX submissions_user_exercise_idx ON submissions (user_id, exercise_id, created_at DESC);
CREATE INDEX submissions_status_idx ON submissions (status) WHERE status IN ('queued','processing');

CREATE TABLE submission_tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
  test_case_id  UUID NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  judge0_token  TEXT UNIQUE,
  status        TEXT NOT NULL DEFAULT 'queued',
  passed        BOOLEAN,
  actual_output TEXT,
  runtime_ms    INTEGER,
  detail        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX submission_tests_submission_idx ON submission_tests (submission_id);

CREATE TABLE exercise_progress (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  best_score    NUMERIC(5,2) NOT NULL DEFAULT 0,
  attempts      INTEGER NOT NULL DEFAULT 0,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  completed     BOOLEAN NOT NULL DEFAULT false,
  credited      BOOLEAN NOT NULL DEFAULT false,
  last_submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id)
);

-- Curriculum items link program tracks to lessons / quizzes / exercises -------
CREATE TABLE curriculum_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_track_id UUID NOT NULL REFERENCES program_tracks(id) ON DELETE CASCADE,
  ordinal         INTEGER NOT NULL DEFAULT 0,
  kind            TEXT NOT NULL,                   -- video | quiz | lab | law | exam | project | capstone
  title           TEXT NOT NULL,
  minutes         INTEGER,
  meta            TEXT,                            -- "10 Q", "graded", "instructor-reviewed"
  lesson_id       UUID REFERENCES lessons(id) ON DELETE SET NULL,
  quiz_id         UUID REFERENCES quizzes(id) ON DELETE SET NULL,
  exercise_id     UUID REFERENCES exercises(id) ON DELETE SET NULL
);
CREATE INDEX curriculum_items_track_idx ON curriculum_items (program_track_id, ordinal);

-- Standalone courses -----------------------------------------------------------
CREATE TABLE courses (
  slug        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,                       -- design | development | data | specialized
  blurb       TEXT NOT NULL DEFAULT '',
  hours       NUMERIC(4,1) NOT NULL DEFAULT 6,
  level       TEXT NOT NULL DEFAULT 'Beginner',
  language    TEXT REFERENCES languages(slug),
  modules     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- [{title, minutes, kind}]
  program_code TEXT REFERENCES programs(code),
  ordinal     INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Learning state
-- ---------------------------------------------------------------------------
CREATE TABLE enrollments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_code  TEXT NOT NULL REFERENCES programs(code) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'active',    -- active | completed | cancelled
  order_id      UUID,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,
  UNIQUE (user_id, program_code)
);

CREATE TABLE course_enrollments (
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_slug TEXT NOT NULL REFERENCES courses(slug) ON DELETE CASCADE,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_slug)
);

CREATE TABLE item_progress (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id       UUID NOT NULL REFERENCES curriculum_items(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'todo',      -- todo | now | done
  score         NUMERIC(5,2),
  completed_at  TIMESTAMPTZ,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id     UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  answers     JSONB NOT NULL,
  score_pct   NUMERIC(5,2) NOT NULL,
  passed      BOOLEAN NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE credit_ledger (
  id            BIGSERIAL PRIMARY KEY,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind          TEXT NOT NULL,                     -- tech | law
  amount        INTEGER NOT NULL,
  source_type   TEXT NOT NULL,                     -- exercise | quiz | lesson | exam | capstone | badge | adjustment
  source_id     TEXT NOT NULL,
  program_code  TEXT REFERENCES programs(code),
  title         TEXT NOT NULL,
  score_label   TEXT,                              -- "92%", "Pass"
  item_kind     TEXT,                              -- for the transcript: Project | Quiz | Exam | IDE Exercise | Capstone
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, source_type, source_id)
);
CREATE INDEX credit_ledger_user_idx ON credit_ledger (user_id, created_at DESC);

CREATE TABLE activity_days (
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day       DATE NOT NULL,
  PRIMARY KEY (user_id, day)
);

-- ---------------------------------------------------------------------------
-- Credentials
-- ---------------------------------------------------------------------------
CREATE TABLE jurisdictions (
  code        TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  name_ar     TEXT NOT NULL DEFAULT '',
  flag        TEXT NOT NULL DEFAULT '',
  region      TEXT NOT NULL,
  family      TEXT NOT NULL,
  family_label TEXT NOT NULL DEFAULT '',
  badge_code  TEXT NOT NULL,
  hardness    TEXT NOT NULL DEFAULT 'standard',
  syllabus    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- sources, courts, weighting, sample questions, regulators, examiner...
  pass_rate_pct NUMERIC(5,2),
  ordinal     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE exam_sittings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction  TEXT NOT NULL REFERENCES jurisdictions(code),
  starts_at     TIMESTAMPTZ NOT NULL,
  capacity      INTEGER NOT NULL DEFAULT 100
);

CREATE TABLE exam_bookings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jurisdiction  TEXT NOT NULL REFERENCES jurisdictions(code),
  sitting_id    UUID REFERENCES exam_sittings(id),
  order_id      UUID,
  resit_available BOOLEAN NOT NULL DEFAULT true,
  status        TEXT NOT NULL DEFAULT 'booked',    -- booked | sat | cancelled
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE exam_attempts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jurisdiction  TEXT NOT NULL REFERENCES jurisdictions(code),
  booking_id    UUID REFERENCES exam_bookings(id),
  score_pct     NUMERIC(5,2) NOT NULL,
  passed        BOOLEAN NOT NULL,
  is_resit      BOOLEAN NOT NULL DEFAULT false,
  examined_by   TEXT NOT NULL DEFAULT 'Lawmads Examination Board',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE badges_earned (
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jurisdiction  TEXT NOT NULL REFERENCES jurisdictions(code),
  attempt_id    UUID REFERENCES exam_attempts(id),
  score_pct     NUMERIC(5,2) NOT NULL,
  verification_id TEXT NOT NULL UNIQUE,
  signature     TEXT NOT NULL,
  earned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked       BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, jurisdiction)
);

CREATE TABLE certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  program_code    TEXT NOT NULL REFERENCES programs(code),
  verification_id TEXT NOT NULL UNIQUE,            -- LWM-2026-0342
  kind            TEXT NOT NULL DEFAULT 'certificate',
  capstone_score  NUMERIC(5,2),
  payload         JSONB NOT NULL,                  -- the signed statement
  signature       TEXT NOT NULL,                   -- HMAC-SHA256 over canonical payload
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked         BOOLEAN NOT NULL DEFAULT false,
  revoked_reason  TEXT,
  UNIQUE (user_id, program_code)
);

CREATE SEQUENCE verification_seq START 342;

CREATE TABLE verification_log (
  id          BIGSERIAL PRIMARY KEY,
  verification_id TEXT NOT NULL,
  ip          INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Commerce
-- ---------------------------------------------------------------------------
CREATE TABLE promo_codes (
  code            TEXT PRIMARY KEY,
  percent_off     INTEGER NOT NULL,
  applies_to      TEXT[] ,                         -- NULL = all eligible SKUs
  max_redemptions INTEGER,
  redemptions     INTEGER NOT NULL DEFAULT 0,
  expires_at      TIMESTAMPTZ,
  active          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending',   -- pending | paid | failed | refunded
  currency      TEXT NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents   INTEGER NOT NULL,
  due_today_cents INTEGER NOT NULL,
  promo_code    TEXT REFERENCES promo_codes(code),
  installments  JSONB,                             -- {count, eachCents}
  quote         JSONB NOT NULL,
  provider      TEXT NOT NULL DEFAULT 'mock',
  provider_ref  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at       TIMESTAMPTZ
);
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);

CREATE TABLE order_items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sku         TEXT NOT NULL,
  ref         TEXT,                                -- program code, jurisdiction, product slug
  quantity    INTEGER NOT NULL DEFAULT 1,
  unit_cents  INTEGER NOT NULL,
  label       TEXT NOT NULL
);

CREATE TABLE payments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount_cents  INTEGER NOT NULL,
  status        TEXT NOT NULL,                     -- succeeded | failed | refunded
  provider      TEXT NOT NULL,
  provider_ref  TEXT,
  card_last4    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE installment_schedules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ordinal     INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL,
  due_at      TIMESTAMPTZ NOT NULL,
  paid_at     TIMESTAMPTZ
);

CREATE TABLE subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sku           TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',    -- active | cancelled | past_due
  order_id      UUID REFERENCES orders(id),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  interest    TEXT NOT NULL,
  slot        TIMESTAMPTZ NOT NULL,
  channel     TEXT NOT NULL DEFAULT 'video',       -- video | whatsapp
  notes       TEXT,
  status      TEXT NOT NULL DEFAULT 'booked',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Community + shop
-- ---------------------------------------------------------------------------
CREATE TABLE chapters (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '',
  blurb       TEXT NOT NULL DEFAULT '',
  ordinal     INTEGER NOT NULL DEFAULT 0,
  base_members INTEGER NOT NULL DEFAULT 0           -- legacy member count carried from the previous community
);
CREATE TABLE chapter_members (
  chapter_slug TEXT NOT NULL REFERENCES chapters(slug) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chapter_slug, user_id)
);
CREATE TABLE posts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_slug  TEXT NOT NULL REFERENCES chapters(slug),
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name   TEXT NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT NOT NULL DEFAULT '',
  link_label    TEXT,
  link_kind     TEXT,                              -- ide | figma | dataset | vote | url
  link_ref      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE post_votes (
  post_id   UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE community_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind        TEXT NOT NULL,                       -- LIVE | TALK | JAM
  title       TEXT NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,
  platform    TEXT NOT NULL DEFAULT 'Whereby',
  program_code TEXT REFERENCES programs(code)
);
CREATE TABLE design_submissions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  designer    TEXT NOT NULL,
  title       TEXT NOT NULL,
  month       TEXT NOT NULL,                       -- 2026-07
  image_url   TEXT,
  votes       INTEGER NOT NULL DEFAULT 0,
  winner      BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE design_votes (
  submission_id UUID NOT NULL REFERENCES design_submissions(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (submission_id, user_id)
);
CREATE TABLE products (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'tee',
  tag         TEXT NOT NULL DEFAULT '',
  blurb       TEXT NOT NULL DEFAULT '',
  price_cents INTEGER NOT NULL,
  sku         TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '👕',
  variants    JSONB NOT NULL DEFAULT '["S","M","L","XL"]'::jsonb,
  royalty_to  UUID REFERENCES users(id),
  ordinal     INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- Law database
-- ---------------------------------------------------------------------------
CREATE TABLE law_instruments (
  id            TEXT PRIMARY KEY,                  -- eg-cc-1948
  jurisdiction  TEXT NOT NULL REFERENCES jurisdictions(code),
  kind          TEXT NOT NULL,                     -- legislation | cassation | constitutional
  title_en      TEXT NOT NULL,
  title_ar      TEXT NOT NULL DEFAULT '',
  year          INTEGER,
  area          TEXT NOT NULL DEFAULT '',
  source_pdf    TEXT
);
CREATE TABLE law_articles (
  id            TEXT PRIMARY KEY,                  -- eg-cc-1948-art147
  instrument_id TEXT NOT NULL REFERENCES law_instruments(id) ON DELETE CASCADE,
  jurisdiction  TEXT NOT NULL REFERENCES jurisdictions(code),
  article       TEXT NOT NULL,
  text_en       TEXT NOT NULL DEFAULT '',
  text_ar       TEXT NOT NULL DEFAULT '',
  in_force_from DATE,
  amended_by    TEXT[] NOT NULL DEFAULT '{}',
  construed_by  TEXT[] NOT NULL DEFAULT '{}',
  provenance    JSONB NOT NULL DEFAULT '{}'::jsonb,
  tsv_en        tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(text_en,''))) STORED,
  tsv_ar        tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(text_ar,''))) STORED
);
CREATE INDEX law_articles_tsv_en_idx ON law_articles USING GIN (tsv_en);
CREATE INDEX law_articles_tsv_ar_idx ON law_articles USING GIN (tsv_ar);
CREATE INDEX law_articles_trgm_en_idx ON law_articles USING GIN (text_en gin_trgm_ops);
CREATE INDEX law_articles_trgm_ar_idx ON law_articles USING GIN (text_ar gin_trgm_ops);

CREATE TABLE coverage_stats (
  jurisdiction  TEXT PRIMARY KEY REFERENCES jurisdictions(code),
  entries       INTEGER NOT NULL DEFAULT 0,
  coverage_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  pdf_linked_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  note          TEXT NOT NULL DEFAULT ''
);

CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash    TEXT NOT NULL UNIQUE,
  prefix      TEXT NOT NULL,
  tier        TEXT NOT NULL DEFAULT 'research',
  monthly_limit INTEGER NOT NULL DEFAULT 1000,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked     BOOLEAN NOT NULL DEFAULT false
);

-- ---------------------------------------------------------------------------
-- AI, builder, workspace
-- ---------------------------------------------------------------------------
CREATE TABLE ai_models (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  blurb       TEXT NOT NULL DEFAULT '',
  lives_in    TEXT NOT NULL DEFAULT '',
  ordinal     INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE ai_generations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  model_slug    TEXT NOT NULL REFERENCES ai_models(slug),
  provider      TEXT NOT NULL,
  prompt_hash   TEXT NOT NULL,
  prompt_chars  INTEGER NOT NULL,
  output        TEXT NOT NULL,
  citations     JSONB NOT NULL DEFAULT '[]'::jsonb,
  confidence    NUMERIC(4,3),
  supervision   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE builder_projects (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  brief       TEXT NOT NULL,
  style       TEXT NOT NULL DEFAULT 'editorial',
  languages   TEXT[] NOT NULL DEFAULT ARRAY['en','ar'],
  models      JSONB NOT NULL DEFAULT '{}'::jsonb,
  domain      TEXT,
  status      TEXT NOT NULL DEFAULT 'draft',       -- draft | generated | published
  pages       JSONB NOT NULL DEFAULT '[]'::jsonb,
  assets      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE builder_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES builder_projects(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'queued',      -- queued | running | done | failed
  progress    INTEGER NOT NULL DEFAULT 0,
  log         JSONB NOT NULL DEFAULT '[]'::jsonb,
  result      JSONB,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE TABLE builder_credits (
  user_id   UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance   INTEGER NOT NULL DEFAULT 50
);

CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  governing_law TEXT REFERENCES jurisdictions(code),
  language_mode TEXT NOT NULL DEFAULT 'en',        -- en | ar | bi
  version       INTEGER NOT NULL DEFAULT 1,
  content       JSONB NOT NULL,                    -- [{id, heading, text_en, text_ar}]
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE document_versions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version     INTEGER NOT NULL,
  content     JSONB NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, version)
);
CREATE TABLE document_authorities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  clause_id   TEXT NOT NULL,
  article_id  TEXT NOT NULL REFERENCES law_articles(id),
  supports    BOOLEAN,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------
CREATE TABLE blog_posts (
  slug        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,                       -- trends | deep-dive | research | platform
  excerpt     TEXT NOT NULL DEFAULT '',
  body_md     TEXT NOT NULL DEFAULT '',
  author      TEXT NOT NULL,
  read_minutes INTEGER NOT NULL DEFAULT 12,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE podcast_episodes (
  number      INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  guest       TEXT NOT NULL,
  guest_role  TEXT NOT NULL DEFAULT '',
  series      TEXT NOT NULL,                       -- practice | build | regulate | career
  duration_sec INTEGER NOT NULL,
  summary     TEXT NOT NULL DEFAULT '',
  audio_url   TEXT,
  transcript_md TEXT NOT NULL DEFAULT '',
  published_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE newsletter_subscribers (
  email       CITEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Ops
-- ---------------------------------------------------------------------------
CREATE TABLE audit_log (
  id          BIGSERIAL PRIMARY KEY,
  actor       TEXT,
  action      TEXT NOT NULL,
  target      TEXT,
  meta        JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip          INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_action_idx ON audit_log (action, created_at DESC);

CREATE TABLE events (                              -- outbox for async integrations (LMS sync, email)
  id          BIGSERIAL PRIMARY KEY,
  topic       TEXT NOT NULL,
  payload     JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX events_pending_idx ON events (created_at) WHERE processed_at IS NULL;

CREATE TABLE feature_flags (
  key     TEXT PRIMARY KEY,
  value   JSONB NOT NULL
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_exercises_updated BEFORE UPDATE ON exercises FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_builder_updated BEFORE UPDATE ON builder_projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

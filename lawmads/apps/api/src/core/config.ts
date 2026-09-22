import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/** Load `.env` (repo root) once, without overriding real environment variables. */
function loadDotEnv() {
  for (const candidate of [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')]) {
    if (!existsSync(candidate)) continue;
    for (const line of readFileSync(candidate, 'utf8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
      if (!m || line.trim().startsWith('#')) continue;
      const key = m[1]!;
      let val = m[2]!.replace(/\s+#.*$/, '');
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      if (process.env[key] === undefined) process.env[key] = val;
    }
    break;
  }
}
loadDotEnv();

const env = (k: string, d = ''): string => process.env[k] ?? d;
const num = (k: string, d: number): number => { const v = Number(process.env[k]); return Number.isFinite(v) && process.env[k] !== '' && process.env[k] !== undefined ? v : d; };

export const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  isProd: env('NODE_ENV') === 'production',
  isTest: env('NODE_ENV') === 'test',
  logLevel: env('LOG_LEVEL', 'info'),
  port: num('PORT', 4000),
  publicWebOrigin: env('PUBLIC_WEB_ORIGIN', 'http://localhost:5173'),
  publicApiOrigin: env('PUBLIC_API_ORIGIN', 'http://localhost:4000'),
  corsOrigins: env('CORS_ALLOWED_ORIGINS', 'http://localhost:5173').split(',').map((s) => s.trim()).filter(Boolean),
  jwt: {
    secret: env('JWT_SECRET', 'dev-jwt-secret-change-me'),
    refreshSecret: env('JWT_REFRESH_SECRET', 'dev-refresh-secret-change-me'),
    accessTtl: num('JWT_ACCESS_TTL', 900),
    refreshTtl: num('JWT_REFRESH_TTL', 1209600),
    issuer: env('JWT_ISSUER', 'lawmads'),
    audience: env('JWT_AUDIENCE', 'lawmads-platform'),
    wpIssuer: env('WP_JWT_ISSUER', 'lawmads-wp'),
    wpAudience: env('WP_JWT_AUDIENCE', 'lawmads-playground')
  },
  serviceHmacSecret: env('SERVICE_HMAC_SECRET', 'dev-service-hmac'),
  certificateSigningKey: env('CERTIFICATE_SIGNING_KEY', 'dev-certificate-key'),
  databaseUrl: env('NODE_ENV') === 'test' ? env('TEST_DATABASE_URL', 'postgres://lawmads:lawmads@127.0.0.1:5432/lawmads_test') : env('DATABASE_URL', 'postgres://lawmads:lawmads@127.0.0.1:5432/lawmads'),
  redisUrl: env('REDIS_URL', 'redis://127.0.0.1:6379'),
  executor: env('EXECUTOR', 'local') as 'local' | 'judge0',
  judge0: { url: env('JUDGE0_URL', 'http://judge0-server:2358'), authToken: env('JUDGE0_AUTH_TOKEN'), callbackBase: env('GRADING_CALLBACK_BASE', 'http://localhost:4000') },
  freeTierRuntimeMinutes: num('FREE_TIER_RUNTIME_MINUTES', 120),
  wp: { gradeEndpoint: env('WP_GRADE_ENDPOINT'), appUser: env('WP_APP_USER'), appPassword: env('WP_APP_PASSWORD') },
  payments: { provider: env('PAYMENT_PROVIDER', 'mock') as 'mock' | 'stripe', stripeSecretKey: env('STRIPE_SECRET_KEY'), stripeWebhookSecret: env('STRIPE_WEBHOOK_SECRET') },
  ai: { provider: env('AI_PROVIDER', 'mock') as 'mock' | 'anthropic', anthropicApiKey: env('ANTHROPIC_API_KEY'), anthropicModel: env('ANTHROPIC_MODEL', 'claude-opus-5') },
  oauth: { google: { id: env('GOOGLE_CLIENT_ID'), secret: env('GOOGLE_CLIENT_SECRET') }, microsoft: { id: env('MICROSOFT_CLIENT_ID'), secret: env('MICROSOFT_CLIENT_SECRET') } },
  runMigrationsOnStart: env('RUN_MIGRATIONS_ON_START', 'false') === 'true'
};

if (config.isProd) {
  for (const [k, v] of Object.entries({ JWT_SECRET: config.jwt.secret, JWT_REFRESH_SECRET: config.jwt.refreshSecret, SERVICE_HMAC_SECRET: config.serviceHmacSecret, CERTIFICATE_SIGNING_KEY: config.certificateSigningKey })) {
    if (v.startsWith('dev-') || v.startsWith('change-me')) throw new Error(`${k} must be set in production`);
  }
  if (config.executor === 'local') throw new Error('EXECUTOR=local is not allowed in production — use judge0');
}

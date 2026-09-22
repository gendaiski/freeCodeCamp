import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { errorHandler, notFoundHandler } from './core/errors.js';
import { pool } from './core/db.js';
import { ensureRedis } from './core/redis.js';
import { authRouter } from './modules/auth/routes.js';
import { ideRouter, ideCompatRouter } from './modules/ide/routes.js';
import { registerModules } from './modules/index.js';
import './modules/register.js';

const here = dirname(fileURLToPath(import.meta.url));

export function createApp(): Express {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors({ origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes('*')), credentials: true }));
  app.use(express.json({ limit: '1mb', verify: (req, _res, buf) => { (req as any).rawBody = buf.toString('utf8'); } }));
  if (!config.isTest) app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/healthz' } }));

  app.get('/healthz', async (_req, res) => {
    const checks: Record<string, boolean> = {};
    try { await pool.query('SELECT 1'); checks.postgres = true; } catch { checks.postgres = false; }
    checks.redis = await ensureRedis();
    const ok = checks.postgres;
    res.status(ok ? 200 : 503).json({ ok, checks, executor: config.executor, version: '1.0.0' });
  });
  app.get('/api/v1/openapi.yaml', (_req, res) => {
    const p = [resolve(here, '../../../docs/openapi.yaml'), resolve(here, '../../docs/openapi.yaml')].find((x) => existsSync(x));
    if (!p) { res.status(404).end(); return; }
    res.type('text/yaml').send(readFileSync(p, 'utf8'));
  });

  const api = express.Router();
  api.use('/auth', authRouter);
  api.use('/ide', ideRouter);
  registerModules(api);
  api.use('/', ideCompatRouter);   // Phase-1 aliases: /api/v1/run, /submissions, /exercises, /judge0/callback, /internal/dispatch
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

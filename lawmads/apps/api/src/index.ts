import { createApp } from './app.js';
import { config } from './core/config.js';
import { logger } from './core/logger.js';
import { migrate } from './db/migrate.js';
import { reconcile, processOutbox } from './modules/ide/grading.js';
import './modules/register.js';

async function main() {
  if (config.runMigrationsOnStart) { const a = await migrate({ log: (s) => logger.info(s) }); logger.info({ applied: a }, 'migrations'); }
  const app = createApp();
  const server = app.listen(config.port, () => logger.info({ port: config.port, executor: config.executor }, 'lawmads api listening'));
  const timers = [
    setInterval(() => reconcile().catch((e) => logger.warn({ err: String(e) }, 'reconcile failed')), 15_000),
    setInterval(() => processOutbox().catch((e) => logger.warn({ err: String(e) }, 'outbox failed')), 10_000)
  ];
  const shutdown = () => { timers.forEach(clearInterval); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 3000).unref(); };
  process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
}
main().catch((e) => { logger.error(e, 'fatal'); process.exit(1); });

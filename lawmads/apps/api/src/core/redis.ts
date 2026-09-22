import { Redis } from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

/** Redis is used for refresh-token jti tracking, rate limits and runtime quotas. */
export const redis = new Redis(config.redisUrl, { lazyConnect: true, maxRetriesPerRequest: 2, enableOfflineQueue: true });
redis.on('error', (e: Error) => logger.warn({ err: e.message }, 'redis error'));

let connecting: Promise<void> | null = null;
const status = (): string => redis.status;
export async function ensureRedis(): Promise<boolean> {
  if (status() === 'ready') return true;
  if (!connecting) connecting = redis.connect().catch((e: Error) => { logger.warn({ err: e.message }, 'redis unavailable'); }).finally(() => { connecting = null; });
  await connecting;
  return status() === 'ready';
}

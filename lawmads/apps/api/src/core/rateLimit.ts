import type { RequestHandler } from 'express';
import { redis, ensureRedis } from './redis.js';
import { tooMany } from './errors.js';
import { clientIp } from './http.js';

const memory = new Map<string, { n: number; reset: number }>();

/** Fixed-window limiter keyed by ip (or user). Redis-backed; falls back to process memory. */
export function rateLimit(opts: { key: string; limit: number; windowSec: number; byUser?: boolean }): RequestHandler {
  return async (req, _res, next) => {
    const who = opts.byUser && req.user ? `u:${req.user.id}` : `ip:${clientIp(req) ?? 'unknown'}`;
    const key = `rl:${opts.key}:${who}`;
    try {
      let count: number;
      if (await ensureRedis()) {
        count = await redis.incr(key);
        if (count === 1) await redis.expire(key, opts.windowSec);
      } else {
        const now = Date.now();
        const rec = memory.get(key);
        if (!rec || rec.reset < now) { memory.set(key, { n: 1, reset: now + opts.windowSec * 1000 }); count = 1; }
        else { rec.n++; count = rec.n; }
      }
      if (count > opts.limit) return next(tooMany(`Rate limit exceeded: ${opts.limit} per ${opts.windowSec}s`));
      next();
    } catch (e) { next(e); }
  };
}

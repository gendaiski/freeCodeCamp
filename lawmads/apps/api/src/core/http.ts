import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { ZodTypeAny, z } from 'zod';

/** Wrap an async handler so rejections reach the error handler. */
export const h = (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown> | unknown): RequestHandler =>
  (req, res, next) => { Promise.resolve(fn(req, res, next)).catch(next); };

export function parseBody<S extends ZodTypeAny>(schema: S, req: Request): z.output<S> { return schema.parse(req.body ?? {}); }
export function parseQuery<S extends ZodTypeAny>(schema: S, req: Request): z.output<S> { return schema.parse(req.query ?? {}); }

export function paging(req: Request, defaults = { limit: 20, max: 100 }) {
  const limit = Math.min(defaults.max, Math.max(1, Number(req.query.limit) || defaults.limit));
  const page = Math.max(1, Number(req.query.page) || 1);
  return { limit, offset: (page - 1) * limit, page };
}
export function clientIp(req: Request): string | null {
  const xf = req.headers['x-forwarded-for'];
  const ip = (Array.isArray(xf) ? xf[0] : xf?.split(',')[0])?.trim() || req.socket.remoteAddress || null;
  return ip && /^[0-9a-fA-F.:]+$/.test(ip) ? ip : null;
}

/** Route param as a string (express types it as possibly undefined under noUncheckedIndexedAccess). */
export function param(req: Request, name: string): string { return String(req.params[name] ?? ''); }

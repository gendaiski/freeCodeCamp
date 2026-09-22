import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { logger } from './logger.js';

export class HttpError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
export const badRequest = (msg: string, details?: unknown) => new HttpError(400, 'bad_request', msg, details);
export const unauthorized = (msg = 'Authentication required') => new HttpError(401, 'unauthorized', msg);
export const forbidden = (msg = 'Forbidden') => new HttpError(403, 'forbidden', msg);
export const notFound = (what = 'Resource') => new HttpError(404, 'not_found', `${what} not found`);
export const conflict = (msg: string) => new HttpError(409, 'conflict', msg);
export const tooMany = (msg = 'Too many requests') => new HttpError(429, 'rate_limited', msg);

export const notFoundHandler: RequestHandler = (_req, res) => { res.status(404).json({ error: { code: 'not_found', message: 'Route not found' } }); };

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: { code: 'validation_error', message: 'Invalid request', details: err.flatten() } });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'bad_json', message: 'Malformed JSON body' } });
    return;
  }
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 500 && typeof err?.type === 'string') { // other body-parser errors, e.g. 413 entity.too.large
    res.status(err.status).json({ error: { code: err.type.replace(/\./g, '_'), message: err.status === 413 ? 'Request body too large' : err.message } });
    return;
  }
  if (err?.code === '22P02') { // postgres invalid_text_representation: a malformed uuid/number in a path or query param
    res.status(400).json({ error: { code: 'bad_request', message: 'Malformed identifier' } });
    return;
  }
  logger.error({ err, path: req.path }, 'unhandled error');
  res.status(500).json({ error: { code: 'internal_error', message: 'Internal server error' } });
};

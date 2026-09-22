import type { RequestHandler } from 'express';
import { hmacHex, safeEqualHex } from './crypto.js';
import { forbidden, unauthorized } from './errors.js';

/** Server-to-server calls carry X-Lawmads-Signature = HMAC_SHA256(rawBody, SERVICE_HMAC_SECRET). */
export const requireServiceSignature: RequestHandler = (req, _res, next) => {
  const sig = req.header('x-lawmads-signature');
  if (!sig) return next(unauthorized('Missing service signature'));
  const expected = hmacHex(req.rawBody ?? '');
  if (!/^[0-9a-f]{64}$/i.test(sig) || !safeEqualHex(expected, sig.toLowerCase())) return next(forbidden('Invalid service signature'));
  next();
};

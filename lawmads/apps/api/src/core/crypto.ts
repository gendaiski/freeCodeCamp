import { createHash, createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';

/** scrypt password hashing: "scrypt$N$r$p$salt$hash" (all base64url). */
export function hashPassword(password: string): string {
  const N = 16384, r = 8, p = 1;
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N, r, p });
  return ['scrypt', N, r, p, salt.toString('base64url'), hash.toString('base64url')].join('$');
}
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, N, r, p, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !N || !r || !p || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = scryptSync(password, Buffer.from(salt, 'base64url'), expected.length, { N: Number(N), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hmacHex(body: string, secret = config.serviceHmacSecret): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex'), bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && ba.length > 0 && timingSafeEqual(ba, bb);
}
export function sha256(s: string): string { return createHash('sha256').update(s).digest('hex'); }
export function randomToken(bytes = 32): string { return randomBytes(bytes).toString('base64url'); }

/** Canonical JSON (sorted keys) so a signature is stable across serialisers. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v as object).sort().map((k) => JSON.stringify(k) + ':' + canonicalJson((v as any)[k])).join(',') + '}';
  return JSON.stringify(v);
}
/** Credential signing (HMAC-SHA256 with the certificate key; swap for Ed25519 when a KMS is wired). */
export function signCredential(payload: Record<string, unknown>): string {
  return createHmac('sha256', config.certificateSigningKey).update(canonicalJson(payload)).digest('base64url');
}
export function verifyCredential(payload: Record<string, unknown>, signature: string): boolean {
  const expected = signCredential(payload);
  const a = Buffer.from(expected), b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** RFC 6238 TOTP (SHA-1, 30 s, 6 digits). */
export function totpCode(secretBase32: string, at = Date.now(), step = 30): string {
  const key = base32Decode(secretBase32);
  const counter = Math.floor(at / 1000 / step);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', key).update(buf).digest();
  const off = h[h.length - 1]! & 0xf;
  const code = ((h[off]! & 0x7f) << 24 | (h[off + 1]! & 0xff) << 16 | (h[off + 2]! & 0xff) << 8 | (h[off + 3]! & 0xff)) % 1_000_000;
  return code.toString().padStart(6, '0');
}
export function totpVerify(secretBase32: string, code: string, window = 1): boolean {
  const now = Date.now();
  for (let i = -window; i <= window; i++) if (totpCode(secretBase32, now + i * 30_000) === code) return true;
  return false;
}
export function newTotpSecret(): string { return base32Encode(randomBytes(20)); }
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buf: Buffer): string {
  let bits = 0, value = 0, out = '';
  for (const byte of buf) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += B32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}
export function base32Decode(s: string): Buffer {
  let bits = 0, value = 0; const out: number[] = [];
  for (const ch of s.replace(/=+$/, '').toUpperCase()) { const idx = B32.indexOf(ch); if (idx < 0) continue; value = (value << 5) | idx; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}

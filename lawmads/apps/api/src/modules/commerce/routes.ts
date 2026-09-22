import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param } from '../../core/http.js';
import { requireAuth, optionalAuth } from '../../core/auth.js';
import { rateLimit } from '../../core/rateLimit.js';
import * as svc from './service.js';

export const commerceRouter = Router();
const quoteSchema = z.object({ sku: z.string().min(2).max(40), ref: z.string().max(40).nullable().optional(), quantity: z.number().int().min(1).max(500).optional(), promo: z.string().max(40).nullable().optional(), installments: z.boolean().optional() });
commerceRouter.get('/plans', h(async (_req, res) => { res.json(await svc.plans()); }));
commerceRouter.post('/quote', optionalAuth, h(async (req, res) => { res.json(await svc.quote(req.user?.id ?? null, parseBody(quoteSchema, req))); }));
commerceRouter.post('/checkout', requireAuth, rateLimit({ key: 'checkout', limit: 20, windowSec: 60, byUser: true }), h(async (req, res) => {
  const body = parseBody(quoteSchema.extend({ card: z.object({ number: z.string().min(12).max(23), expiry: z.string().min(4).max(7), cvc: z.string().min(3).max(4), name: z.string().max(80).optional() }).nullable().optional(), paymentMethodId: z.string().max(80).nullable().optional() }), req);
  res.status(201).json(await svc.checkout(req.user!.id, body));
}));
commerceRouter.get('/orders', requireAuth, h(async (req, res) => { res.json({ orders: await svc.orders(req.user!.id) }); }));
commerceRouter.post('/orders/:id/refund', requireAuth, h(async (req, res) => { res.json(await svc.refund(req.user!.id, param(req, 'id'), req.user!.roles.includes('admin') ? 'admin' : 'user')); }));

export const bookingsRouter = Router();
bookingsRouter.get('/slots', h(async (_req, res) => { res.json({ slots: svc.slots(), whatsapp: 'https://wa.me/201000000000', interests: ['AI & Automation track', 'Legal Design Thinking', 'Web Development', 'Data Science', 'Enterprise / my firm'] }); }));
bookingsRouter.post('/', optionalAuth, rateLimit({ key: 'booking', limit: 10, windowSec: 600 }), h(async (req, res) => {
  const b = parseBody(z.object({ fullName: z.string().min(2).max(120), email: z.string().email(), interest: z.string().min(2).max(80), slot: z.string().min(10), channel: z.enum(['video', 'whatsapp']).default('video'), notes: z.string().max(1000).optional() }), req);
  res.status(201).json(await svc.book({ ...b, userId: req.user?.id ?? null }));
}));

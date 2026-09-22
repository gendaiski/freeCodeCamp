import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody } from '../../core/http.js';
import { qualify, CRAFTS, JURISDICTIONS } from '@lawmads/shared';

export const trackDesignerRouter = Router();
trackDesignerRouter.get('/options', h(async (_req, res) => {
  res.json({
    jurisdictions: JURISDICTIONS, crafts: CRAFTS,
    presets: [
      { name: 'MENA corporate technologist', jurisdictions: ['EG', 'AE'], craft: 'LTS' },
      { name: 'Cross-border legal designer', jurisdictions: ['EG', 'GB'], craft: 'LUID' },
      { name: 'Gulf data scientist', jurisdictions: ['AE', 'SA'], craft: 'LDS' },
      { name: 'European full-stack counsel', jurisdictions: ['NL', 'DE'], craft: 'LWD-FS' }
    ]
  });
}));
trackDesignerRouter.post('/qualify', h(async (req, res) => {
  const b = parseBody(z.object({ jurisdictions: z.array(z.string().min(2).max(24)).max(4), craft: z.string().min(2).max(12) }), req);
  res.json(qualify(b));
}));

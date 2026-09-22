/**
 * The Verified Lawmad ladder.
 *   1 jurisdiction + 1 craft            → Local
 *   2 jurisdictions (same region)       → Regional
 *   2 jurisdictions (across regions)    → International (rarer)
 *   3 jurisdictions                     → Global
 *   4 jurisdictions + reviewed capstone → Master
 * The Product doc's stricter certificate requirements sit behind `requireCertificates`.
 */
import { findJurisdiction } from './jurisdictions.js';

export type LadderTier = 'none' | 'local' | 'regional' | 'international' | 'global' | 'master';

export interface LadderInput {
  jurisdictions: string[];        // codes of passed badges
  hasCraft: boolean;              // enrolled in / completed at least one certification track
  hasCapstone: boolean;           // reviewed capstone passed
  certificates?: number;
  diplomas?: number;
  careerCertificates?: number;
}
export interface LadderOptions { requireCertificates?: boolean }
export interface LadderResult {
  tier: LadderTier;
  label: string;
  emoji: string;
  jurisdictions: number;
  next: { tier: LadderTier; label: string; needs: string } | null;
}

export const TIER_LABELS: Record<LadderTier, { label: string; emoji: string }> = {
  none: { label: 'Lawmad', emoji: '◇' },
  local: { label: 'Local Lawmad', emoji: '◆' },
  regional: { label: 'Regional Lawmad', emoji: '🥉' },
  international: { label: 'International Lawmad', emoji: '🌐' },
  global: { label: 'Global Lawmad', emoji: '🥈' },
  master: { label: 'Master Lawmad', emoji: '🥇' }
};

export function computeLadder(input: LadderInput, opts: LadderOptions = {}): LadderResult {
  const codes = Array.from(new Set(input.jurisdictions.map((c) => c.toUpperCase())));
  const n = codes.length;
  const certs = (input.certificates ?? 0);
  const diplomas = (input.diplomas ?? 0);
  const career = (input.careerCertificates ?? 0);
  const req = opts.requireCertificates === true;

  let tier: LadderTier = 'none';
  if (n >= 4 && input.hasCapstone && (!req || career >= 1)) tier = 'master';
  else if (n >= 3 && (!req || certs >= 2 || diplomas >= 1)) tier = 'global';
  else if (n === 2 || (n >= 2 && tier === 'none')) {
    if (!req || certs >= 1) {
      const regions = new Set(codes.map((c) => findJurisdiction(c)?.region ?? 'MENA'));
      tier = regions.size > 1 ? 'international' : 'regional';
    } else tier = 'local';
  } else if (n === 1 && input.hasCraft) tier = 'local';

  const meta = TIER_LABELS[tier];
  const next = nextRung(tier, n, input.hasCapstone);
  return { tier, label: meta.label, emoji: meta.emoji, jurisdictions: n, next };
}

function nextRung(tier: LadderTier, n: number, hasCapstone: boolean): LadderResult['next'] {
  switch (tier) {
    case 'none': return { tier: 'local', label: TIER_LABELS.local.label, needs: n === 0 ? 'Pass one jurisdiction badge and enrol in a craft' : 'Enrol in a certification track' };
    case 'local': return { tier: 'regional', label: TIER_LABELS.regional.label, needs: 'Pass a second jurisdiction badge' };
    case 'regional':
    case 'international': return { tier: 'global', label: TIER_LABELS.global.label, needs: 'Pass a third jurisdiction badge' };
    case 'global': return { tier: 'master', label: TIER_LABELS.master.label, needs: n >= 4 && !hasCapstone ? 'Complete the reviewed capstone' : 'Pass a fourth badge and complete the reviewed capstone' };
    default: return null;
  }
}

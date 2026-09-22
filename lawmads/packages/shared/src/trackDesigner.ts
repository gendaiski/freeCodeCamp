/** The qualification builder: two jurisdictions + one craft → what it makes you (and does not). */
import { findJurisdiction, type Jurisdiction } from './jurisdictions.js';

export interface Craft { code: string; name: string; kind: 'certification' | 'tool'; roles: string[]; subjects: string[] }

export const CRAFTS: readonly Craft[] = [
  { code: 'LUID', name: 'Legal UI Designer', kind: 'certification', roles: ['Legal UI/UX designer', 'Design-literate IP counsel', 'Legal product designer'], subjects: ['Copyright & related rights', 'Design registration', 'Digital signatures'] },
  { code: 'LTS', name: 'Legal Tech Specialist', kind: 'certification', roles: ['Legal tech specialist', 'Innovation counsel', 'Legal ops technologist'], subjects: ['Software licensing', 'Data protection', 'AI supervision'] },
  { code: 'LDS', name: 'Legal Data Scientist', kind: 'certification', roles: ['Legal data scientist', 'AI supervision counsel'], subjects: ['AI regulation', 'Training-data rights', 'Precedent analytics'] },
  { code: 'LWD-FS', name: 'Full Stack JS Developer', kind: 'certification', roles: ['Full-stack developer (legal sector)', 'Legal tech founder'], subjects: ['Civil obligations online', 'Corporate disclosures', 'E-signature validity'] },
  { code: 'LOSINT', name: 'Legal OSINT Analyst', kind: 'certification', roles: ['Legal OSINT analyst', 'Cyber intelligence investigator'], subjects: ['Lawful collection', 'Admissibility', 'Defamation'] },
  { code: 'AICP', name: 'AI Copilot Diploma', kind: 'certification', roles: ['Head of legal innovation', 'AI programme lead'], subjects: ['AI regulatory landscape', 'Firm AI policy', 'Vendor contracts'] },
  { code: 'LBA', name: 'Legal Blockchain Architect', kind: 'certification', roles: ['Legal blockchain architect'], subjects: ['Token classification', 'AML/KYC', 'Cross-border crypto regulation'] },
  { code: 'FIGMA', name: 'Figma (tool only)', kind: 'tool', roles: [], subjects: [] },
  { code: 'PYTHON', name: 'Python (tool only)', kind: 'tool', roles: [], subjects: [] },
  { code: 'N8N', name: 'n8n (tool only)', kind: 'tool', roles: [], subjects: [] }
] as const;

export interface QualifyInput { jurisdictions: string[]; craft: string }
export interface QualifyResult {
  ok: boolean;
  error?: string;
  qualifiesAs: string;
  tier: 'regional' | 'international' | null;
  credentialIssues: boolean;
  pairing: { kind: 'dual-system' | 'cross-border' | 'same-family' | 'mixed'; explanation: string };
  qualifiesTo: string[];
  doesNotQualifyTo: string[];
  roles: string[];
  expectations: string[];
  subjects: string[];
  gapToNextRung: string;
  jurisdictions: Jurisdiction[];
  craft: Craft | null;
  rarity: 'common' | 'rare' | 'rarest';
}

export function qualify(input: QualifyInput): QualifyResult {
  const js = input.jurisdictions.map((c) => findJurisdiction(c)).filter((j): j is Jurisdiction => Boolean(j));
  const craft = CRAFTS.find((c) => c.code === input.craft.toUpperCase()) ?? null;
  const base: QualifyResult = {
    ok: false, qualifiesAs: '—', tier: null, credentialIssues: false,
    pairing: { kind: 'mixed', explanation: '' }, qualifiesTo: [], doesNotQualifyTo: [], roles: [], expectations: [], subjects: [],
    gapToNextRung: '', jurisdictions: js, craft, rarity: 'common'
  };
  if (js.length !== 2 || js[0]!.code === js[1]!.code) return { ...base, error: 'Choose exactly two different jurisdictions.' };
  if (!craft) return { ...base, error: 'Choose a craft.' };

  const [a, b] = js as [Jurisdiction, Jurisdiction];
  const crossRegion = a.region !== b.region;
  const families = new Set([a.family, b.family]);
  const dualSystem = families.has('common') && (families.has('civil') || families.has('hybrid') || families.has('sharia'));
  const tier = crossRegion ? 'international' : 'regional';
  const pairingKind = dualSystem && crossRegion ? 'cross-border' : dualSystem ? 'dual-system' : families.size === 1 ? 'same-family' : 'mixed';
  const rarity = dualSystem && crossRegion ? 'rarest' : crossRegion || dualSystem ? 'rare' : 'common';

  const pairingExplanation = {
    'cross-border': `${a.name} and ${b.name} sit either side of the MENA/Europe boundary and reason from opposite methods — the profile clients ask for by name.`,
    'dual-system': `${a.name} (${a.family}) and ${b.name} (${b.family}) reason differently: a clause-matching model is reliable in a codified system and dangerous in a common-law one.`,
    'same-family': `Both are ${a.family}-law systems: the profile is deep rather than broad — you know one legal method properly and can prove it in two markets.`,
    'mixed': `${a.name} and ${b.name} share a region but not a legal method — a useful comparative profile.`
  }[pairingKind];

  const credentialIssues = craft.kind === 'certification';
  const label = `${tier === 'international' ? 'International' : 'Regional'} Lawmad`;
  const qualifiesAs = credentialIssues ? `${label} — ${craft.name} (${craft.code}®)` : `${craft.name}: a skill, not a credential`;

  return {
    ...base, ok: true, qualifiesAs, tier, credentialIssues,
    pairing: { kind: pairingKind, explanation: pairingExplanation },
    qualifiesTo: credentialIssues
      ? [`Hold a digitally signed, QR-verifiable ${craft.code}® certificate`, `Carry the ${label} badge on your public profile`, `Be examined against the ${a.name} and ${b.name} legal systems`, 'Count both badges toward Global and Master']
      : ['Use the tool with graded practice in the IDE', 'Earn Tech Credits toward a later certification'],
    doesNotQualifyTo: ['Practise, appear, or hold out as admitted in either jurisdiction', 'Give regulated legal advice on the strength of the badge alone', ...(credentialIssues ? [] : ['Receive any Lawmads credential — tools-only paths issue nothing'])],
    roles: craft.roles,
    expectations: ['A 30-minute placement call with an instructor', 'Graded IDE work from week one; Tech Credits accrue automatically', `Two badge sittings (${a.name}, ${b.name}) — any order, one free resit each`, 'Instructor-reviewed capstone, then the signed credential'],
    subjects: craft.subjects,
    gapToNextRung: `One more jurisdiction badge makes you a Global Lawmad; a fourth with a reviewed capstone makes you Master.`,
    rarity
  };
}

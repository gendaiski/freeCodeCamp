import { JURISDICTIONS } from '@lawmads/shared';

const syllabus = (j: { code: string; name: string; family: string }) => ({
  why: `Who sits the ${j.name} badge and why: practitioners whose matters touch this system and technologists building for its market.`,
  sources: j.family === 'common'
    ? ['Statute', 'Case law (binding precedent)', 'Equity', 'EU-retained law (UK)']
    : j.family === 'sharia'
    ? ['Sharia (Qur’an, Sunna)', 'Royal decrees and codified regulations', 'Ministerial regulations', 'Court practice']
    : ['Constitution', 'Codes (civil, commercial, procedure)', 'Statutes and decrees', 'Cassation / supreme-court principles', 'Custom'],
  courts: j.family === 'common'
    ? ['Magistrates / County', 'High Court', 'Court of Appeal', 'Supreme Court']
    : ['First-instance courts', 'Courts of Appeal', 'Court of Cassation', 'Constitutional court'],
  market: ['Corporate & commercial', 'Data protection', 'E-commerce & consumer', 'Dispute resolution', 'Fintech & payments'],
  regulators: ['Central bank', 'Data-protection authority', 'Commercial registry', 'Capital-market authority'],
  weighting: [{ subject: 'Sources & method', pct: 15 }, { subject: 'Contract & obligations', pct: 25 }, { subject: 'Companies & commercial', pct: 20 }, { subject: 'Data, tech & e-commerce', pct: 25 }, { subject: 'Procedure & evidence', pct: 15 }],
  sample: [
    { q: `A supplier in ${j.name} assigns future IP to a client by email. Is the assignment effective?`, a: 'Depends on the formality rules for IP transfers in this system — the exam asks what happens, not what the article says.', answer: 'It is effective only if the jurisdiction’s formality rule for IP assignments is satisfied; an email may not be.' },
    { q: 'A consumer cancels an online purchase after 10 days. What applies?', a: 'The statutory withdrawal window and its exceptions.', answer: 'The cancellation right runs from delivery; digital goods and bespoke items are typically excluded.' }
  ],
  primarySources: ['The civil/commercial code or its equivalent', 'Data-protection law', 'E-commerce / electronic transactions law', 'Companies law'],
  prepare: ['Jurisdiction module in the Law Textbooks Library', 'Search the Law Database while you revise', 'Thirty minutes with the examiner — free'],
  technologist: `What this jurisdiction means for a technologist: which rules your product must encode, and which it must never automate.`,
  whyFail: j.family === 'common' ? 'Candidates trained in codified systems try to find “the article” — the paper asks them to reason from cases.' : 'Candidates trained in common law reason by analogy; the paper asks them to reason downward from the code.',
  examiner: 'Ahmed El Gendy',
  holders: 'Held by practitioners across MENA and Europe; appears on the public profile with a signed QR.',
  pairWith: j.family === 'common' ? ['EG', 'AE'] : ['GB', 'DE']
});

export const JURISDICTION_ROWS = JURISDICTIONS.map((j, i) => ({
  ...j, ordinal: i + 1,
  passRate: { EG: 78, GB: 52, AE: 71, SA: 66, QA: 69, OM: 70, BH: 72, NL: 63, DE: 49 }[j.code] ?? 65,
  syllabus: syllabus(j)
}));

export const COVERAGE = [
  ['EG', 47214, 100, 98.2, 'Complete: legislation, Cassation and Supreme Constitutional Court merits.'],
  ['GB', 21480, 86, 99.1, 'Primary legislation complete; case law partial.'],
  ['AE', 18640, 81, 97.4, 'Federal law and DIFC/ADGM regulations.'],
  ['SA', 14890, 72, 95.0, 'Codified regulations; court practice partial.'],
  ['QA', 9120, 44, 93.5, 'Partial — check the source for ministerial regulations.'],
  ['OM', 7880, 38, 92.0, 'Partial.'],
  ['BH', 8340, 61, 96.2, 'Legislation complete; merits partial.'],
  ['NL', 9020, 58, 97.8, 'Civil Code books complete.'],
  ['DE', 7230, 55, 98.0, 'BGB and HGB complete; Länder regulation partial.']
] as const;

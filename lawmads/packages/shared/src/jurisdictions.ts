/** The nine examined jurisdictions. Counts in the UI derive from this list. */
export type Region = 'MENA' | 'Europe';
export type LegalFamily = 'common' | 'civil' | 'sharia' | 'hybrid';

export interface Jurisdiction {
  code: string;        // ISO-3166 alpha-2
  slug: string;
  name: string;
  nameAr: string;
  flag: string;
  region: Region;
  family: LegalFamily;
  familyLabel: string;
  badgeCode: string;   // printed on the credential
  hardness: 'standard' | 'hard';
}

export const JURISDICTIONS: readonly Jurisdiction[] = [
  { code: 'EG', slug: 'egypt', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', region: 'MENA', family: 'civil', familyLabel: 'Civil law · MENA', badgeCode: 'LWM-EG', hardness: 'standard' },
  { code: 'GB', slug: 'united-kingdom', name: 'United Kingdom', nameAr: 'المملكة المتحدة', flag: '🇬🇧', region: 'Europe', family: 'common', familyLabel: 'Common law · Europe', badgeCode: 'LWM-GB', hardness: 'hard' },
  { code: 'AE', slug: 'united-arab-emirates', name: 'United Arab Emirates', nameAr: 'الإمارات', flag: '🇦🇪', region: 'MENA', family: 'hybrid', familyLabel: 'Hybrid — civil onshore, common law in DIFC/ADGM', badgeCode: 'LWM-AE', hardness: 'standard' },
  { code: 'SA', slug: 'saudi-arabia', name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦', region: 'MENA', family: 'sharia', familyLabel: 'Sharia-based — codifying now', badgeCode: 'LWM-SA', hardness: 'standard' },
  { code: 'QA', slug: 'qatar', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', region: 'MENA', family: 'civil', familyLabel: 'Civil law · MENA', badgeCode: 'LWM-QA', hardness: 'standard' },
  { code: 'OM', slug: 'oman', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', region: 'MENA', family: 'civil', familyLabel: 'Civil law · MENA', badgeCode: 'LWM-OM', hardness: 'standard' },
  { code: 'BH', slug: 'bahrain', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', region: 'MENA', family: 'civil', familyLabel: 'Civil law · MENA', badgeCode: 'LWM-BH', hardness: 'standard' },
  { code: 'NL', slug: 'netherlands', name: 'Netherlands', nameAr: 'هولندا', flag: '🇳🇱', region: 'Europe', family: 'civil', familyLabel: 'Civil law · Europe', badgeCode: 'LWM-NL', hardness: 'standard' },
  { code: 'DE', slug: 'germany', name: 'Germany', nameAr: 'ألمانيا', flag: '🇩🇪', region: 'Europe', family: 'civil', familyLabel: 'Civil law · Europe (abstract general part)', badgeCode: 'LWM-DE', hardness: 'hard' }
] as const;

export const JURISDICTION_COUNT = JURISDICTIONS.length;

export function findJurisdiction(codeOrSlug: string): Jurisdiction | undefined {
  const k = codeOrSlug.toLowerCase();
  return JURISDICTIONS.find((j) => j.code.toLowerCase() === k || j.slug === k);
}

import { one, query } from '../../core/db.js';
import { badRequest, notFound } from '../../core/errors.js';
import { sha256, randomToken } from '../../core/crypto.js';

export async function overview() {
  const coverage = await query<any>(`SELECT c.jurisdiction, j.name, j.flag, c.entries, c.coverage_pct AS "coveragePct", c.pdf_linked_pct AS "pdfLinkedPct", c.note FROM coverage_stats c JOIN jurisdictions j ON j.code=c.jurisdiction ORDER BY j.ordinal`);
  const total = coverage.reduce((a, c) => a + Number(c.entries), 0);
  const eg = coverage.find((c) => c.jurisdiction === 'EG');
  const pdfLinked = coverage.length ? Math.round(coverage.reduce((a, c) => a + Number(c.pdfLinkedPct) * Number(c.entries), 0) / total * 10) / 10 : 0;
  const sample = await one<any>(`SELECT a.*, i.title_en AS instrument FROM law_articles a JOIN law_instruments i ON i.id=a.instrument_id WHERE a.id='eg-cc-1948-art147'`);
  return {
    stats: { totalEntries: total, jurisdictions: coverage.length, languages: 3, egyptianCorpus: eg ? Number(eg.entries) : 0, pdfLinkedPct: pdfLinked, ingest: 'Daily gazette ingest' }, coverage,
    sampleRecord: sample ? { id: sample.id, jurisdiction: sample.jurisdiction.toLowerCase(), instrument: sample.instrument, article: sample.article, text_en: sample.text_en, text_ar: sample.text_ar, in_force_from: sample.in_force_from, amended_by: sample.amended_by, provenance: sample.provenance, construed_by: sample.construed_by } : null,
    tiers: [
      { sku: 'db_research', name: 'Research', priceCents: 1200, features: ['Full bilingual corpus', 'Source-PDF links', 'Amendment history', 'Free with Lawmad Pro annual'], cta: 'Start searching' },
      { sku: 'db_professional', name: 'Professional', priceCents: 2900, features: ['Everything in Research', 'Citation export (OSCOLA, local)', 'Alerts on amendment', 'Cassation merit tracking'], cta: 'Go Professional' },
      { sku: 'db_api', name: 'API', priceCents: 29900, features: ['REST + Python client', '100k calls/month', 'Semantic search endpoint', 'Webhooks on amendment'], cta: 'Talk to us', dark: true },
      { sku: 'db_licence', name: 'Dataset licence', priceCents: null, features: ['Bulk export', 'Training-data licence', 'Provenance manifest', 'Negotiated, not self-serve'], cta: 'Talk to us' }
    ],
    honestLimits: [
      ['It does not contain unpublished judicial practice', 'In Egypt the Court of Cassation’s settled positions are authoritative in practice and are not all reported. We index the merits we have; we do not pretend that is all of them.'],
      ['Coverage outside Egypt is partial', 'Qatar and Oman sit at 44% and 38%. We publish the number on every jurisdiction rather than averaging it into a headline figure.'],
      ['It is not a substitute for the gazette', 'For filing, cite the source PDF, not us. Every record links to it for exactly this reason.'],
      ['The English is a rendering, not a legal text', 'Only the Arabic (or the local official language) has legal force. The English exists so you can find the provision, not so you can rely on it.']
    ]
  };
}
const AR_STOP = new Set(['هل', 'عن', 'في', 'من', 'على', 'أن', 'ان', 'إلى', 'الى', 'لا', 'ما', 'هذا', 'هذه', 'ذلك', 'مع', 'أو', 'او', 'و', 'ثم', 'كل', 'بين', 'حتى', 'إذا', 'اذا', 'يجوز', 'كان']);
const EN_STOP = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'is', 'are', 'can', 'may', 'and', 'or', 'for', 'on', 'by', 'with', 'be', 'it', 'that', 'this', 'what', 'does', 'do']);
/** Mirror of the SQL ar_norm(): diacritics, tatweel, alef/taa-marbuta/alef-maqsura, Arabic punctuation. */
export function arNorm(t: string): string {
  return t.replace(/[\u064B-\u0652\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[،؛؟«»]/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, ' ').toLowerCase();
}
/** OR-query terms: Arabic tokens expand to clitic variants (ال/لل/وال/بال) since 'simple' has no Arabic stemmer. */
export function queryTerms(q: string): { or: string; isAr: boolean } {
  const isAr = /[\u0600-\u06FF]/.test(q);
  const raw = (isAr ? arNorm(q) : q.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ')).split(/\s+/).filter((w) => w.length >= 2 && !(isAr ? AR_STOP : EN_STOP).has(w));
  const terms = new Set<string>();
  for (const w of raw) {
    terms.add(w);
    if (isAr) {
      const stem = w.replace(/^(وال|بال|كال|فال|لل|ال|و|ب|ل|ف|ك)(?=.{3,})/, '');
      if (stem !== w) terms.add(stem);
      for (const pre of ['ال', 'لل', 'وال', 'بال']) terms.add(pre + stem);
    }
  }
  const or = [...terms].map((t) => t.replace(/[^\p{L}\p{N}]/gu, '')).filter(Boolean).map((t) => `'${t}'`).join(' | ');
  return { or, isAr };
}
export async function search(p: { q: string; jurisdiction?: string; kind?: string; limit?: number; offset?: number }) {
  const q = p.q.trim();
  if (!q) return { results: [], total: 0, query: q };
  const limit = Math.min(50, p.limit ?? 20), offset = p.offset ?? 0;
  const { or, isAr } = queryTerms(q);
  const orQ = or || `'${q.replace(/'/g, '')}'`;
  // Bilingual: AND-match ranks highest, OR-match on expanded terms recalls morphological variants, substring/trigram catch the rest.
  const rows = await query<any>(`WITH qq AS (SELECT plainto_tsquery('english', $1) AS en_and, plainto_tsquery('simple', ar_norm($1)) AS ar_and, to_tsquery('english', $6) AS en_or, to_tsquery('simple', $6) AS ar_or)
    SELECT a.id, a.jurisdiction, j.name AS jurisdiction_name, j.flag, i.title_en AS instrument, i.title_ar AS instrument_ar, i.kind, a.article, a.text_en, a.text_ar, a.in_force_from, a.amended_by, a.construed_by, a.provenance,
      (2 * GREATEST(ts_rank(a.tsv_en, qq.en_and), ts_rank(a.tsv_ar, qq.ar_and)) + GREATEST(ts_rank(a.tsv_en, qq.en_or), ts_rank(a.tsv_ar, qq.ar_or)) + GREATEST(similarity(a.text_en, $1), similarity(a.text_ar, $1)) + CASE WHEN i.title_en ILIKE '%' || $1 || '%' OR i.title_ar ILIKE '%' || $1 || '%' OR a.text_en ILIKE '%' || $1 || '%' OR a.text_ar ILIKE '%' || $1 || '%' THEN 0.5 ELSE 0 END) AS rank
    FROM law_articles a JOIN law_instruments i ON i.id=a.instrument_id JOIN jurisdictions j ON j.code=a.jurisdiction, qq
    WHERE ($2::text IS NULL OR a.jurisdiction=upper($2)) AND ($3::text IS NULL OR i.kind=$3)
      AND (a.tsv_en @@ qq.en_or OR a.tsv_ar @@ qq.ar_or OR a.tsv_en @@ qq.en_and OR a.tsv_ar @@ qq.ar_and OR a.text_en % $1 OR a.text_ar % $1 OR a.text_en ILIKE '%' || $1 || '%' OR a.text_ar ILIKE '%' || $1 || '%' OR i.title_en ILIKE '%' || $1 || '%' OR i.title_ar ILIKE '%' || $1 || '%' OR a.article ILIKE $1)
    ORDER BY rank DESC LIMIT $4 OFFSET $5`, [q, p.jurisdiction ?? null, p.kind ?? null, limit, offset, orQ]);
  return { results: rows, total: rows.length, query: q, language: isAr ? 'ar' : 'en', engine: 'postgres-fts+trigram' };
}
export async function article(id: string) {
  const a = await one<any>(`SELECT a.*, i.title_en AS instrument, i.title_ar AS instrument_ar, i.kind, i.source_pdf, j.name AS jurisdiction_name, j.flag FROM law_articles a JOIN law_instruments i ON i.id=a.instrument_id JOIN jurisdictions j ON j.code=a.jurisdiction WHERE a.id=$1`, [id]);
  if (!a) throw notFound('Article');
  const construing = await query<any>(`SELECT a.id, i.title_en AS instrument, a.article, a.text_en, a.text_ar FROM law_articles a JOIN law_instruments i ON i.id=a.instrument_id WHERE a.instrument_id = ANY($1::text[])`, [a.construed_by ?? []]);
  return { ...a, construing };
}
export async function instruments(jurisdiction?: string) {
  return query<any>(`SELECT i.*, (SELECT COUNT(*)::int FROM law_articles a WHERE a.instrument_id=i.id) AS articles FROM law_instruments i WHERE ($1::text IS NULL OR i.jurisdiction=upper($1)) ORDER BY i.jurisdiction, i.year`, [jurisdiction ?? null]);
}
export async function createApiKey(userId: string, tier: 'research' | 'professional' | 'api') {
  const raw = `lwm_${tier === 'api' ? 'live' : 'test'}_${randomToken(24)}`;
  const r = await query(`INSERT INTO api_keys(user_id, key_hash, prefix, tier, monthly_limit) VALUES ($1,$2,$3,$4,$5) RETURNING id, prefix, tier, monthly_limit, created_at`, [userId, sha256(raw), raw.slice(0, 12), tier, tier === 'api' ? 100000 : 1000]);
  return { ...r[0], key: raw, note: 'Store this key now — it is not shown again.' };
}
export async function listApiKeys(userId: string) { return query(`SELECT id, prefix, tier, monthly_limit, created_at, revoked FROM api_keys WHERE user_id=$1 ORDER BY created_at DESC`, [userId]); }
export async function revokeApiKey(userId: string, id: string) { const r = await query(`UPDATE api_keys SET revoked=true WHERE id=$1 AND user_id=$2 RETURNING id`, [id, userId]); if (!r.length) throw notFound('API key'); return { revoked: true }; }
export async function authenticateApiKey(raw: string) {
  const k = await one<any>(`SELECT * FROM api_keys WHERE key_hash=$1 AND NOT revoked`, [sha256(raw)]);
  if (!k) throw badRequest('Invalid API key');
  return k;
}
export const snippets = (origin: string) => ({
  curl: `curl "${origin}/api/v1/law/search?q=contract%20law%20of%20the%20parties&jurisdiction=EG" \\\n  -H "X-Api-Key: lwm_live_..."`,
  python: `import requests\nr = requests.get("${origin}/api/v1/law/search", params={"q": "العقد شريعة المتعاقدين"}, headers={"X-Api-Key": "lwm_live_..."})\nfor a in r.json()["results"]:\n    print(a["id"], a["text_en"][:80])`,
  javascript: `const r = await fetch("${origin}/api/v1/law/search?q=moral+right", { headers: { "X-Api-Key": "lwm_live_..." } });\nconst { results } = await r.json();`,
  semantic: `POST ${origin}/api/v1/law/semantic   { "q": "can an author waive moral rights?", "jurisdiction": "EG" }\n→ retrieval-grounded passages with provenance (production: Elasticsearch + embeddings; this build: FTS + trigram)`
});

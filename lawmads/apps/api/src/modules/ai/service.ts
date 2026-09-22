import { one, query } from '../../core/db.js';
import { badRequest, notFound } from '../../core/errors.js';
import { sha256 } from '../../core/crypto.js';
import { getAiProvider, type GenerateInput, type Passage } from './provider.js';
import { search } from '../lawdb/service.js';

const TASK_OF: Record<string, GenerateInput['task']> = { 'lawmad-draft': 'draft', 'lawmad-precedent': 'precedent', 'lawmad-clause': 'clause', 'lawmad-translate': 'translate', 'lawmad-tutor': 'tutor', 'lawmad-analyst': 'analyst' };

export async function models() {
  const rows = await query<any>('SELECT slug, name, category, blurb, lives_in AS "livesIn", ordinal FROM ai_models ORDER BY ordinal');
  return { models: rows, provider: getAiProvider().name, supervision: ['Mandatory source citations', 'Confidence scoring', 'Audit logging of every generation', 'Human-in-the-loop checkpoints — models never file, sign or advise'] };
}
export async function generate(userId: string | null, input: { model: string; prompt: string; language?: 'en' | 'ar' | 'fr'; jurisdiction?: string; context?: Record<string, unknown> }) {
  const task = TASK_OF[input.model];
  if (!task) throw notFound('Model');
  if (!input.prompt.trim()) throw badRequest('Empty prompt');
  const lang = input.language ?? (/[؀-ۿ]/.test(input.prompt) ? 'ar' : 'en');
  // Grounding: retrieve the most relevant passages from the law database.
  const hits = task === 'tutor' ? { results: [] as any[] } : await search({ q: input.prompt.slice(0, 200), jurisdiction: input.jurisdiction, limit: 4 });
  const passages: Passage[] = hits.results.map((h: any) => ({ id: h.id, instrument: h.instrument, article: h.article, text_en: h.text_en, text_ar: h.text_ar, jurisdiction: h.jurisdiction }));
  const out = await getAiProvider().generate({ model: input.model, task, prompt: input.prompt, language: lang, passages, context: input.context });
  const supervision = { citationsRequired: task !== 'tutor', citationsResolved: out.citations.length, flagged: task !== 'tutor' && out.citations.length === 0, humanReview: 'required' };
  const row = await query<{ id: string; created_at: string }>(`INSERT INTO ai_generations(user_id, model_slug, provider, prompt_hash, prompt_chars, output, citations, confidence, supervision) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, created_at`,
    [userId, input.model, out.provider, sha256(input.prompt), input.prompt.length, out.text, JSON.stringify(out.citations), out.confidence, JSON.stringify(supervision)]);
  return { id: row[0]!.id, model: input.model, text: out.text, citations: out.citations, sources: passages.map((p) => ({ id: p.id, label: `${p.instrument}, ${p.article}` })), confidence: out.confidence, supervision, provider: out.provider, createdAt: row[0]!.created_at };
}
export async function history(userId: string) {
  return query<any>(`SELECT id, model_slug AS model, output, citations, confidence, supervision, created_at FROM ai_generations WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50`, [userId]);
}
export { one };

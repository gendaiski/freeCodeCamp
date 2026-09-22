import { one, query, withTx } from '../../core/db.js';
import { badRequest, forbidden, notFound } from '../../core/errors.js';
import { search } from '../lawdb/service.js';
import { generate as aiGenerate } from '../ai/service.js';

interface Clause { id: string; heading: string; text_en: string; text_ar: string }
async function owned(userId: string, id: string) {
  const d = await one<any>('SELECT * FROM documents WHERE id=$1', [id]);
  if (!d) throw notFound('Document');
  if (d.user_id !== userId) throw forbidden();
  return d;
}
export async function list(userId: string) { return query<any>('SELECT id, title, governing_law, language_mode, version, updated_at FROM documents WHERE user_id=$1 ORDER BY updated_at DESC', [userId]); }
export async function create(userId: string, input: { title: string; governingLaw?: string; languageMode?: 'en' | 'ar' | 'bi'; template?: string }) {
  const content: Clause[] = input.template === 'services' ? [
    { id: 'c1', heading: '1. Definitions', text_en: 'In this Agreement, "Deliverables" means the software, designs and documentation produced by the Supplier under a Statement of Work.', text_ar: 'في هذه الاتفاقية، تعني "المخرجات" البرمجيات والتصميمات والوثائق التي ينتجها المورد بموجب بيان العمل.' },
    { id: 'c2', heading: '2. Formation', text_en: 'This Agreement is concluded upon the exchange of two concordant expressions of the parties\' common intention.', text_ar: 'تنعقد هذه الاتفاقية بمجرد تبادل الطرفين التعبير عن إرادتين متطابقتين.' },
    { id: 'c3', heading: '3. Assignment of Intellectual Property', text_en: 'The Supplier hereby irrevocably assigns to the Client all right, title and interest in and to the Deliverables.', text_ar: 'يتنازل المورد بموجب هذا تنازلاً لا رجعة فيه للعميل عن جميع الحقوق والملكية والمصلحة في المخرجات.' }
  ] : [{ id: 'c1', heading: '1.', text_en: '', text_ar: '' }];
  const r = await query<any>('INSERT INTO documents(user_id, title, governing_law, language_mode, content) VALUES ($1,$2,$3,$4,$5) RETURNING *', [userId, input.title, input.governingLaw ?? 'EG', input.languageMode ?? 'en', JSON.stringify(content)]);
  await query('INSERT INTO document_versions(document_id, version, content) VALUES ($1,1,$2)', [r[0].id, JSON.stringify(content)]);
  return r[0];
}
export async function get(userId: string, id: string) {
  const d = await owned(userId, id);
  const authorities = await query<any>(`SELECT da.id, da.clause_id, da.article_id, da.supports, da.note, i.title_en AS instrument, a.article, a.text_en, a.text_ar FROM document_authorities da JOIN law_articles a ON a.id=da.article_id JOIN law_instruments i ON i.id=a.instrument_id WHERE da.document_id=$1 ORDER BY da.created_at`, [id]);
  const versions = await query<any>('SELECT version, created_at FROM document_versions WHERE document_id=$1 ORDER BY version DESC', [id]);
  const words = (d.content as Clause[]).reduce((n, c) => n + c.text_en.split(/\s+/).filter(Boolean).length, 0);
  return { ...d, authorities, versions, stats: { words, authorities: authorities.length, pages: Math.max(1, Math.ceil(words / 450)) } };
}
export async function save(userId: string, id: string, patch: { title?: string; content?: Clause[]; languageMode?: string; governingLaw?: string }) {
  const d = await owned(userId, id);
  return withTx(async (c) => {
    const version = patch.content ? d.version + 1 : d.version;
    const r = await c.query('UPDATE documents SET title=$2, content=$3, language_mode=$4, governing_law=$5, version=$6 WHERE id=$1 RETURNING id, version, updated_at', [id, patch.title ?? d.title, JSON.stringify(patch.content ?? d.content), patch.languageMode ?? d.language_mode, patch.governingLaw ?? d.governing_law, version]);
    if (patch.content) await c.query('INSERT INTO document_versions(document_id, version, content) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING', [id, version, JSON.stringify(patch.content)]);
    return r.rows[0];
  });
}
export async function revert(userId: string, id: string, version: number) {
  await owned(userId, id);
  const v = await one<any>('SELECT content FROM document_versions WHERE document_id=$1 AND version=$2', [id, version]);
  if (!v) throw notFound('Version');
  return save(userId, id, { content: v.content });
}
/** Insert an authority under a clause; the assistant says whether it supports the clause it sits under. */
export async function insertAuthority(userId: string, id: string, clauseId: string, articleId: string) {
  const d = await owned(userId, id);
  const clause = (d.content as Clause[]).find((c) => c.id === clauseId);
  if (!clause) throw badRequest('Unknown clause');
  const a = await one<any>('SELECT a.*, i.title_en AS instrument FROM law_articles a JOIN law_instruments i ON i.id=a.instrument_id WHERE a.id=$1', [articleId]);
  if (!a) throw notFound('Article');
  const gen = await aiGenerate(userId, { model: 'lawmad-clause', prompt: `Does [${a.id}] (${a.instrument}, ${a.article}: ${a.text_en}) support this clause?\n\n${clause.heading}\n${clause.text_en}`, jurisdiction: d.governing_law, context: { documentId: id, clauseId } });
  const supports = !/does not support|not support|contradict/i.test(gen.text);
  const r = await query<any>('INSERT INTO document_authorities(document_id, clause_id, article_id, supports, note) VALUES ($1,$2,$3,$4,$5) RETURNING id', [id, clauseId, articleId, supports, gen.text.slice(0, 600)]);
  return { id: r[0].id, clauseId, article: { id: a.id, instrument: a.instrument, article: a.article, text_en: a.text_en, text_ar: a.text_ar }, supports, note: gen.text, citation: `${a.instrument}, art. ${a.article}` };
}
export async function removeAuthority(userId: string, id: string, authorityId: string) { await owned(userId, id); await query('DELETE FROM document_authorities WHERE id=$1 AND document_id=$2', [authorityId, id]); return { ok: true }; }
export async function assist(userId: string, id: string, action: 'explain' | 'find-authority' | 'redline' | 'arabic' | 'risk-scan', clauseId?: string, prompt?: string) {
  const d = await owned(userId, id);
  const clause = clauseId ? (d.content as Clause[]).find((c) => c.id === clauseId) : null;
  const text = clause ? `${clause.heading}\n${clause.text_en}` : (d.content as Clause[]).map((c) => `${c.heading}\n${c.text_en}`).join('\n\n');
  if (action === 'find-authority') {
    const hits = await search({ q: (clause?.text_en ?? d.title).slice(0, 160), jurisdiction: d.governing_law, limit: 5 });
    return { action, suggestions: hits.results.map((r: any) => ({ id: r.id, instrument: r.instrument, article: r.article, text_en: r.text_en, text_ar: r.text_ar })) };
  }
  const model = action === 'arabic' ? 'lawmad-translate' : action === 'risk-scan' ? 'lawmad-clause' : 'lawmad-draft';
  const p = action === 'explain' ? `Explain this clause to a client in plain language:\n${text}` : action === 'redline' ? `Propose a tighter redline of this clause, marking deletions with ~~ and insertions with ++:\n${text}` : action === 'arabic' ? `Translate to Arabic with terminology alignment:\n${text}` : `Risk-scan this document; list each risk with severity:\n${text}`;
  const gen = await aiGenerate(userId, { model, prompt: prompt ? `${p}\n\nInstruction: ${prompt}` : p, language: action === 'arabic' ? 'ar' : 'en', jurisdiction: d.governing_law, context: { documentId: id, clauseId: clauseId ?? null } });
  return { action, model, text: gen.text, citations: gen.citations, confidence: gen.confidence, supervision: gen.supervision };
}
export async function exportDoc(userId: string, id: string, format: 'docx' | 'md') {
  const d = await owned(userId, id);
  const md = `# ${d.title}\n\n` + (d.content as Clause[]).map((c) => `## ${c.heading}\n\n${c.text_en}${d.language_mode !== 'en' && c.text_ar ? `\n\n${c.text_ar}` : ''}`).join('\n\n');
  return { format, filename: `${d.title.replace(/[^\w]+/g, '-')}.${format === 'docx' ? 'docx' : 'md'}`, content: md, note: format === 'docx' ? 'DOCX export is produced client-side from this Markdown (see web/src/lib/docx.ts); server-side conversion is a deployment option.' : null };
}
export const TEMPLATES = [{ slug: 'services', name: 'Services Agreement' }, { slug: 'blank', name: 'Blank document' }];
export const CLAUSE_BANK = [
  { id: 'cb-1', name: 'IP assignment (present + future)', text_en: 'The Supplier hereby assigns, and shall assign upon creation, to the Client all Intellectual Property Rights in the Deliverables, for good and valuable consideration, the receipt of which is acknowledged.', text_ar: 'يتنازل المورد بموجب هذا، ويلتزم بالتنازل عند الإنشاء، للعميل عن جميع حقوق الملكية الفكرية في المخرجات مقابل عوض معتبر يُقر باستلامه.' },
  { id: 'cb-2', name: 'Moral rights (Egypt — inalienable)', text_en: 'Nothing in this Agreement purports to transfer the Supplier\'s moral rights, which are inalienable under Law 82/2002.', text_ar: 'لا يُفهم من هذه الاتفاقية نقل الحقوق الأدبية للمورد، وهي حقوق غير قابلة للتنازل بموجب القانون 82 لسنة 2002.' },
  { id: 'cb-3', name: 'Confidentiality', text_en: 'Each party shall keep the other\'s Confidential Information confidential and use it only for the purposes of this Agreement.', text_ar: 'يلتزم كل طرف بالحفاظ على سرية المعلومات السرية للطرف الآخر وعدم استخدامها إلا لأغراض هذه الاتفاقية.' },
  { id: 'cb-4', name: 'Governing law & jurisdiction', text_en: 'This Agreement is governed by the laws of the Arab Republic of Egypt and the courts of Cairo have exclusive jurisdiction.', text_ar: 'تخضع هذه الاتفاقية لقوانين جمهورية مصر العربية، وتختص محاكم القاهرة اختصاصًا حصريًا بنظر أي نزاع.' }
];

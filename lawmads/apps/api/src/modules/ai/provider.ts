/**
 * AI provider abstraction. Grounding and citation discipline live HERE, not in the vendor:
 * every generation is given retrieved law-database passages and must cite them; the audit
 * row records prompt hash, citations and confidence.
 */
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../core/config.js';

export interface Passage { id: string; instrument: string; article: string; text_en: string; text_ar: string; jurisdiction: string }
export interface GenerateInput { model: string; task: 'draft' | 'precedent' | 'clause' | 'translate' | 'tutor' | 'analyst'; prompt: string; language: 'en' | 'ar' | 'fr'; passages: Passage[]; context?: Record<string, unknown> }
export interface GenerateOutput { text: string; citations: Array<{ id: string; label: string }>; confidence: number; provider: string; usage?: { input: number; output: number } }
export interface AiProvider { name: 'mock' | 'anthropic'; generate(i: GenerateInput): Promise<GenerateOutput> }

const SYSTEM: Record<GenerateInput['task'], string> = {
  draft: 'You are Lawmad-Draft, a legal drafting assistant inside the Lawyer Work Space. Draft precisely in the requested language. Cite authorities only from the provided passages, by id in square brackets like [eg-cc-1948-art147]. AI drafts, lawyers decide: never claim to give legal advice.',
  precedent: 'You are Lawmad-Precedent, the AI Wizard for judicial precedent. Answer only from the provided passages, citing each by id in square brackets. If the passages do not support an answer, say so plainly and cite nothing.',
  clause: 'You are Lawmad-Clause. Classify the clause, flag risks and ambiguity, and cite any provided passage that bears on it by id in square brackets.',
  translate: 'You are Lawmad-Translate. Produce a legal-grade translation with terminology alignment. Flag imperfect equivalents in a short note. Only the source-language text has legal force.',
  tutor: 'You are Lawmad-Tutor, the Legal Code Tutor inside the Lawmads IDE. Give hints, not full solutions, unless explicitly asked for the solution. Explain errors and connect the exercise to the legal rule it encodes.',
  analyst: 'You are Lawmad-Analyst. Structure findings as an intelligence brief with confidence language (high/moderate/low) and cite provided passages by id.'
};

export function extractCitations(text: string, passages: Passage[]): Array<{ id: string; label: string }> {
  const ids = new Set(Array.from(text.matchAll(/\[([a-z0-9-]+(?:-art\d+|-principle|-s\d+|-§ ?\d+)?)\]/gi)).map((m) => m[1]!.toLowerCase()));
  return passages.filter((p) => ids.has(p.id.toLowerCase())).map((p) => ({ id: p.id, label: `${p.instrument}, ${p.article}` }));
}

export class MockProvider implements AiProvider {
  name = 'mock' as const;
  async generate(i: GenerateInput): Promise<GenerateOutput> {
    const top = i.passages.slice(0, 2);
    const cite = top.map((p) => `[${p.id}]`).join(' ');
    const ar = i.language === 'ar';
    let text: string;
    switch (i.task) {
      case 'precedent': text = top.length ? (ar ? `${top[0]!.text_ar} ${cite}\n\nالمصادر المذكورة تدعم هذا الجواب؛ يلزم مراجعة بشرية قبل الاعتماد عليه.` : `${top[0]!.text_en} ${cite}\n\nThe cited passages support this answer; human review is required before reliance.`) : (ar ? 'لا تدعم المصادر المتاحة إجابة موثوقة.' : 'The available sources do not support a reliable answer.'); break;
      case 'draft': text = (ar ? `مسودة: ${i.prompt}\n\nيلتزم الطرفان بتنفيذ هذا البند وفقًا لمقتضيات حسن النية. ` : `Draft: ${i.prompt}\n\nThe parties shall perform this clause in accordance with the requirements of good faith. `) + cite; break;
      case 'clause': text = `Classification: ${/assign/i.test(i.prompt) ? 'IP assignment' : /confiden/i.test(i.prompt) ? 'Confidentiality' : 'General obligation'}.\nRisk: ${/irrevocabl/i.test(i.prompt) ? 'moderate — irrevocable assignment without carve-out for moral rights' : 'low'}.\nAmbiguity: ${/reasonable/i.test(i.prompt) ? 'the word "reasonable" is undefined' : 'none flagged'}. ${cite}`; break;
      case 'translate': text = (top[0] ? (ar ? top[0].text_en : top[0].text_ar) : (ar ? '[ترجمة تجريبية] ' + i.prompt : '[mock translation] ' + i.prompt)) + '\n\nNote: "consideration" has no exact civil-law equivalent — rendered as سبب/مقابل depending on context.'; break;
      case 'tutor': text = `Hint: re-read the checks list. ${/error|Error/.test(i.prompt) ? 'The error message tells you the line; the rule tells you the fix.' : 'Compare your output with the sample exactly — whitespace counts.'} The legal rule this exercise encodes is the test the code must pass.`; break;
      default: text = `Assessment (moderate confidence): ${i.prompt.slice(0, 120)}. Sources: ${cite || 'none provided'}.`;
    }
    return { text, citations: extractCitations(text, i.passages), confidence: top.length ? 0.94 : 0.4, provider: 'mock' };
  }
}

export class AnthropicProvider implements AiProvider {
  name = 'anthropic' as const;
  private client = new Anthropic({ apiKey: config.ai.anthropicApiKey || undefined });
  async generate(i: GenerateInput): Promise<GenerateOutput> {
    const passages = i.passages.map((p) => `- [${p.id}] ${p.instrument}, ${p.article}: ${i.language === 'ar' ? p.text_ar : p.text_en}`).join('\n');
    const response = await this.client.beta.messages.create({
      model: config.ai.anthropicModel,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: [{ type: 'text', text: `${SYSTEM[i.task]}\nRespond in ${i.language === 'ar' ? 'Arabic' : i.language === 'fr' ? 'French' : 'English'}.`, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Authorities available:\n${passages || '(none)'}\n\nContext: ${JSON.stringify(i.context ?? {})}\n\nRequest:\n${i.prompt}` }]
    } as any);
    if (response.stop_reason === 'refusal') {
      return { text: 'The model declined this request under its safety policy. A supervising lawyer should handle it directly.', citations: [], confidence: 0, provider: 'anthropic' };
    }
    const text = response.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text').map((b) => b.text).join('\n');
    const citations = extractCitations(text, i.passages);
    return { text, citations, confidence: citations.length ? 0.9 : i.passages.length ? 0.6 : 0.5, provider: 'anthropic', usage: { input: response.usage.input_tokens, output: response.usage.output_tokens } };
  }
}

let provider: AiProvider | null = null;
export function getAiProvider(): AiProvider {
  if (!provider) provider = config.ai.provider === 'anthropic' && config.ai.anthropicApiKey ? new AnthropicProvider() : new MockProvider();
  return provider;
}

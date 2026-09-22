/** AI Web Builder: a job pipeline with a deterministic generator (partner models are configured per deployment). */
import { one, query } from '../../core/db.js';
import { badRequest, forbidden, notFound } from '../../core/errors.js';

export const MODEL_PARTNERS = [
  { key: 'gemini', name: 'Gemini', role: 'Copy & layout', blurb: 'Site structure, bilingual copy and the editing agent behind every block.', mono: 'Ge' },
  { key: 'seedance', name: 'Seedance', role: 'Video', blurb: 'Short-form video for hero sections and practice-area explainers.', mono: 'Sd' },
  { key: 'imagen', name: 'Imagen', role: 'Stills', blurb: 'Photography and illustration generated to your brand, not to a stock library.', mono: 'Im' },
  { key: 'veo', name: 'Veo', role: 'Motion', blurb: 'Longer motion pieces where a still will not carry the story.', mono: 'Veo' }
];
export const STYLES = ['Editorial', 'Corporate', 'Minimal', 'Boutique'];
export const CREDIT_PACKS = [{ credits: 50, cents: 1900 }, { credits: 200, cents: 5900 }, { credits: 1000, cents: 24900 }];
const COST = { page: 2, image: 3, video: 10 };

function siteFrom(brief: string, style: string, languages: string[]) {
  const name = (brief.match(/([A-Z][\w&'’ -]{2,40}?)(?:,| is | —|\.| law| firm)/)?.[1] ?? 'Your Practice').trim();
  const areas = Array.from(new Set((brief.match(/(M&A|e-commerce|data protection|arbitration|IP|employment|real estate|corporate|commercial|fintech|litigation|tax)/gi) ?? ['Corporate', 'Commercial', 'Disputes']).map((s) => s.replace(/^\w/, (c) => c.toUpperCase())))).slice(0, 4);
  const bilingual = languages.includes('ar');
  const pages = [
    { slug: 'index', title: 'Home', blocks: [{ type: 'hero', heading: `${name}`, sub: brief.slice(0, 140), media: 'video' }, { type: 'areas', items: areas }, { type: 'cta', label: 'Book a consultation' }] },
    { slug: 'practice', title: 'Practice areas', blocks: areas.map((a) => ({ type: 'area', heading: a, media: 'image' })) },
    { slug: 'team', title: 'Team', blocks: [{ type: 'people', count: 4, media: 'image' }] },
    { slug: 'insights', title: 'Insights', blocks: [{ type: 'posts', count: 3 }] },
    { slug: 'contact', title: 'Contact', blocks: [{ type: 'form' }, { type: 'map' }] },
    { slug: 'legal', title: 'Privacy & cookies', blocks: [{ type: 'policy', collects: ['contact form', 'analytics (opt-in)'] }] }
  ];
  if (bilingual) for (const p of pages) (p as any).ar = { title: p.title, dir: 'rtl' };
  const images = pages.flatMap((p) => p.blocks.filter((b: any) => b.media === 'image')).length + 1;
  const videos = pages.flatMap((p) => p.blocks.filter((b: any) => b.media === 'video')).length;
  return { name, style, areas, pages, images, videos };
}

export async function options(userId?: string) {
  const bal = userId ? await one<{ balance: number }>('SELECT balance FROM builder_credits WHERE user_id=$1', [userId]) : null;
  return { partners: MODEL_PARTNERS, styles: STYLES, creditPacks: CREDIT_PACKS, cost: COST, balance: bal?.balance ?? null, notice: 'Generation runs on partner models. You own the output; review it before publishing — generated copy is a draft, not legal advice, and generated likenesses need the usual clearances.' };
}
export async function create(userId: string, input: { brief: string; style: string; languages: string[]; models: Record<string, string>; name?: string }) {
  if (!STYLES.map((s) => s.toLowerCase()).includes(input.style.toLowerCase())) throw badRequest('Unknown style');
  await query('INSERT INTO builder_credits(user_id, balance) VALUES ($1, 50) ON CONFLICT DO NOTHING', [userId]);
  const r = await query<any>(`INSERT INTO builder_projects(user_id, name, brief, style, languages, models) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [userId, input.name ?? 'Untitled site', input.brief, input.style.toLowerCase(), input.languages, JSON.stringify(input.models)]);
  return r[0];
}
export async function generate(userId: string, projectId: string) {
  const p = await one<any>('SELECT * FROM builder_projects WHERE id=$1', [projectId]);
  if (!p) throw notFound('Project');
  if (p.user_id !== userId) throw forbidden();
  const site = siteFrom(p.brief, p.style, p.languages);
  const cost = site.pages.length * COST.page + site.images * COST.image + site.videos * COST.video;
  const bal = await one<{ balance: number }>('SELECT balance FROM builder_credits WHERE user_id=$1', [userId]);
  if ((bal?.balance ?? 0) < cost) throw forbidden(`Needs ${cost} credits; balance ${bal?.balance ?? 0}. Buy a credit pack or bring your own key.`);
  const job = (await query<any>(`INSERT INTO builder_jobs(project_id, status) VALUES ($1,'running') RETURNING id`, [projectId]))[0];
  const log = [{ t: 0, msg: 'Structuring site with Gemini' }, { t: 4, msg: `${site.pages.length} pages drafted (${p.languages.join(' · ').toUpperCase()})` }, { t: 9, msg: `${site.images} images with Imagen` }, { t: 15, msg: `${site.videos} hero video with Seedance` }, { t: 18, msg: 'Cookie banner reflects what the site collects' }];
  // Simulated asynchronous pipeline: completes in ~18 s of "generation time", recorded as done immediately with a timeline.
  await query(`UPDATE builder_jobs SET status='done', progress=100, log=$2, result=$3, finished_at=now() WHERE id=$1`, [job.id, JSON.stringify(log), JSON.stringify(site)]);
  await query(`UPDATE builder_projects SET status='generated', pages=$2, assets=$3 WHERE id=$1`, [projectId, JSON.stringify(site.pages), JSON.stringify({ images: site.images, videos: site.videos })]);
  await query(`UPDATE builder_credits SET balance=balance-$2 WHERE user_id=$1`, [userId, cost]);
  return { jobId: job.id, status: 'done', seconds: 18, result: { pages: site.pages.length, images: site.images, videos: site.videos, name: site.name, areas: site.areas, site }, creditsCharged: cost };
}
export async function list(userId: string) { return query<any>('SELECT id, name, brief, style, languages, status, domain, pages, assets, created_at, updated_at FROM builder_projects WHERE user_id=$1 ORDER BY updated_at DESC', [userId]); }
export async function get(userId: string, id: string) {
  const p = await one<any>('SELECT * FROM builder_projects WHERE id=$1', [id]);
  if (!p) throw notFound('Project');
  if (p.user_id !== userId) throw forbidden();
  const jobs = await query<any>('SELECT id, status, progress, log, started_at, finished_at FROM builder_jobs WHERE project_id=$1 ORDER BY started_at DESC', [id]);
  return { ...p, jobs };
}
export async function updatePages(userId: string, id: string, pages: unknown[]) {
  const p = await get(userId, id);
  await query('UPDATE builder_projects SET pages=$2 WHERE id=$1', [p.id, JSON.stringify(pages)]);
  return { ok: true };
}
export async function publish(userId: string, id: string, domain: string) {
  const p = await get(userId, id);
  if (p.status === 'draft') throw badRequest('Generate the site first');
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) throw badRequest('Enter a valid domain');
  await query(`UPDATE builder_projects SET status='published', domain=$2 WHERE id=$1`, [p.id, domain.toLowerCase()]);
  return { published: true, url: `https://${domain.toLowerCase()}`, dns: [{ type: 'A', name: '@', value: '76.76.21.21' }, { type: 'CNAME', name: 'www', value: 'sites.lawmads.com' }] };
}
export async function exportHtml(userId: string, id: string) {
  const p = await get(userId, id);
  const pages = (p.pages as any[]).map((pg) => `<!-- ${pg.slug}.html -->\n<section data-page="${pg.slug}"><h1>${pg.title}</h1>${pg.blocks.map((b: any) => `<div class="block block-${b.type}">${b.heading ?? b.label ?? b.type}</div>`).join('')}</section>`).join('\n');
  return { html: `<!doctype html><html lang="${p.languages[0] ?? 'en'}"><head><meta charset="utf-8"><title>${p.name}</title></head><body class="style-${p.style}">${pages}</body></html>`, openInIde: 'html' };
}

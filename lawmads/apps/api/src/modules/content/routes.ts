import { Router } from 'express';
import { z } from 'zod';
import { h, parseBody, param } from '../../core/http.js';
import { one, query } from '../../core/db.js';
import { notFound } from '../../core/errors.js';
import { rateLimit } from '../../core/rateLimit.js';

export const contentRouter = Router();
contentRouter.get('/blog', h(async (req, res) => {
  const cat = typeof req.query.category === 'string' ? req.query.category : null;
  const posts = await query(`SELECT slug, title, category, excerpt, author, read_minutes AS "readMinutes", published_at AS "publishedAt" FROM blog_posts WHERE ($1::text IS NULL OR category=$1) ORDER BY published_at DESC`, [cat]);
  const stats = await one<any>(`SELECT COUNT(*)::int AS posts, COUNT(DISTINCT category)::int AS categories, ROUND(AVG(read_minutes))::int AS "avgRead" FROM blog_posts`);
  res.json({ posts, stats: { ...stats, cadence: 'Weekly' }, categories: [['trends', 'Legal Tech Trends'], ['deep-dive', 'Deep Dive'], ['research', 'Research'], ['platform', 'Platform']] });
}));
contentRouter.get('/blog/:slug', h(async (req, res) => {
  const p = await one<any>(`SELECT slug, title, category, excerpt, body_md AS "bodyMd", author, read_minutes AS "readMinutes", published_at AS "publishedAt" FROM blog_posts WHERE slug=$1`, [param(req, 'slug')]);
  if (!p) throw notFound('Post');
  const related = await query(`SELECT slug, title, category, read_minutes AS "readMinutes" FROM blog_posts WHERE slug<>$1 ORDER BY (category=$2) DESC, published_at DESC LIMIT 3`, [p.slug, p.category]);
  res.json({ ...p, related });
}));
contentRouter.get('/podcast', h(async (req, res) => {
  const series = typeof req.query.series === 'string' ? req.query.series : null;
  const episodes = await query(`SELECT number, slug, title, guest, guest_role AS "guestRole", series, duration_sec AS "durationSec", summary, published_at AS "publishedAt" FROM podcast_episodes WHERE ($1::text IS NULL OR series=$1) ORDER BY number DESC`, [series]);
  const stats = await one<any>(`SELECT COUNT(*)::int AS episodes, ROUND(AVG(duration_sec)/60)::int AS "avgMinutes" FROM podcast_episodes`);
  res.json({ episodes, latest: episodes[0] ?? null, stats: { ...stats, listeners: 31000, jurisdictions: 9, cadence: 'Every Thursday' }, series: ['practice', 'build', 'regulate', 'career'],
    hosts: [{ initials: 'AE', name: 'Ahmed El Gendy', role: 'Founder, Law Tech Labs', blurb: 'Legal engineer across DIFC and ADGM. Asks the jurisdiction question, every time, until the guest admits where it breaks.' }, { initials: 'TA', name: 'Tarek Abdel-Aziz', role: 'Head of Data', blurb: 'Built the 47,000-entry bilingual law database. The one who asks to see the eval, and is never satisfied with the answer.' }, { initials: 'KB', name: 'Dr. Klaus Bauer', role: 'Jurisdiction Lead · Germany', blurb: 'Joins for the Regulate episodes. Has ended more than one guest’s confident claim with a single question about § 307 BGB.' }],
    segments: [['What you got wrong', 'Every guest, every episode. Nobody gets to skip it.'], ['Show me the failure', 'The eval that failed, the clause the model missed, the deploy that got rolled back.'], ['The jurisdiction question', 'Where does this break when you cross a border? It always breaks somewhere.'], ['One thing to read', 'Not a book recommendation. A statute, a case, or a repo.']],
    subscribe: [['Spotify', '12.4k followers'], ['Apple Podcasts', '4.8 ★ · 210 ratings'], ['YouTube', 'Video + transcript'], ['RSS feed', 'Any podcast app'], ['By email', 'With The Delta Brief']] });
}));
contentRouter.get('/podcast/:slug', h(async (req, res) => {
  const e = await one<any>(`SELECT number, slug, title, guest, guest_role AS "guestRole", series, duration_sec AS "durationSec", summary, transcript_md AS "transcriptMd", audio_url AS "audioUrl", published_at AS "publishedAt" FROM podcast_episodes WHERE slug=$1 OR number::text=$1`, [param(req, 'slug')]);
  if (!e) throw notFound('Episode');
  res.json(e);
}));
contentRouter.post('/newsletter', rateLimit({ key: 'newsletter', limit: 5, windowSec: 600 }), h(async (req, res) => {
  const { email } = parseBody(z.object({ email: z.string().email() }), req);
  await query('INSERT INTO newsletter_subscribers(email) VALUES ($1) ON CONFLICT DO NOTHING', [email]);
  res.status(201).json({ subscribed: true, name: 'The Delta Brief' });
}));
contentRouter.get('/press', h(async (_req, res) => { res.json({ featuredIn: ['Forbes', 'TechCrunch', 'Financial Times', 'Bloomberg', 'Wired'], partners: [['DataCamp', 'Learning Partner'], ['McAfee Institute', 'Accreditation'], ['Figma', 'Technology Partner'], ['Python Institute', 'Certification Body'], ['JavaScript Institute', 'Cert Body'], ['Blockchain Council', 'Accreditation'], ['Anthropic Claude', 'AI Partner'], ['n8n', 'Agentic Partner'], ['Eclipse Theia', 'IDE Engine'], ['Tutor LMS', 'Platform']] }); }));

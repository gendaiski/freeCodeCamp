import { one, query, withTx } from '../../core/db.js';
import { badRequest, notFound, conflict } from '../../core/errors.js';
import { touchActivity } from '../learning/credits.js';

export async function overview(userId?: string) {
  const chapters = await query<any>(`SELECT c.slug, c.name, c.icon, c.blurb, c.base_members + (SELECT COUNT(*)::int FROM chapter_members m WHERE m.chapter_slug=c.slug) AS members, ($1::uuid IS NOT NULL AND EXISTS (SELECT 1 FROM chapter_members m WHERE m.chapter_slug=c.slug AND m.user_id=$1)) AS joined FROM chapters c ORDER BY c.ordinal`, [userId ?? null]);
  const posts = await feed(userId);
  const sessions = await query<any>(`SELECT id, kind, title, starts_at, platform, program_code FROM community_sessions WHERE starts_at > now() ORDER BY starts_at LIMIT 6`);
  const contest = await query<any>(`SELECT id, designer, title, month, votes, winner, ($1::uuid IS NOT NULL AND EXISTS (SELECT 1 FROM design_votes v WHERE v.submission_id=design_submissions.id AND v.user_id=$1)) AS voted FROM design_submissions ORDER BY votes DESC`, [userId ?? null]);
  const baseline = await one<{ value: number }>(`SELECT value FROM feature_flags WHERE key='community.membersBaseline'`);
  const members = Number(baseline?.value ?? 0) + Number((await one<{ n: number }>('SELECT COUNT(DISTINCT user_id)::int AS n FROM chapter_members'))?.n ?? 0);
  return { stats: { members, cityChapters: 14, eventsThisYear: 127, employmentRate: 96 }, chapters, posts, sessions, contest: { month: 'July', submissions: contest, totalVotes: contest.reduce((a, s) => a + Number(s.votes), 0) } };
}
export async function feed(userId?: string, chapter?: string) {
  return query<any>(`SELECT p.id, p.chapter_slug, c.name AS chapter_name, p.author_name, p.title, p.body, p.link_label, p.link_kind, p.link_ref, p.created_at,
      (SELECT COUNT(*)::int FROM post_votes v WHERE v.post_id=p.id) + COALESCE((SELECT (value)::int FROM feature_flags WHERE key='post.baseVotes:' || p.id::text), 0) AS upvotes,
      (SELECT COUNT(*)::int FROM comments cm WHERE cm.post_id=p.id) AS comments,
      ($1::uuid IS NOT NULL AND EXISTS (SELECT 1 FROM post_votes v WHERE v.post_id=p.id AND v.user_id=$1)) AS voted
    FROM posts p JOIN chapters c ON c.slug=p.chapter_slug WHERE ($2::text IS NULL OR p.chapter_slug=$2) ORDER BY p.created_at DESC LIMIT 50`, [userId ?? null, chapter ?? null]);
}
export async function post(id: string, userId?: string) {
  const p = (await feed(userId)).find((x) => x.id === id) ?? null;
  if (!p) throw notFound('Post');
  const comments = await query<any>('SELECT id, author_name, body, created_at FROM comments WHERE post_id=$1 ORDER BY created_at', [id]);
  return { ...p, thread: comments };
}
export async function join(userId: string, chapter: string) {
  if (!(await one('SELECT 1 FROM chapters WHERE slug=$1', [chapter]))) throw notFound('Chapter');
  await query('INSERT INTO chapter_members(chapter_slug, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [chapter, userId]);
  await touchActivity(userId);
  return { joined: true };
}
export async function createPost(userId: string, authorName: string, input: { chapter: string; title: string; body: string; linkLabel?: string; linkKind?: string; linkRef?: string }) {
  if (!(await one('SELECT 1 FROM chapters WHERE slug=$1', [input.chapter]))) throw notFound('Chapter');
  const r = await query('INSERT INTO posts(chapter_slug, author_id, author_name, title, body, link_label, link_kind, link_ref) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id', [input.chapter, userId, authorName, input.title, input.body, input.linkLabel ?? null, input.linkKind ?? null, input.linkRef ?? null]);
  await touchActivity(userId);
  return { id: r[0]!.id };
}
export async function vote(userId: string, postId: string) {
  if (!(await one('SELECT 1 FROM posts WHERE id=$1', [postId]))) throw notFound('Post');
  const existing = await one('SELECT 1 FROM post_votes WHERE post_id=$1 AND user_id=$2', [postId, userId]);
  if (existing) { await query('DELETE FROM post_votes WHERE post_id=$1 AND user_id=$2', [postId, userId]); return { voted: false }; }
  await query('INSERT INTO post_votes(post_id, user_id) VALUES ($1,$2)', [postId, userId]);
  return { voted: true };
}
export async function comment(userId: string, authorName: string, postId: string, body: string) {
  if (!body.trim()) throw badRequest('Empty comment');
  if (!(await one('SELECT 1 FROM posts WHERE id=$1', [postId]))) throw notFound('Post');
  const r = await query('INSERT INTO comments(post_id, author_id, author_name, body) VALUES ($1,$2,$3,$4) RETURNING id, created_at', [postId, userId, authorName, body.trim()]);
  return r[0];
}
export async function voteDesign(userId: string, submissionId: string) {
  return withTx(async (c) => {
    const s = await c.query('SELECT id FROM design_submissions WHERE id=$1', [submissionId]);
    if (!s.rows[0]) throw notFound('Submission');
    const dup = await c.query('SELECT 1 FROM design_votes WHERE submission_id=$1 AND user_id=$2', [submissionId, userId]);
    if (dup.rows[0]) throw conflict('Already voted');
    await c.query('INSERT INTO design_votes(submission_id, user_id) VALUES ($1,$2)', [submissionId, userId]);
    await c.query('UPDATE design_submissions SET votes=votes+1 WHERE id=$1', [submissionId]);
    return { voted: true };
  });
}
export async function submitDesign(userId: string, designer: string, title: string, imageUrl?: string) {
  const month = new Date().toISOString().slice(0, 7);
  const r = await query('INSERT INTO design_submissions(user_id, designer, title, month, image_url) VALUES ($1,$2,$3,$4,$5) RETURNING id', [userId, designer, title, month, imageUrl ?? null]);
  return { id: r[0]!.id };
}
// --- shop ---
export async function products() {
  return query<any>(`SELECT p.slug, p.name, p.tag, p.blurb, p.price_cents AS "priceCents", p.sku, p.icon, p.variants, d.designer FROM products p LEFT JOIN design_submissions d ON d.winner AND p.slug='community-tee-delta' ORDER BY p.ordinal`);
}

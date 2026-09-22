import { one, query, withTx } from '../../core/db.js';
import { signCredential, verifyCredential } from '../../core/crypto.js';
import { badRequest, conflict, forbidden, notFound } from '../../core/errors.js';
import { audit } from '../../core/audit.js';
import { awardCredits, touchActivity } from '../learning/credits.js';
import { computeLadder, CREDIT_RULES, JURISDICTIONS, findJurisdiction } from '@lawmads/shared';
import QRCode from 'qrcode';
import { config } from '../../core/config.js';

async function nextVerificationId(q = { query }): Promise<string> {
  const r = await q.query<{ n: number }>(`SELECT nextval('verification_seq')::int AS n`);
  return `LWM-${new Date().getUTCFullYear()}-${String(r[0]!.n).padStart(4, '0')}`;
}

/** A certificate issues automatically the moment both credit halves are complete and the capstone is done. */
export async function issueCertificateIfEarned(userId: string, programCode: string): Promise<{ issued: boolean; verificationId?: string }> {
  const p = await one<any>('SELECT code, name, kind, tech_credits, law_credits FROM programs WHERE code=$1', [programCode]);
  if (!p) return { issued: false };
  if (await one('SELECT 1 FROM certificates WHERE user_id=$1 AND program_code=$2', [userId, programCode])) return { issued: false };
  const credits = await query<{ kind: string; total: number }>(`SELECT kind, COALESCE(SUM(amount),0)::int AS total FROM credit_ledger WHERE user_id=$1 AND program_code=$2 GROUP BY kind`, [userId, programCode]);
  const tech = credits.find((c) => c.kind === 'tech')?.total ?? 0, law = credits.find((c) => c.kind === 'law')?.total ?? 0;
  const cap = await one<{ score: number | null }>(`SELECT ip.score FROM item_progress ip JOIN curriculum_items ci ON ci.id=ip.item_id JOIN program_tracks pt ON pt.id=ci.program_track_id WHERE ip.user_id=$1 AND pt.program_code=$2 AND ci.kind='capstone' AND ip.status='done'`, [userId, programCode]);
  if (tech < p.tech_credits || law < p.law_credits || !cap) return { issued: false };
  return issueCertificate(userId, programCode, cap.score ?? null, 'system');
}

export async function issueCertificate(userId: string, programCode: string, capstoneScore: number | null, actor: string) {
  const u = await one<any>('SELECT display_name FROM users WHERE id=$1', [userId]);
  const p = await one<any>('SELECT code, name, kind, tech_credits, law_credits FROM programs WHERE code=$1', [programCode]);
  if (!u || !p) throw notFound('User or program');
  if (await one('SELECT 1 FROM certificates WHERE user_id=$1 AND program_code=$2', [userId, programCode])) throw conflict('Certificate already issued');
  const r = await withTx(async (c) => {
    const vid = await nextVerificationId({ query: (t: string) => c.query(t).then((x) => x.rows) } as any);
    const payload = { type: 'certificate', verificationId: vid, holder: u.display_name, program: p.code, programName: p.name, capstoneScore, issuedAt: new Date().toISOString(), techCredits: p.tech_credits, lawCredits: p.law_credits, awardedBy: 'The Legal Technology Academy' };
    const row = await c.query(`INSERT INTO certificates(user_id, program_code, verification_id, kind, capstone_score, payload, signature) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [userId, p.code, vid, p.kind === 'course_certificate' ? 'certificate' : p.kind, capstoneScore, JSON.stringify(payload), signCredential(payload)]);
    await c.query(`UPDATE enrollments SET status='completed', completed_at=now() WHERE user_id=$1 AND program_code=$2`, [userId, p.code]);
    return row.rows[0];
  });
  await audit(actor, 'certificate.issue', r.verification_id, { userId, programCode });
  return { issued: true, verificationId: r.verification_id as string };
}

/** Public verification: never leaks more than the signed statement. */
export async function verify(verificationId: string, ip: string | null, ua: string | null) {
  const id = verificationId.toUpperCase();
  const cert = await one<any>(`SELECT c.*, p.name AS program_name FROM certificates c JOIN programs p ON p.code=c.program_code WHERE c.verification_id=$1`, [id]);
  const badge = cert ? null : await one<any>(`SELECT b.*, j.name AS jurisdiction_name, j.flag, u.display_name FROM badges_earned b JOIN jurisdictions j ON j.code=b.jurisdiction JOIN users u ON u.id=b.user_id WHERE b.verification_id=$1`, [id]);
  await query('INSERT INTO verification_log(verification_id, ip, user_agent) VALUES ($1,$2,$3)', [id, ip, ua?.slice(0, 300) ?? null]);
  if (!cert && !badge) throw notFound('Credential');
  if (cert) {
    const valid = verifyCredential(cert.payload, cert.signature);
    const holderBadges = await query<any>(`SELECT b.jurisdiction, j.name, b.score_pct FROM badges_earned b JOIN jurisdictions j ON j.code=b.jurisdiction WHERE b.user_id=$1 AND NOT b.revoked ORDER BY b.earned_at`, [cert.user_id]);
    const ladder = computeLadder({ jurisdictions: holderBadges.map((b) => b.jurisdiction), hasCraft: true, hasCapstone: (cert.capstone_score ?? 0) >= 70 });
    return { kind: 'certificate', verificationId: id, holder: cert.payload.holder, program: cert.program_code, programName: cert.program_name, capstoneScore: cert.capstone_score, issuedAt: cert.issued_at, signatureValid: valid, revoked: cert.revoked, revokedReason: cert.revoked_reason, examinedBy: 'The Legal Technology Academy', ladder: ladder.label, badges: holderBadges, statement: cert.payload, qr: await QRCode.toDataURL(`${config.publicWebOrigin}/verify/${id}`, { margin: 1, width: 180 }) };
  }
  const payload = { type: 'badge', verificationId: id, holder: badge.display_name, jurisdiction: badge.jurisdiction, score: Number(badge.score_pct), examinedBy: 'Ahmed El Gendy', earnedAt: new Date(badge.earned_at).toISOString() };
  const valid = verifyCredential(payload, badge.signature) || verifyCredential({ ...payload, earnedAt: badge.earned_at }, badge.signature);
  return { kind: 'badge', verificationId: id, holder: badge.display_name, jurisdiction: badge.jurisdiction, jurisdictionName: badge.jurisdiction_name, flag: badge.flag, score: Number(badge.score_pct), earnedAt: badge.earned_at, signatureValid: valid, revoked: badge.revoked, examinedBy: 'Ahmed El Gendy', notice: 'This badge certifies competence in the legal system named. It does not entitle the holder to practise, appear, or hold out as admitted anywhere.', qr: await QRCode.toDataURL(`${config.publicWebOrigin}/verify/${id}`, { margin: 1, width: 180 }) };
}

export async function certificatePdfData(userId: string, certId: string) {
  const c = await one<any>(`SELECT c.*, p.name AS program_name, u.display_name FROM certificates c JOIN programs p ON p.code=c.program_code JOIN users u ON u.id=c.user_id WHERE c.id=$1`, [certId]);
  if (!c) throw notFound('Certificate');
  if (c.user_id !== userId) throw forbidden();
  return { ...c, qr: await QRCode.toDataURL(`${config.publicWebOrigin}/verify/${c.verification_id}`, { margin: 1, width: 240 }) };
}

// --- Badges ----------------------------------------------------------------
export async function jurisdictions() {
  const rows = await query<any>(`SELECT j.*, c.entries, c.coverage_pct, (SELECT COUNT(*)::int FROM badges_earned b WHERE b.jurisdiction=j.code AND NOT b.revoked) AS holders FROM jurisdictions j LEFT JOIN coverage_stats c ON c.jurisdiction=j.code ORDER BY j.ordinal`);
  return rows.map((j) => ({ code: j.code, slug: j.slug, name: j.name, nameAr: j.name_ar, flag: j.flag, region: j.region, family: j.family, familyLabel: j.family_label, badgeCode: j.badge_code, hardness: j.hardness, passRatePct: j.pass_rate_pct, holders: j.holders, lawEntries: j.entries, coveragePct: j.coverage_pct }));
}
export async function jurisdiction(codeOrSlug: string, userId?: string) {
  const j = await one<any>(`SELECT * FROM jurisdictions WHERE upper(code)=upper($1) OR slug=lower($1)`, [codeOrSlug]);
  if (!j) throw notFound('Jurisdiction');
  const sittings = await query<any>(`SELECT id, starts_at, capacity, (SELECT COUNT(*)::int FROM exam_bookings b WHERE b.sitting_id=exam_sittings.id AND b.status='booked') AS booked FROM exam_sittings WHERE jurisdiction=$1 AND starts_at > now() ORDER BY starts_at`, [j.code]);
  const mine = userId ? await one<any>(`SELECT score_pct, earned_at, verification_id FROM badges_earned WHERE user_id=$1 AND jurisdiction=$2`, [userId, j.code]) : null;
  const booking = userId ? await one<any>(`SELECT b.id, b.sitting_id, b.resit_available, s.starts_at FROM exam_bookings b LEFT JOIN exam_sittings s ON s.id=b.sitting_id WHERE b.user_id=$1 AND b.jurisdiction=$2 AND b.status='booked' ORDER BY b.created_at DESC LIMIT 1`, [userId, j.code]) : null;
  const holders = await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM badges_earned WHERE jurisdiction=$1 AND NOT revoked`, [j.code]);
  const pairWith = (j.syllabus?.pairWith ?? []).map((c: string) => findJurisdiction(c)).filter(Boolean);
  return { code: j.code, slug: j.slug, name: j.name, nameAr: j.name_ar, flag: j.flag, region: j.region, family: j.family, familyLabel: j.family_label, badgeCode: j.badge_code, hardness: j.hardness, passRatePct: j.pass_rate_pct, syllabus: j.syllabus, pairWith, sittings, holders: holders?.n ?? 0, mine, booking, format: { questions: '55–70', minutes: '80–100', passMark: 70, proctored: true, freeResit: 1, validity: 'Forever' } };
}
export async function book(userId: string, code: string, sittingId: string | null) {
  const j = await one<any>('SELECT code FROM jurisdictions WHERE upper(code)=upper($1)', [code]);
  if (!j) throw notFound('Jurisdiction');
  if (await one('SELECT 1 FROM badges_earned WHERE user_id=$1 AND jurisdiction=$2', [userId, j.code])) throw conflict('Badge already earned');
  const existing = await one<any>(`SELECT id FROM exam_bookings WHERE user_id=$1 AND jurisdiction=$2 AND status='booked'`, [userId, j.code]);
  if (existing) throw conflict('You already have a booking for this badge');
  // Entitlement: a paid badge exam/bundle order, or an active bundle purchase.
  const paid = await one(`SELECT o.id FROM orders o JOIN order_items i ON i.order_id=o.id WHERE o.user_id=$1 AND o.status='paid' AND ((i.sku='badge_exam' AND i.ref=$2) OR i.sku='badge_bundle')`, [userId, j.code]);
  if (!paid) throw forbidden('Book through checkout: single badge $79 or the all-nine bundle');
  if (sittingId) {
    const s = await one<any>('SELECT id, capacity, (SELECT COUNT(*)::int FROM exam_bookings b WHERE b.sitting_id=$1 AND b.status=\'booked\') AS booked FROM exam_sittings WHERE id=$1 AND jurisdiction=$2 AND starts_at > now()', [sittingId, j.code]);
    if (!s) throw notFound('Sitting');
    if (s.booked >= s.capacity) throw conflict('Sitting is full');
  }
  const r = await query(`INSERT INTO exam_bookings(user_id, jurisdiction, sitting_id, order_id) VALUES ($1,$2,$3,$4) RETURNING *`, [userId, j.code, sittingId, (paid as any).id]);
  await audit(userId, 'badge.book', j.code, { sittingId });
  return r[0];
}
/** The exam paper: applied MCQs. Seeded sample questions expand into a 20-question paper per sitting in this build. */
export async function paper(userId: string, code: string) {
  const j = await one<any>('SELECT code, name, syllabus FROM jurisdictions WHERE upper(code)=upper($1)', [code]);
  if (!j) throw notFound('Jurisdiction');
  const booking = await one<any>(`SELECT id FROM exam_bookings WHERE user_id=$1 AND jurisdiction=$2 AND status='booked'`, [userId, j.code]);
  if (!booking) throw forbidden('No active booking for this badge');
  const bank = examBank(j);
  return { jurisdiction: j.code, name: j.name, minutes: 90, passMark: 70, questions: bank.map((q, i) => ({ id: `q${i + 1}`, prompt: q.prompt, options: q.options.map((t, k) => ({ key: 'ABCD'[k]!, text: t })) })) };
}
export async function sit(userId: string, code: string, answers: Record<string, string>) {
  const j = await one<any>('SELECT code, name, syllabus FROM jurisdictions WHERE upper(code)=upper($1)', [code]);
  if (!j) throw notFound('Jurisdiction');
  const booking = await one<any>(`SELECT id, resit_available FROM exam_bookings WHERE user_id=$1 AND jurisdiction=$2 AND status='booked'`, [userId, j.code]);
  if (!booking) throw forbidden('No active booking for this badge');
  const bank = examBank(j);
  const correct = bank.filter((q, i) => (answers[`q${i + 1}`] ?? '').toUpperCase() === q.answer).length;
  const scorePct = Math.round((correct / bank.length) * 10000) / 100;
  const passed = scorePct >= 70;
  const u = await one<any>('SELECT display_name FROM users WHERE id=$1', [userId]);
  const prior = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM exam_attempts WHERE user_id=$1 AND jurisdiction=$2', [userId, j.code]);
  const result = await withTx(async (c) => {
    const att = await c.query(`INSERT INTO exam_attempts(user_id, jurisdiction, booking_id, score_pct, passed, is_resit) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`, [userId, j.code, booking.id, scorePct, passed, (prior?.n ?? 0) > 0]);
    let verificationId: string | null = null;
    if (passed) {
      const vidRow = await c.query<{ n: number }>(`SELECT nextval('verification_seq')::int AS n`);
      verificationId = `LWM-${new Date().getUTCFullYear()}-${String(vidRow.rows[0]!.n).padStart(4, '0')}`;
      const earnedAt = new Date().toISOString();
      const payload = { type: 'badge', verificationId, holder: u.display_name, jurisdiction: j.code, score: scorePct, examinedBy: 'Ahmed El Gendy', earnedAt };
      await c.query(`INSERT INTO badges_earned(user_id, jurisdiction, attempt_id, score_pct, verification_id, signature, earned_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [userId, j.code, att.rows[0].id, scorePct, verificationId, signCredential(payload), earnedAt]);
      await c.query(`UPDATE exam_bookings SET status='sat' WHERE id=$1`, [booking.id]);
      await awardCredits({ userId, kind: 'law', amount: CREDIT_RULES.badgeExamLaw, sourceType: 'badge', sourceId: j.code, title: `${j.name} Jurisdiction Badge Exam`, scoreLabel: 'Pass', itemKind: 'Exam' }, c);
    } else if (booking.resit_available) {
      await c.query(`UPDATE exam_bookings SET resit_available=false WHERE id=$1`, [booking.id]);   // one free resit: booking stays open
    } else {
      await c.query(`UPDATE exam_bookings SET status='sat' WHERE id=$1`, [booking.id]);
    }
    await touchActivity(userId, c);
    return { verificationId };
  });
  await audit(userId, 'badge.sit', j.code, { scorePct, passed });
  const badges = await query<{ jurisdiction: string }>('SELECT jurisdiction FROM badges_earned WHERE user_id=$1 AND NOT revoked', [userId]);
  const ladder = computeLadder({ jurisdictions: badges.map((b) => b.jurisdiction), hasCraft: true, hasCapstone: false });
  return { scorePct, passed, correct, total: bank.length, verificationId: result.verificationId, resitAvailable: !passed && booking.resit_available, ladder };
}
function examBank(j: any): Array<{ prompt: string; options: string[]; answer: string }> {
  const s = j.syllabus ?? {};
  const base = [
    { prompt: `In ${j.name}, which source of law does a court reach for first?`, options: [s.sources?.[0] ?? 'Statute', 'Custom', 'Academic writing', 'Foreign judgments'], answer: 'A' },
    { prompt: `Which court sits at the apex of the ${j.name} ordinary court structure?`, options: ['First-instance court', s.courts?.[s.courts.length - 1] ?? 'Supreme court', 'Commercial registry', 'Bar association'], answer: 'B' },
    { prompt: 'A consumer cancels an online purchase after 10 days. What applies?', options: ['No right of cancellation exists', 'The statutory withdrawal window and its exceptions', 'Only the seller’s policy', 'Criminal liability for the seller'], answer: 'B' },
    { prompt: 'A supplier assigns future IP to a client by email. Is the assignment effective?', options: ['Always', 'Never', 'Only if the formality rule for IP assignments is satisfied', 'Only for patents'], answer: 'C' },
    { prompt: `Which regulator would you notify of a personal-data breach in ${j.name}?`, options: ['The commercial registry', 'The data-protection authority', 'The bar association', 'The central bank'], answer: 'B' }
  ];
  const fam = j.family === 'common'
    ? { prompt: 'How does a court in this system treat an earlier appellate decision on the same point?', options: ['As binding precedent', 'As persuasive only', 'As irrelevant', 'As a legislative act'], answer: 'A' }
    : { prompt: 'How does a court in this system reason from the civil code?', options: ['By analogy from prior cases', 'Downward from the general provisions of the code', 'By reference to foreign case law', 'By jury verdict'], answer: 'B' };
  const market = (s.market ?? []).slice(0, 4).map((m: string, i: number) => ({ prompt: `A client asks for help with ${m.toLowerCase()} work in ${j.name}. Which body of rules applies first?`, options: ['The relevant sector regulation and the civil/commercial code', 'Only foreign law', 'Only the firm’s engagement letter', 'No rules apply'], answer: 'A', i }));
  const weighting = (s.weighting ?? []).map((w: any) => ({ prompt: `Roughly what share of the ${j.name} paper examines "${w.subject}"?`, options: [`${w.pct}%`, `${Math.max(5, w.pct - 10)}%`, `${w.pct + 20}%`, '0%'], answer: 'A' }));
  return [...base, fam, ...market, ...weighting].slice(0, 20);
}
export async function ladderOverview(userId?: string) {
  const badges = userId ? await query<any>(`SELECT b.jurisdiction, j.name, j.flag, b.score_pct FROM badges_earned b JOIN jurisdictions j ON j.code=b.jurisdiction WHERE b.user_id=$1 AND NOT b.revoked ORDER BY b.earned_at`, [userId]) : [];
  const enrolled = userId ? Boolean(await one('SELECT 1 FROM enrollments WHERE user_id=$1', [userId])) : false;
  const certs = userId ? await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM certificates WHERE user_id=$1 AND NOT revoked', [userId]) : null;
  const ladder = computeLadder({ jurisdictions: badges.map((b) => b.jurisdiction), hasCraft: enrolled, hasCapstone: (certs?.n ?? 0) >= 2 });
  const passRates = await query<any>('SELECT code, name, flag, pass_rate_pct, hardness FROM jurisdictions ORDER BY pass_rate_pct DESC');
  const masters = await one<{ n: number }>(`SELECT COUNT(*)::int AS n FROM (SELECT user_id FROM badges_earned WHERE NOT revoked GROUP BY user_id HAVING COUNT(*) >= 4) t`);
  return { ladder, badges, passRates, masterHolders: masters?.n ?? 0, total: JURISDICTIONS.length, pricing: { single: 7900, bundle: 29900, bundleAnchor: 71100, student: 5500, studentBundle: 20900 } };
}
export function verifyRequired(): never { throw badRequest('verificationId required'); }

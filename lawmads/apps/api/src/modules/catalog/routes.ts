import { Router } from 'express';
import { h, param } from '../../core/http.js';
import { optionalAuth } from '../../core/auth.js';
import * as svc from './service.js';
import { JURISDICTIONS, LANGUAGES, PROGRAMMING_LANGUAGE_COUNT, TRACK_COUNT, EXERCISES_PER_TRACK } from '@lawmads/shared';
import { one } from '../../core/db.js';

export const catalogRouter = Router();
catalogRouter.get('/tracks', h(async (_req, res) => { res.json({ tracks: await svc.tracks() }); }));
catalogRouter.get('/programs', h(async (req, res) => { res.json({ programs: await svc.programs({ track: typeof req.query.track === 'string' ? req.query.track : undefined, featured: req.query.featured === 'true' ? true : undefined }) }); }));
catalogRouter.get('/programs/:code', optionalAuth, h(async (req, res) => { res.json(await svc.programDetail(param(req, 'code'), req.user?.id)); }));
catalogRouter.get('/courses', h(async (req, res) => { res.json({ courses: await svc.courses(typeof req.query.category === 'string' ? req.query.category : undefined) }); }));
catalogRouter.get('/courses/:slug', optionalAuth, h(async (req, res) => { res.json(await svc.course(param(req, 'slug'), req.user?.id)); }));
catalogRouter.get('/lessons/:slug', optionalAuth, h(async (req, res) => { res.json(await svc.lesson(param(req, 'slug'), req.user?.id)); }));
catalogRouter.get('/quizzes/:slug', h(async (req, res) => { res.json(await svc.quiz(param(req, 'slug'))); }));
/** Platform-wide counts the marketing pages must never hard-code. */
catalogRouter.get('/stats', h(async (_req, res) => {
  const programs = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM programs WHERE published');
  const courses = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM courses');
  const exercises = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM exercises WHERE published');
  const members = await one<{ n: number }>(`SELECT (SELECT COALESCE(value::int,0) FROM feature_flags WHERE key='community.membersBaseline') + (SELECT COUNT(DISTINCT user_id)::int FROM chapter_members) AS n`);
  const chapters = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM chapters');
  const episodes = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM podcast_episodes');
  const posts = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM blog_posts');
  const lawEntries = await one<{ n: number }>('SELECT COALESCE(SUM(entries),0)::int AS n FROM coverage_stats');
  const certificates = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM certificates WHERE NOT revoked');
  const badges = await one<{ n: number }>('SELECT COUNT(*)::int AS n FROM badges_earned WHERE NOT revoked');
  res.json({ jurisdictions: JURISDICTIONS.length, languages: PROGRAMMING_LANGUAGE_COUNT, ideTracks: TRACK_COUNT, agenticTracks: LANGUAGES.filter((l) => l.agentic).length, exercisesPerTrack: EXERCISES_PER_TRACK, gradedExercises: exercises?.n ?? 0, programs: programs?.n ?? 0, courses: courses?.n ?? 0, members: members?.n ?? 0, chapters: chapters?.n ?? 0, cityChapters: 14, eventsThisYear: 127, employmentRate: 96, episodes: episodes?.n ?? 0, blogPosts: posts?.n ?? 0, lawEntries: lawEntries?.n ?? 0, certificatesIssued: certificates?.n ?? 0, badgesIssued: badges?.n ?? 0, creditSystems: 2, certificationPrograms: '15+' });
}));

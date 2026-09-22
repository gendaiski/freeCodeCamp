/** API DTOs shared by api and web. Keep in sync with docs/openapi.yaml. */
export type Role = 'student' | 'instructor' | 'admin';
export interface UserDto {
  id: string; email: string; firstName: string; lastName: string; displayName: string; initials: string;
  roles: Role[]; plan: string; isStudent: boolean; academicEmail: string | null; locale: 'en' | 'ar' | 'fr';
  createdAt: string; twoFactorEnabled: boolean;
}
export interface SessionDto { accessToken: string; refreshToken: string; user: UserDto; expiresIn: number }
export interface ApiError { error: { code: string; message: string; details?: unknown } }

export interface TrackDto { slug: string; name: string; order: number; programCount: number }
export interface ProgramSummaryDto {
  code: string; slug: string; name: string; tagline: string; track: string; trackName: string; level: string;
  weeks: number; techCredits: number; lawCredits: number; tools: string[]; lawAreas: string[]; sku: string; priceCents: number;
  kind: 'certificate' | 'diploma' | 'career' | 'course_certificate'; featured: boolean; isNew: boolean;
}
export interface CurriculumItemDto {
  id: string; kind: 'video' | 'quiz' | 'lab' | 'law' | 'exam' | 'project' | 'capstone'; title: string; minutes: number | null;
  meta: string | null; exerciseId: string | null; quizId: string | null; lessonId: string | null; order: number;
  status?: 'done' | 'now' | 'todo';
}
export interface ProgramTrackDto { code: 'A' | 'B' | 'C' | 'CAP'; name: string; items: CurriculumItemDto[] }
export interface ProgramDetailDto extends ProgramSummaryDto {
  overview: string; whoFor: string; careerOutcomes: string; prerequisite: string; capstone: string; assessment: string;
  tracks: ProgramTrackDto[]; installments: { count: number; eachCents: number } | null; enrolled: boolean; progressPct: number | null;
}

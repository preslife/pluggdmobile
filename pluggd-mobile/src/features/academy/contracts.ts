// Keep admission independent of user entitlements: ownership never makes a paid course free.
export type AcademySystem = 'lms' | 'legacy';
export type Row = Record<string, unknown>;
export const object = (value: unknown): value is Row => !!value && typeof value === 'object' && !Array.isArray(value);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown) => typeof value === 'string' ? value : '';
const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;

export interface AcademyCourse {
  system: AcademySystem; id: string; identifier: string; title: string; description: string;
  image?: string; difficulty: string; lessonCount: number; minutes: number;
}
export interface AcademyLesson {
  id: string; title: string; summary: string; body: string; format: 'markdown' | 'html' | 'quiz';
  video?: string; audio?: string; resources: string[];
}
export interface AcademyDetail { course: AcademyCourse; lessons: AcademyLesson[] }
export interface AcademyProgress { completed: string[]; lastLessonId: string | null; percent: number }

export function safeAcademyUrl(value: unknown): string | undefined {
  if (typeof value !== 'string' || !value || value.trim() !== value || /[\s\\\u0000-\u001f\u007f]/.test(value)) return;
  try {
    const url = new URL(value.startsWith('/') && !value.startsWith('//') ? `https://pluggd.fm${value}` : value);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch { /* Invalid resource links are never actionable. */ }
}

export function isStrictlyFreeLms(value: unknown): value is Row {
  if (!object(value) || value.price_cents !== 0 || !value.published_at
      || !['public', 'unlisted'].includes(String(value.visibility))) return false;
  if (value.pricing === null) return true;
  return object(value.pricing) && value.pricing.is_membership_only === false
    && value.pricing.required_tier === 'free'
    && (value.pricing.one_time_price_cents === null || value.pricing.one_time_price_cents === 0);
}

export function isStrictlyFreeLegacy(value: unknown): value is Row {
  return object(value) && value.is_published === true && value.is_free === true && value.price === 0
    && value.access_unavailable === false && value.is_pro_only !== true
    && (value.one_time_price === null || value.one_time_price === 0);
}

export function courseMetadata(value: Row, system: AcademySystem): AcademyCourse {
  if (typeof value.id !== 'string' || !UUID.test(value.id) || typeof value.title !== 'string'
      || (system === 'lms' && (typeof value.slug !== 'string' || !value.slug))) throw new Error('invalid_course');
  return { system, id: value.id, identifier: system === 'lms' ? String(value.slug) : value.id,
    title: value.title, description: text(value.description), image: safeAcademyUrl(value.thumbnail_url),
    difficulty: text(value.difficulty ?? value.difficulty_level), lessonCount: count(value.lesson_count),
    minutes: system === 'lms' ? count(value.duration_minutes) : Math.max(0, Number(value.duration_hours) || 0) * 60 };
}

export function parseLessons(value: unknown, system: AcademySystem): AcademyLesson[] {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('invalid_lessons');
  const seen = new Set<string>();
  return value.map((raw): AcademyLesson => {
    if (!object(raw) || typeof raw.id !== 'string' || !raw.id || raw.id.length > 255 || seen.has(raw.id)
        || (system === 'lms' && !UUID.test(raw.id)) || typeof raw.title !== 'string') throw new Error('invalid_lessons');
    seen.add(raw.id);
    let body = ''; let format: AcademyLesson['format'] = raw.type === 'quiz' ? 'quiz' : 'markdown';
    if (typeof raw.content === 'string') body = raw.content;
    else if (object(raw.content)) {
      body = ['markdown', 'body', 'text', 'content'].map(key => raw.content && (raw.content as Row)[key])
        .find((item): item is string => typeof item === 'string' && !!item.trim()) ?? '';
      if (!body && typeof raw.content.html === 'string') { body = raw.content.html; format = 'html'; }
    }
    return { id: raw.id, title: raw.title, summary: text(raw.summary), body, format,
      video: safeAcademyUrl(raw.video_asset_url ?? raw.videoUrl), audio: safeAcademyUrl(raw.audioUrl),
      resources: Array.isArray(raw.download_urls) ? raw.download_urls.map(safeAcademyUrl).filter((url): url is string => !!url) : [] };
  });
}

export function parseProgress(value: unknown, actor: string, courseId: string, lessons: AcademyLesson[]): AcademyProgress {
  if (!object(value) || value.user_id !== actor || value.course_id !== courseId
      || !Array.isArray(value.completed_lesson_ids) || value.completed_lesson_ids.length > lessons.length
      || !value.completed_lesson_ids.every(id => typeof id === 'string' && lessons.some(lesson => lesson.id === id))
      || new Set(value.completed_lesson_ids).size !== value.completed_lesson_ids.length
      || !(value.last_lesson_id == null || lessons.some(lesson => lesson.id === value.last_lesson_id))
      || typeof value.percent_complete !== 'number' || !Number.isFinite(value.percent_complete)
      || value.percent_complete < 0 || value.percent_complete > 100) throw new Error('invalid_progress');
  return { completed: value.completed_lesson_ids as string[], lastLessonId: value.last_lesson_id as string | null ?? null,
    percent: value.percent_complete };
}

export function resumeLesson(detail: AcademyDetail, progress?: AcademyProgress): string | undefined {
  return detail.lessons.find(lesson => lesson.id === progress?.lastLessonId)?.id
    ?? detail.lessons.find(lesson => !progress?.completed.includes(lesson.id))?.id ?? detail.lessons[0]?.id;
}

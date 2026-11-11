import type { AcademyLesson } from './contracts';

function decode(value: string): string {
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity: string) => {
    const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
    if (named[entity.toLowerCase()]) return named[entity.toLowerCase()];
    const point = entity.startsWith('#x') ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return Number.isSafeInteger(point) && point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
  });
}

// HTML becomes inert native text, never executable web content. Preserve paragraph/list boundaries.
export function nativeLessonText(lesson: AcademyLesson): string {
  if (lesson.format !== 'html') return lesson.body;
  return decode(lesson.body.replace(/<(script|style|iframe|object|svg|template)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<li\b[^>]*>/gi, '\n• ').replace(/<(br|\/p|\/div|\/h[1-6]|\/ul|\/ol|\/blockquote)\b[^>]*>/gi, '\n\n')
    .replace(/<[^>]*>/g, '')).replace(/\n{3,}/g, '\n\n').trim();
}

export function practiceQuestions(lesson: AcademyLesson): Array<{ question: string; options: string[] }> | null {
  try {
    const value = JSON.parse(lesson.body);
    if (!Array.isArray(value.questions) || !value.questions.length || value.questions.length > 100
        || !value.questions.every((item: { question?: unknown; options?: unknown }) => item && typeof item.question === 'string'
          && Array.isArray(item.options) && item.options.length > 0 && item.options.every(option => typeof option === 'string'))) return null;
    return value.questions.map((item: { question: string; options: string[] }) => ({ question: item.question, options: item.options }));
  } catch { return null; }
}

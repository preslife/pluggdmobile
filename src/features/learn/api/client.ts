import { supabase } from '@/integrations/supabase/client';
import type {
  GrantCourseEntitlementInput,
  LmsCourse,
  LmsCourseDetail,
  LmsCourseFilters,
  LmsCoursePricing,
  LmsCourseProgress,
  LmsLesson,
  LmsQuiz,
  LmsQuizAttempt,
  RecordCoursePurchaseInput,
  SetCoursePricingInput,
  SubmitQuizAttemptInput,
} from './types';

const DEFAULT_LIMIT = 12;

const normalizeArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : []);

const normalizeMetadata = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const mapCourseRecord = (course: Record<string, any>): LmsCourse => ({
  id: course.id,
  slug: course.slug,
  title: course.title,
  subtitle: course.subtitle,
  description: course.description,
  difficulty: course.difficulty,
  visibility: course.visibility,
  thumbnail_url: course.thumbnail_url,
  promo_video_url: course.promo_video_url,
  topics: normalizeArray<string>(course.topics ?? course.metadata?.topics ?? []),
  duration_minutes: course.duration_minutes ?? 0,
  lesson_count: course.lesson_count ?? 0,
  price_cents: course.price_cents ?? 0,
  currency: course.currency ?? 'usd',
  metadata: normalizeMetadata(course.metadata),
  published_at: course.published_at,
  created_at: course.created_at,
  updated_at: course.updated_at,
  instructor: course.instructor ?? null,
  pricing: course.pricing
    ? {
        is_membership_only: Boolean(course.pricing.is_membership_only),
        required_tier: (course.pricing.required_tier ?? 'free') as LmsCoursePricing['required_tier'],
        one_time_price_cents: course.pricing.one_time_price_cents ?? null,
        currency: course.pricing.currency ?? 'usd',
        metadata: normalizeMetadata(course.pricing.metadata),
      }
    : null,
});

export async function fetchLmsCourses(filters: LmsCourseFilters = {}): Promise<LmsCourse[]> {
  const { limit = DEFAULT_LIMIT, offset = 0, query, difficulty, visibility, instructorId } = filters;

  const { data, error } = await supabase.rpc('get_lms_courses', {
    p_limit: limit,
    p_offset: offset,
    p_query: query ?? null,
    p_difficulty: difficulty ?? null,
    p_visibility: visibility ?? null,
    p_instructor: instructorId ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeArray<Record<string, any>>(data).map(mapCourseRecord);
}

export async function fetchLmsCourseDetail(slug: string, includeLessons = true): Promise<LmsCourseDetail> {
  const { data, error } = await supabase.rpc('get_lms_course_detail', {
    p_slug: slug,
    p_include_lessons: includeLessons,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.course) {
    throw new Error('Course not found');
  }

  const lessons = normalizeArray<Record<string, any>>(data.lessons).map(
    (lesson): LmsLesson => ({
      id: lesson.id,
      slug: lesson.slug,
      title: lesson.title,
      summary: lesson.summary,
      content: lesson.content ?? {},
      video_asset_url: lesson.video_asset_url,
      download_urls: normalizeArray<string>(lesson.download_urls),
      estimated_minutes: lesson.estimated_minutes ?? 0,
      order_index: lesson.order_index ?? 0,
      is_preview: !!lesson.is_preview,
      created_at: lesson.created_at,
      updated_at: lesson.updated_at,
    })
  );

  return {
    course: mapCourseRecord(data.course),
    lessons,
    progress: data.progress ?? null,
    access: data.access ?? null,
  };
}

export async function fetchLmsCourseProgress(courseId: string): Promise<LmsCourseProgress | null> {
  const { data, error } = await supabase.rpc('get_lms_course_progress', {
    p_course_id: courseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

export async function recordLessonProgress({
  courseId,
  lessonId,
  completed = true,
  timeSpentSeconds,
}: {
  courseId: string;
  lessonId: string;
  completed?: boolean;
  timeSpentSeconds?: number;
}): Promise<LmsCourseProgress> {
  const { data, error } = await supabase.rpc('record_lms_lesson_progress', {
    p_course_id: courseId,
    p_lesson_id: lessonId,
    p_completed: completed,
    p_time_spent_seconds: timeSpentSeconds ?? 0,
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to record progress');
  }

  return data;
}

export async function fetchLmsQuizzes(courseId: string): Promise<LmsQuiz[]> {
  const { data, error } = await supabase.rpc('get_lms_quizzes', {
    p_course_id: courseId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeArray<LmsQuiz>(data);
}

export async function submitQuizAttempt(input: SubmitQuizAttemptInput): Promise<LmsQuizAttempt> {
  const { data, error } = await supabase.rpc('submit_lms_quiz_attempt', {
    p_quiz_id: input.quizId,
    p_answers: input.answers,
    p_time_spent_seconds: input.timeSpentSeconds ?? null,
    p_user_id: input.userId ?? null,
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to submit quiz attempt');
  }

  return data;
}

export async function fetchQuizAttempts(quizId: string): Promise<LmsQuizAttempt[]> {
  const { data, error } = await supabase.rpc('get_lms_quiz_attempts', {
    p_quiz_id: quizId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeArray<LmsQuizAttempt>(data);
}

export async function setCoursePricing(input: SetCoursePricingInput): Promise<LmsCoursePricing> {
  const { data, error } = await supabase.rpc('set_lms_course_pricing', {
    p_course_id: input.courseId,
    p_is_membership_only: input.isMembershipOnly,
    p_required_tier: input.requiredTier,
    p_one_time_price_cents: input.oneTimePriceCents ?? null,
    p_currency: input.currency ?? 'usd',
    p_metadata: input.metadata ?? {},
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to update course pricing');
  }

  return data;
}

export async function grantCourseEntitlement(input: GrantCourseEntitlementInput) {
  const { data, error } = await supabase.rpc('grant_lms_course_entitlement', {
    p_course_id: input.courseId,
    p_user_id: input.userId,
    p_source: input.source ?? 'manual',
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to grant entitlement');
  }

  return data;
}

export async function recordCoursePurchase(input: RecordCoursePurchaseInput) {
  const { data, error } = await supabase.rpc('record_lms_course_purchase', {
    p_course_id: input.courseId,
    p_amount_cents: input.amountCents,
    p_currency: input.currency ?? 'usd',
    p_reference: input.reference ?? null,
    p_user_id: input.userId ?? null,
  });

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to record purchase');
  }

  return data;
}

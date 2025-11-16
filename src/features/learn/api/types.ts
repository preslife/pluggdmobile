export type LmsCourseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type LmsCourseVisibility = 'public' | 'unlisted' | 'private';

export interface LmsInstructor {
  id: string | null;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
}

export interface LmsCourse {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  difficulty: LmsCourseDifficulty;
  visibility: LmsCourseVisibility;
  thumbnail_url?: string | null;
  promo_video_url?: string | null;
  topics: string[];
  duration_minutes: number;
  lesson_count: number;
  price_cents: number;
  currency: string;
  metadata: Record<string, unknown>;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
  instructor?: LmsInstructor | null;
  pricing?: LmsCoursePricing | null;
}

export interface LmsCoursePricing {
  is_membership_only: boolean;
  required_tier: 'free' | 'creator' | 'pro';
  one_time_price_cents?: number | null;
  currency?: string | null;
  metadata: Record<string, unknown>;
}

export interface LmsCourseAccess {
  granted: boolean;
  requires_auth: boolean;
  requires_membership: boolean;
  required_tier: 'free' | 'creator' | 'pro';
  requires_purchase: boolean;
  purchased: boolean;
  has_manual_grant: boolean;
}

export interface LmsLesson {
  id: string;
  slug: string;
  title: string;
  summary?: string | null;
  content?: Record<string, unknown> | null;
  video_asset_url?: string | null;
  download_urls?: string[];
  estimated_minutes: number;
  order_index: number;
  is_preview: boolean;
  created_at: string;
  updated_at: string;
}

export interface LmsCourseProgress {
  id: string;
  user_id: string;
  course_id: string;
  completed_lesson_ids: string[];
  last_lesson_id?: string | null;
  percent_complete: number;
  total_time_minutes: number;
  last_accessed: string;
  created_at: string;
  updated_at: string;
}

export interface LmsCourseDetail {
  course: LmsCourse;
  lessons: LmsLesson[];
  progress: LmsCourseProgress | null;
  access?: LmsCourseAccess | null;
}

export interface SetCoursePricingInput {
  courseId: string;
  isMembershipOnly: boolean;
  requiredTier: 'free' | 'creator' | 'pro';
  oneTimePriceCents?: number | null;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface GrantCourseEntitlementInput {
  courseId: string;
  userId: string;
  source?: string;
}

export interface RecordCoursePurchaseInput {
  courseId: string;
  amountCents: number;
  currency?: string;
  reference?: string | null;
  userId?: string;
}

export interface LmsQuiz {
  id: string;
  course_id: string;
  lesson_id?: string | null;
  title: string;
  description?: string | null;
  question_bank: Record<string, unknown>;
  passing_score: number;
  max_attempts: number;
  time_limit_minutes?: number | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  stats?: {
    attempt_count: number;
    best_score?: number | null;
    last_score?: number | null;
    last_attempt_at?: string | null;
  } | null;
}

export interface LmsQuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  answers: Record<string, unknown>;
  score?: number | null;
  passed?: boolean | null;
  attempt_number: number;
  time_spent_seconds?: number | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

export interface LmsCourseFilters {
  limit?: number;
  offset?: number;
  query?: string;
  difficulty?: LmsCourseDifficulty | null;
  visibility?: LmsCourseVisibility | null;
  instructorId?: string | null;
}

export interface SubmitQuizAttemptInput {
  quizId: string;
  answers: Record<string, unknown>;
  timeSpentSeconds?: number;
  userId?: string;
}

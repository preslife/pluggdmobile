# Pluggd Academy LMS Integration Roadmap

The PLUGGD Academy UI that now lives in `PLUGGD ACADEMY/` must be merged into the production app under `/learn/*` without mocks. This document captures the order of operations so we can ship the LMS as a first‑class feature with guarded rollout, real Supabase data, and complete observability.

## 1. Backend & Supabase
- **Run the LMS schema** (`supabase/migrations/20251109090000_lms_core_schema.sql`) and the RPC pack (`20251109093000_lms_functions.sql`). The RPCs created today include:
  - `get_lms_courses`, `get_lms_course_detail`, `get_lms_course_progress`
  - `record_lms_lesson_progress`, `get_lms_quizzes`, `submit_lms_quiz_attempt`, `get_lms_quiz_attempts`
- **Entitlements:** map course access to the existing purchases/memberships tables. The new helper `public.can_access_lms_course` (see `supabase/migrations/20251109101500_lms_entitlements.sql`) combines memberships, purchases, and manual grants. All LMS RPCs should call it before they return protected rows.
- **Pricing administration:** `set_lms_course_pricing`, `grant_lms_course_entitlement`, and `record_lms_course_purchase` now exist so instructors can manage access without leaving the LMS admin screens. Use these RPCs when wiring the creator-facing controls.
- **Ingestion hooks:** when creators publish or update LMS content in Studio, enqueue Supabase background jobs (or emit to Edge Functions) to denormalize `lesson_count`, `duration_minutes`, etc.
- **Service-role tests:** extend `supabase/tests` with Postgres unit tests that invoke each RPC using both creator and learner `auth.uid()` contexts so we know RLS holds even though the functions are `security definer`.

## 2. Adapter Layer & Feature Flags
- **Next.js server routes:** Create loader functions under `src/server/learn/` that proxy to the Supabase RPCs with the current session (e.g., `adapterGetCourses`, `adapterGetCourseDetail`, `adapterRecordLessonProgress`, `adapterSubmitQuizAttempt`). These will be the only place the LMS UI calls Supabase directly.
- **Feature flag:** add `FeatureFlag.LMS` to the config module that already drives other launches. Wrap routing, navigation entry points, and analytics with this flag so we can expose `/learn` to cohorts.
- **Access guards:** implement `requireCourseEntitlement(courseId)` on both server and client. This helper will call the adapter, verify the entitlement, and redirect to `/pricing` or `/community` when access is denied.
- **Observability:** emit structured logs (`learn_request`, `learn_progress_update`, `learn_quiz_submission`) that include `request_id`, user id, course id, and timing. Push metrics to whatever pipeline we already use for the checkout/membership dashboards so the LMS shows up in `docs/observability.md`.

## 3. UI Migration (PLUGGD → /src/features/learn)
- **Scaffold feature folders:** `src/features/learn/catalog`, `.../course`, `.../lesson`, `.../quiz`, `.../creator`. Each folder should own its route loaders, components, and tests.
- **Move components with intent:**
  - Catalog + filtering → `Classroom.tsx` + `CourseTemplates.tsx`.
  - Learner home + analytics → `StudentDashboard.tsx`, `AdvancedAnalytics.tsx`.
  - Assessments → `AssessmentSystem.tsx` + quiz modals consuming `get_lms_quizzes`.
  - Course detail + lesson playback now live under `/learn/:slug`, powered by `get_lms_course_detail` + `record_lms_lesson_progress`.
  - Creator tooling → `ContentCreator.tsx`, `CourseManagement.tsx`, `CreatorDashboard.tsx`.
- **Strip placeholder state:** today every component initializes empty arrays and never fetches. Replace those `useEffect` blocks with hooks that call the server loaders (e.g., `const { data } = useQuery(['courses', filters], fetchCourses)`), using real responses from the adapter.
- **Real interactions:**
  - `Classroom`: load `get_lms_courses`, paginate via limit/offset, wire search inputs to the RPC filters.
  - `Lesson view`: fetch `get_lms_course_detail` (lessons + progress), call `record_lms_lesson_progress` whenever a learner advances or records watch time.
  - `AssessmentSystem`: list quizzes via `get_lms_quizzes`, show attempt stats, and submit via `submit_lms_quiz_attempt`.
  - `Notifications` inside the LMS should reuse the core notification RPCs; remove any local toasts that are pretending to be alerts.
- **Responsive + theming:** keep the existing ShadCN primitives but ensure tailwind classes reference our design tokens (`text-foreground`, `bg-muted`). Delete duplicate theme tokens that shipped with the LMS repo once components land under `/src`.

## 4. Docs, QA, and Production Readiness
- **Docs updates:** extend `docs/observability.md`, `docs/qa-regression-checklist.md`, and `docs/release-readiness.md` with LMS sections referencing the new routes and RPCs. Link this roadmap in `docs/build-guide`.
- **Manual QA plan:** list the exact test passes we are deferring until Phase E6 (course purchase, lesson playback, quiz submission, creator publishing). Tag them with owners so QA can execute as soon as we flip the LMS flag.
- **Rollout:** use the feature flag to enable `/learn` for internal users → selected creators → beta fans. Keep the adapter layer intact during beta; once telemetry shows stability, refactor components to call existing Pluggd services directly (Pattern 2 → Pattern 1) and delete the adapter helpers.

Following this sequence keeps the LMS fully native (one login, one database, Pluggd analytics) while letting us ship incrementally and avoid ever returning mock data again.

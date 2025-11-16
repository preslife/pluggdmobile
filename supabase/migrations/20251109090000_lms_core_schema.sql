-- LMS core schema for Pluggd Academy integration

-- enum types --------------------------------------------------------------
create type public.lms_course_difficulty as enum ('beginner','intermediate','advanced');
create type public.lms_course_visibility as enum ('public','unlisted','private');

-- tables ------------------------------------------------------------------
create table if not exists public.lms_courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  instructor_id uuid not null references auth.users(id) on delete cascade,
  difficulty public.lms_course_difficulty not null default 'beginner',
  visibility public.lms_course_visibility not null default 'public',
  thumbnail_url text,
  promo_video_url text,
  topics text[] default '{}',
  duration_minutes integer default 0,
  lesson_count integer default 0,
  price_cents integer default 0,
  currency text default 'usd',
  metadata jsonb default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lms_courses_slug_check check (char_length(slug) >= 3)
);

create table if not exists public.lms_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  slug text not null,
  title text not null,
  summary text,
  content jsonb default '{}'::jsonb,
  video_asset_url text,
  download_urls text[] default '{}',
  estimated_minutes integer default 5,
  order_index integer not null default 0,
  is_preview boolean default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lms_lessons_unique_slug unique(course_id, slug)
);

create table if not exists public.lms_course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  completed_lesson_ids uuid[] default '{}',
  last_lesson_id uuid references public.lms_lessons(id) on delete set null,
  percent_complete numeric(5,2) default 0,
  total_time_minutes integer default 0,
  last_accessed timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lms_course_progress_unique unique (user_id, course_id)
);

create table if not exists public.lms_quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  lesson_id uuid references public.lms_lessons(id) on delete cascade,
  title text not null,
  description text,
  question_bank jsonb not null,
  passing_score integer default 70,
  max_attempts integer default 3,
  time_limit_minutes integer,
  is_published boolean default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.lms_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.lms_quizzes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  score integer,
  passed boolean,
  attempt_number integer default 1,
  time_spent_seconds integer,
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

-- helper function for RLS -------------------------------------------------
create or replace function public.lms_is_course_owner(p_course_id uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.lms_courses c
    where c.id = p_course_id
      and c.instructor_id = auth.uid()
  );
$$;

create trigger lms_courses_set_updated_at
  before update on public.lms_courses
  for each row execute procedure public.update_updated_at_column();

create trigger lms_lessons_set_updated_at
  before update on public.lms_lessons
  for each row execute procedure public.update_updated_at_column();

create trigger lms_course_progress_set_updated_at
  before update on public.lms_course_progress
  for each row execute procedure public.update_updated_at_column();

create trigger lms_quizzes_set_updated_at
  before update on public.lms_quizzes
  for each row execute procedure public.update_updated_at_column();

create trigger lms_quiz_attempts_set_updated_at
  before update on public.lms_quiz_attempts
  for each row execute procedure public.update_updated_at_column();

-- indexes -----------------------------------------------------------------
create index if not exists idx_lms_courses_instructor on public.lms_courses(instructor_id);
create index if not exists idx_lms_courses_slug on public.lms_courses(slug);
create index if not exists idx_lms_lessons_course_order on public.lms_lessons(course_id, order_index);
create index if not exists idx_lms_progress_user_course on public.lms_course_progress(user_id, course_id);
create index if not exists idx_lms_quizzes_course on public.lms_quizzes(course_id);
create index if not exists idx_lms_quiz_attempts_user on public.lms_quiz_attempts(user_id, quiz_id);

-- row level security ------------------------------------------------------
alter table public.lms_courses enable row level security;
alter table public.lms_lessons enable row level security;
alter table public.lms_course_progress enable row level security;
alter table public.lms_quizzes enable row level security;
alter table public.lms_quiz_attempts enable row level security;

-- Courses: everyone can read public courses, owners manage
create policy "Courses are viewable when published"
  on public.lms_courses
  for select
  using (
    visibility = 'public'
    or published_at is not null
    or lms_is_course_owner(id)
  );

create policy "Course owners manage"
  on public.lms_courses
  for all
  using (lms_is_course_owner(id));

-- Lessons inherit course visibility
create policy "Lessons readable when course is viewable"
  on public.lms_lessons
  for select
  using (
    exists (
      select 1
      from public.lms_courses c
      where c.id = course_id
        and (
          c.visibility = 'public'
          or c.published_at is not null
          or lms_is_course_owner(c.id)
        )
    )
  );

create policy "Lesson owners manage"
  on public.lms_lessons
  for all
  using (
    exists (
      select 1
      from public.lms_courses c
      where c.id = course_id
        and lms_is_course_owner(c.id)
    )
  );

-- Progress rows belong to the learner
create policy "Learners manage their progress"
  on public.lms_course_progress
  for all
  using (auth.uid() = user_id);

-- Quizzes follow course visibility
create policy "Quizzes readable when course readable"
  on public.lms_quizzes
  for select
  using (
    exists (
      select 1
      from public.lms_courses c
      where c.id = course_id
        and (
          c.visibility = 'public'
          or c.published_at is not null
          or lms_is_course_owner(c.id)
        )
    )
  );

create policy "Quiz owners manage"
  on public.lms_quizzes
  for all
  using (
    exists (
      select 1
      from public.lms_courses c
      where c.id = course_id
        and lms_is_course_owner(c.id)
    )
  );

-- Quiz attempts readable by learner or instructor
create policy "Quiz attempts owner access"
  on public.lms_quiz_attempts
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.lms_quizzes q
      join public.lms_courses c on c.id = q.course_id
      where q.id = quiz_id
        and lms_is_course_owner(c.id)
    )
  );

create policy "Learners submit quiz attempts"
  on public.lms_quiz_attempts
  for insert
  with check (auth.uid() = user_id);

create policy "Learners update own attempts"
  on public.lms_quiz_attempts
  for update
  using (auth.uid() = user_id);

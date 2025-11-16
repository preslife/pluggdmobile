-- LMS adapter functions for Pluggd Academy integration

create or replace function public.get_lms_courses(
  p_limit integer default 24,
  p_offset integer default 0,
  p_query text default null,
  p_difficulty public.lms_course_difficulty default null,
  p_visibility public.lms_course_visibility default null,
  p_instructor uuid default null
)
returns table (
  id uuid,
  slug text,
  title text,
  subtitle text,
  description text,
  difficulty public.lms_course_difficulty,
  visibility public.lms_course_visibility,
  thumbnail_url text,
  promo_video_url text,
  topics text[],
  duration_minutes integer,
  lesson_count integer,
  price_cents integer,
  currency text,
  metadata jsonb,
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  instructor jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    c.id,
    c.slug,
    c.title,
    c.subtitle,
    c.description,
    c.difficulty,
    c.visibility,
    c.thumbnail_url,
    c.promo_video_url,
    c.topics,
    c.duration_minutes,
    c.lesson_count,
    c.price_cents,
    c.currency,
    c.metadata,
    c.published_at,
    c.created_at,
    c.updated_at,
    jsonb_build_object(
      'id', c.instructor_id,
      'name', coalesce(pr.full_name, pr.username),
      'username', pr.username,
      'avatar_url', pr.avatar_url
    ) as instructor
  from public.lms_courses c
  left join public.profiles pr on pr.id = c.instructor_id
  where
    (p_visibility is null or c.visibility = p_visibility)
    and (p_difficulty is null or c.difficulty = p_difficulty)
    and (p_instructor is null or c.instructor_id = p_instructor)
    and (
      p_query is null
      or c.title ilike '%' || p_query || '%'
      or c.description ilike '%' || p_query || '%'
      or exists (
        select 1
        from unnest(coalesce(c.topics, '{}')) as topic
        where topic ilike '%' || p_query || '%'
      )
    )
  order by coalesce(c.published_at, c.created_at) desc
  limit greatest(1, p_limit)
  offset greatest(0, p_offset);
$$;

grant execute on function public.get_lms_courses(integer, integer, text, public.lms_course_difficulty, public.lms_course_visibility, uuid) to authenticated;

grant execute on function public.get_lms_courses(integer, integer, text, public.lms_course_difficulty, public.lms_course_visibility, uuid) to service_role;

--------------------------------------------------------------------------------
create or replace function public.get_lms_course_detail(
  p_slug text,
  p_include_lessons boolean default true,
  p_user_id uuid default auth.uid()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course record;
  v_lessons jsonb := '[]'::jsonb;
  v_progress public.lms_course_progress%rowtype;
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_pricing public.lms_course_pricing%rowtype;
  v_access boolean := false;
  v_manual boolean := false;
  v_purchased boolean := false;
  v_access_meta jsonb := '{}'::jsonb;
begin
  select
    c.*,
    jsonb_build_object(
      'id', c.instructor_id,
      'name', coalesce(pr.full_name, pr.username),
      'username', pr.username,
      'avatar_url', pr.avatar_url
    ) as instructor_data
  into v_course
  from public.lms_courses c
  left join public.profiles pr on pr.id = c.instructor_id
  where c.slug = p_slug
  limit 1;

  if not found then
    raise exception 'course_not_found';
  end if;

  select * into v_pricing
  from public.lms_course_pricing
  where course_id = v_course.id;

  if v_user is not null then
    select public.can_access_lms_course(v_course.id, v_user) into v_access;
    select exists(
      select 1
      from public.lms_course_entitlements e
      where e.course_id = v_course.id
        and e.user_id = v_user
    ) into v_manual;
    select exists(
      select 1
      from public.lms_course_purchases p
      where p.course_id = v_course.id
        and p.user_id = v_user
    ) into v_purchased;
  else
    select public.can_access_lms_course(v_course.id, null) into v_access;
  end if;

  v_access_meta := jsonb_build_object(
    'granted', coalesce(v_access, false),
    'requires_auth', v_user is null,
    'requires_membership', coalesce(v_pricing.is_membership_only, false) or (v_pricing.required_tier is not null and v_pricing.required_tier <> 'free'),
    'required_tier', coalesce(v_pricing.required_tier, 'free'),
    'requires_purchase', coalesce(v_pricing.one_time_price_cents, 0) > 0,
    'purchased', v_purchased,
    'has_manual_grant', v_manual
  );

  if p_include_lessons then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'id', l.id,
        'slug', l.slug,
        'title', l.title,
        'summary', l.summary,
        'content', l.content,
        'video_asset_url', l.video_asset_url,
        'download_urls', l.download_urls,
        'estimated_minutes', l.estimated_minutes,
        'order_index', l.order_index,
        'is_preview', l.is_preview,
        'created_at', l.created_at,
        'updated_at', l.updated_at
      )
      order by l.order_index asc
    ), '[]'::jsonb)
    into v_lessons
    from public.lms_lessons l
    where l.course_id = v_course.id
      and (coalesce(v_access, false) or l.is_preview);
  end if;

  if v_user is not null then
    select * into v_progress
    from public.lms_course_progress
    where user_id = v_user
      and course_id = v_course.id
    limit 1;
  end if;

  return jsonb_build_object(
    'course', jsonb_build_object(
      'id', v_course.id,
      'slug', v_course.slug,
      'title', v_course.title,
      'subtitle', v_course.subtitle,
      'description', v_course.description,
      'difficulty', v_course.difficulty,
      'visibility', v_course.visibility,
      'thumbnail_url', v_course.thumbnail_url,
      'promo_video_url', v_course.promo_video_url,
      'topics', v_course.topics,
      'duration_minutes', v_course.duration_minutes,
      'lesson_count', v_course.lesson_count,
      'price_cents', v_course.price_cents,
      'currency', v_course.currency,
      'metadata', v_course.metadata,
      'published_at', v_course.published_at,
      'created_at', v_course.created_at,
      'updated_at', v_course.updated_at,
      'instructor', v_course.instructor_data,
      'pricing', case
        when v_pricing is null then null
        else jsonb_build_object(
          'is_membership_only', coalesce(v_pricing.is_membership_only, false),
          'required_tier', coalesce(v_pricing.required_tier, 'free'),
          'one_time_price_cents', v_pricing.one_time_price_cents,
          'currency', coalesce(v_pricing.currency, 'usd'),
          'metadata', v_pricing.metadata
        )
      end
    ),
    'lessons', v_lessons,
    'progress', case when v_progress is null then null else row_to_json(v_progress) end,
    'access', v_access_meta
  );
end;
$$;

grant execute on function public.get_lms_course_detail(text, boolean, uuid) to authenticated;

grant execute on function public.get_lms_course_detail(text, boolean, uuid) to service_role;

--------------------------------------------------------------------------------
create or replace function public.get_lms_course_progress(
  p_course_id uuid,
  p_user_id uuid default auth.uid()
)
returns public.lms_course_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_progress public.lms_course_progress%rowtype;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_progress
  from public.lms_course_progress
  where user_id = v_user
    and course_id = p_course_id
  limit 1;

  return v_progress;
end;
$$;

grant execute on function public.get_lms_course_progress(uuid, uuid) to authenticated;

grant execute on function public.get_lms_course_progress(uuid, uuid) to service_role;

--------------------------------------------------------------------------------
create or replace function public.record_lms_lesson_progress(
  p_course_id uuid,
  p_lesson_id uuid,
  p_completed boolean default true,
  p_time_spent_seconds integer default 0,
  p_user_id uuid default auth.uid()
)
returns public.lms_course_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_total_lessons integer;
  v_existing_time integer := 0;
  v_progress public.lms_course_progress%rowtype;
  v_completed uuid[] := '{}'::uuid[];
  v_percent numeric(5,2) := 0;
  v_minutes integer := greatest(0, coalesce(p_time_spent_seconds, 0)) / 60;
  v_now timestamptz := timezone('utc', now());
  v_lesson_course uuid;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if not public.can_access_lms_course(p_course_id, v_user) then
    raise exception 'course_access_denied';
  end if;

  if p_course_id is null then
    raise exception 'course_id_required';
  end if;

  if p_lesson_id is null then
    raise exception 'lesson_id_required';
  end if;

  select course_id into v_lesson_course
  from public.lms_lessons
  where id = p_lesson_id;

  if v_lesson_course is null then
    raise exception 'lesson_not_found';
  elsif v_lesson_course <> p_course_id then
    raise exception 'lesson_not_in_course';
  end if;

  select count(*) into v_total_lessons
  from public.lms_lessons
  where course_id = p_course_id;

  if v_total_lessons = 0 then
    raise exception 'course_has_no_lessons';
  end if;

  select coalesce(completed_lesson_ids, '{}'::uuid[]), coalesce(total_time_minutes, 0)
  into v_completed, v_existing_time
  from public.lms_course_progress
  where user_id = v_user
    and course_id = p_course_id
  limit 1
  for update;

  if not found then
    v_completed := '{}'::uuid[];
    v_existing_time := 0;
  end if;

  if p_completed then
    v_completed := (
      select coalesce(array_agg(distinct lesson_id), '{}'::uuid[])
      from (
        select unnest(v_completed) as lesson_id
        union
        select p_lesson_id
      ) as combined
    );
  else
    v_completed := array_remove(coalesce(v_completed, '{}'::uuid[]), p_lesson_id);
    if v_completed is null then
      v_completed := '{}'::uuid[];
    end if;
  end if;

  v_percent := round((cardinality(v_completed)::numeric / v_total_lessons) * 100.0, 2);

  insert into public.lms_course_progress (
    user_id,
    course_id,
    completed_lesson_ids,
    last_lesson_id,
    percent_complete,
    total_time_minutes,
    last_accessed
  )
  values (
    v_user,
    p_course_id,
    v_completed,
    p_lesson_id,
    least(100, greatest(0, v_percent)),
    v_existing_time + v_minutes,
    v_now
  )
  on conflict (user_id, course_id)
  do update set
    completed_lesson_ids = excluded.completed_lesson_ids,
    last_lesson_id = excluded.last_lesson_id,
    percent_complete = excluded.percent_complete,
    total_time_minutes = excluded.total_time_minutes,
    last_accessed = excluded.last_accessed,
    updated_at = v_now
  returning * into v_progress;

  return v_progress;
end;
$$;

grant execute on function public.record_lms_lesson_progress(uuid, uuid, boolean, integer, uuid) to authenticated;

grant execute on function public.record_lms_lesson_progress(uuid, uuid, boolean, integer, uuid) to service_role;

--------------------------------------------------------------------------------
create or replace function public.get_lms_quizzes(
  p_course_id uuid,
  p_user_id uuid default auth.uid()
)
returns table (
  id uuid,
  course_id uuid,
  lesson_id uuid,
  title text,
  description text,
  question_bank jsonb,
  passing_score integer,
  max_attempts integer,
  time_limit_minutes integer,
  is_published boolean,
  created_at timestamptz,
  updated_at timestamptz,
  stats jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    q.id,
    q.course_id,
    q.lesson_id,
    q.title,
    q.description,
    q.question_bank,
    q.passing_score,
    q.max_attempts,
    q.time_limit_minutes,
    q.is_published,
    q.created_at,
    q.updated_at,
    jsonb_build_object(
      'attempt_count', coalesce(a.attempt_count, 0),
      'best_score', a.best_score,
      'last_score', a.last_score,
      'last_attempt_at', a.last_attempt_at
    ) as stats
  from public.lms_quizzes q
  left join lateral (
    select
      count(*)::integer as attempt_count,
      max(score) as best_score,
      (array_agg(score order by completed_at desc))[1] as last_score,
      max(completed_at) as last_attempt_at
    from public.lms_quiz_attempts qa
    where qa.quiz_id = q.id
      and qa.user_id = coalesce(p_user_id, auth.uid())
  ) a on true
  where q.course_id = p_course_id
    and (q.is_published or lms_is_course_owner(q.course_id));
$$;

grant execute on function public.get_lms_quizzes(uuid, uuid) to authenticated;

grant execute on function public.get_lms_quizzes(uuid, uuid) to service_role;

--------------------------------------------------------------------------------
create or replace function public.submit_lms_quiz_attempt(
  p_quiz_id uuid,
  p_answers jsonb,
  p_time_spent_seconds integer default null,
  p_user_id uuid default auth.uid()
)
returns public.lms_quiz_attempts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_quiz public.lms_quizzes%rowtype;
  v_attempt_count integer := 0;
  v_attempt public.lms_quiz_attempts%rowtype;
  v_questions integer := 0;
  v_correct integer := 0;
  v_score integer := null;
  v_passed boolean := null;
  v_time_minutes integer := null;
  v_now timestamptz := timezone('utc', now());
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_quiz
  from public.lms_quizzes
  where id = p_quiz_id;

  if not found then
    raise exception 'quiz_not_found';
  end if;

  if not v_quiz.is_published and not lms_is_course_owner(v_quiz.course_id) then
    raise exception 'quiz_not_available';
  end if;

  select count(*) into v_attempt_count
  from public.lms_quiz_attempts
  where quiz_id = p_quiz_id
    and user_id = v_user;

  if v_quiz.max_attempts is not null and v_attempt_count >= v_quiz.max_attempts then
    raise exception 'quiz_attempt_limit_reached';
  end if;

  if p_time_spent_seconds is not null then
    v_time_minutes := greatest(0, p_time_spent_seconds) / 60;
  end if;

  if p_answers ? 'score' then
    begin
      v_score := (p_answers->>'score')::integer;
    exception
      when others then
        v_score := null;
    end;
  end if;

  if v_score is null and p_answers ? 'computed_score' then
    begin
      v_score := (p_answers->>'computed_score')::integer;
    exception
      when others then
        v_score := null;
    end;
  end if;

  if v_score is null and v_quiz.question_bank ? 'questions' then
    v_questions := jsonb_array_length(v_quiz.question_bank->'questions');
    if v_questions > 0 then
      v_correct := (
        select count(*)
        from jsonb_array_elements(coalesce(v_quiz.question_bank->'questions', '[]'::jsonb)) q(value)
        left join lateral (
          select value as response
          from jsonb_array_elements(coalesce(p_answers->'responses', '[]'::jsonb)) resp(value)
          where coalesce(resp.value->>'question_id', resp.value->>'questionId') = coalesce(q.value->>'id', q.value->>'questionId')
        ) resp on true
        where (
          (q.value ? 'correct' and resp.response ? 'selected_index' and (resp.response->>'selected_index')::integer = (q.value->>'correct')::integer)
          or (q.value ? 'correct_option' and resp.response ? 'selected_option' and resp.response->>'selected_option' = q.value->>'correct_option')
          or (q.value ? 'answer' and resp.response ? 'answer' and resp.response->>'answer' = q.value->>'answer')
        )
      );

      if v_questions > 0 then
        v_score := round((v_correct::numeric / v_questions) * 100)::integer;
      end if;
    end if;
  end if;

  if v_score is null then
    v_score := 0;
  end if;

  if v_quiz.passing_score is not null then
    v_passed := v_score >= v_quiz.passing_score;
  end if;

  insert into public.lms_quiz_attempts (
    quiz_id,
    user_id,
    answers,
    score,
    passed,
    attempt_number,
    time_spent_seconds,
    completed_at
  )
  values (
    p_quiz_id,
    v_user,
    coalesce(p_answers, '{}'::jsonb),
    v_score,
    v_passed,
    v_attempt_count + 1,
    p_time_spent_seconds,
    v_now
  )
  returning * into v_attempt;

  return v_attempt;
end;
$$;

grant execute on function public.submit_lms_quiz_attempt(uuid, jsonb, integer, uuid) to authenticated;

grant execute on function public.submit_lms_quiz_attempt(uuid, jsonb, integer, uuid) to service_role;

--------------------------------------------------------------------------------
create or replace function public.get_lms_quiz_attempts(
  p_quiz_id uuid,
  p_user_id uuid default auth.uid()
)
returns setof public.lms_quiz_attempts
language sql
security definer
set search_path = public
as $$
  select qa.*
  from public.lms_quiz_attempts qa
  where qa.quiz_id = p_quiz_id
    and (
      qa.user_id = coalesce(p_user_id, auth.uid())
      or exists (
        select 1
        from public.lms_quizzes q
        where q.id = qa.quiz_id
          and lms_is_course_owner(q.course_id)
      )
    )
  order by qa.completed_at desc;
$$;

grant execute on function public.get_lms_quiz_attempts(uuid, uuid) to authenticated;

grant execute on function public.get_lms_quiz_attempts(uuid, uuid) to service_role;

--------------------------------------------------------------------------------

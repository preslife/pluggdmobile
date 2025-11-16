-- LMS entitlement, pricing, and access control helpers

create table if not exists public.lms_course_pricing (
  course_id uuid primary key references public.lms_courses(id) on delete cascade,
  is_membership_only boolean default false,
  required_tier subscription_tier default 'free',
  one_time_price_cents integer,
  currency text default 'usd',
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint lms_course_pricing_positive_price check (one_time_price_cents is null or one_time_price_cents >= 0)
);

create table if not exists public.lms_course_purchases (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null,
  currency text default 'usd',
  purchase_reference text,
  purchased_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint lms_course_purchases_positive_amount check (amount_cents >= 0),
  unique (user_id, course_id)
);

create table if not exists public.lms_course_entitlements (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  grant_source text default 'manual',
  granted_at timestamptz not null default timezone('utc', now()),
  unique (course_id, user_id)
);

create index if not exists idx_lms_course_purchases_user_course on public.lms_course_purchases(user_id, course_id);
create index if not exists idx_lms_course_entitlements_user_course on public.lms_course_entitlements(user_id, course_id);

alter table public.lms_course_pricing enable row level security;
alter table public.lms_course_purchases enable row level security;
alter table public.lms_course_entitlements enable row level security;

drop policy if exists "Pricing visible to authenticated users"
  on public.lms_course_pricing;
create policy "Pricing visible to authenticated users"
  on public.lms_course_pricing
  for select
  using (true);

drop policy if exists "Course owners manage pricing"
  on public.lms_course_pricing;
create policy "Course owners manage pricing"
  on public.lms_course_pricing
  for all
  using (
    exists (
      select 1
      from public.lms_courses c
      where c.id = course_id
        and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "Learners view their purchases"
  on public.lms_course_purchases;
create policy "Learners view their purchases"
  on public.lms_course_purchases
  for select
  using (auth.uid() = user_id);

drop policy if exists "Learners insert their purchases"
  on public.lms_course_purchases;
create policy "Learners insert their purchases"
  on public.lms_course_purchases
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Course owners view related purchases"
  on public.lms_course_purchases;
create policy "Course owners view related purchases"
  on public.lms_course_purchases
  for select
  using (
    exists (
      select 1
      from public.lms_courses c
      where c.id = course_id
        and c.instructor_id = auth.uid()
    )
  );

drop policy if exists "Learners view their entitlements"
  on public.lms_course_entitlements;
create policy "Learners view their entitlements"
  on public.lms_course_entitlements
  for select
  using (auth.uid() = user_id);

drop policy if exists "Course owners manage entitlements"
  on public.lms_course_entitlements;
create policy "Course owners manage entitlements"
  on public.lms_course_entitlements
  for all
  using (
    exists (
      select 1
      from public.lms_courses c
      where c.id = course_id
        and c.instructor_id = auth.uid()
    )
  );

create or replace function public.subscription_tier_rank(p_tier subscription_tier)
returns integer
language sql
immutable
as $$
  select case p_tier
    when 'pro' then 3
    when 'creator' then 2
    else 1
  end;
$$;

create or replace function public.can_access_lms_course(
  p_course_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.lms_courses%rowtype;
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_pricing public.lms_course_pricing%rowtype;
  v_manual boolean := false;
  v_tier subscription_tier := 'free';
begin
  select * into v_course
  from public.lms_courses
  where id = p_course_id;

  if not found then
    return false;
  end if;

  if v_course.visibility = 'public' then
    return true;
  end if;

  if v_course.published_at is null then
    return v_user is not null and v_course.instructor_id = v_user;
  end if;

  if v_user is null then
    return false;
  end if;

  if v_course.instructor_id = v_user then
    return true;
  end if;

  select * into v_pricing
  from public.lms_course_pricing
  where course_id = p_course_id;

  select exists (
    select 1
    from public.lms_course_entitlements e
    where e.course_id = p_course_id
      and e.user_id = v_user
  ) into v_manual;

  if v_manual then
    return true;
  end if;

  if v_pricing is null then
    return true;
  end if;

  select public.get_user_tier(v_user) into v_tier;

  if v_pricing.required_tier is not null
     and public.subscription_tier_rank(v_tier) >= public.subscription_tier_rank(v_pricing.required_tier) then
    return true;
  end if;

  if coalesce(v_pricing.is_membership_only, false)
     and public.subscription_tier_rank(v_tier) >= public.subscription_tier_rank('creator') then
    return true;
  end if;

  if v_pricing.one_time_price_cents is null
     or v_pricing.one_time_price_cents <= 0 then
    return true;
  end if;

  if exists (
    select 1
    from public.lms_course_purchases p
    where p.course_id = p_course_id
      and p.user_id = v_user
  ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.set_lms_course_pricing(
  p_course_id uuid,
  p_is_membership_only boolean default false,
  p_required_tier subscription_tier default 'free',
  p_one_time_price_cents integer default null,
  p_currency text default 'usd',
  p_metadata jsonb default '{}'::jsonb
)
returns public.lms_course_pricing
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.lms_courses%rowtype;
  v_result public.lms_course_pricing%rowtype;
begin
  select * into v_course
  from public.lms_courses
  where id = p_course_id;

  if not found then
    raise exception 'course_not_found';
  end if;

  if v_course.instructor_id is distinct from auth.uid() then
    raise exception 'not_course_owner';
  end if;

  if p_one_time_price_cents is not null and p_one_time_price_cents < 0 then
    raise exception 'invalid_price';
  end if;

  insert into public.lms_course_pricing (
    course_id,
    is_membership_only,
    required_tier,
    one_time_price_cents,
    currency,
    metadata,
    updated_at
  )
  values (
    p_course_id,
    coalesce(p_is_membership_only, false),
    coalesce(p_required_tier, 'free'),
    p_one_time_price_cents,
    coalesce(nullif(p_currency, ''), 'usd'),
    coalesce(p_metadata, '{}'::jsonb),
    timezone('utc', now())
  )
  on conflict (course_id)
  do update set
    is_membership_only = excluded.is_membership_only,
    required_tier = excluded.required_tier,
    one_time_price_cents = excluded.one_time_price_cents,
    currency = excluded.currency,
    metadata = excluded.metadata,
    updated_at = excluded.updated_at
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.grant_lms_course_entitlement(
  p_course_id uuid,
  p_user_id uuid,
  p_source text default 'manual'
)
returns public.lms_course_entitlements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course public.lms_courses%rowtype;
  v_result public.lms_course_entitlements%rowtype;
begin
  if p_user_id is null then
    raise exception 'user_id_required';
  end if;

  select * into v_course
  from public.lms_courses
  where id = p_course_id;

  if not found then
    raise exception 'course_not_found';
  end if;

  if v_course.instructor_id is distinct from auth.uid() then
    raise exception 'not_course_owner';
  end if;

  insert into public.lms_course_entitlements (course_id, user_id, grant_source, granted_at)
  values (p_course_id, p_user_id, coalesce(nullif(p_source, ''), 'manual'), timezone('utc', now()))
  on conflict (course_id, user_id)
  do update set
    grant_source = excluded.grant_source,
    granted_at = excluded.granted_at
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.record_lms_course_purchase(
  p_course_id uuid,
  p_amount_cents integer,
  p_currency text default 'usd',
  p_reference text default null,
  p_user_id uuid default auth.uid()
)
returns public.lms_course_purchases
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_result public.lms_course_purchases%rowtype;
begin
  if v_user is null then
    raise exception 'not_authenticated';
  end if;

  if p_amount_cents is null or p_amount_cents < 0 then
    raise exception 'invalid_amount';
  end if;

  insert into public.lms_course_purchases (
    course_id,
    user_id,
    amount_cents,
    currency,
    purchase_reference,
    purchased_at,
    created_at
  )
  values (
    p_course_id,
    v_user,
    p_amount_cents,
    coalesce(nullif(p_currency, ''), 'usd'),
    p_reference,
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict (user_id, course_id)
  do update set
    amount_cents = excluded.amount_cents,
    currency = excluded.currency,
    purchase_reference = excluded.purchase_reference,
    purchased_at = excluded.purchased_at,
    created_at = excluded.created_at
  returning * into v_result;

  insert into public.lms_course_entitlements (course_id, user_id, grant_source, granted_at)
  values (p_course_id, v_user, 'purchase', timezone('utc', now()))
  on conflict (course_id, user_id) do nothing;

  return v_result;
end;
$$;

-- Creator membership App Store provisioning
--
-- Every approved creator owns one Apple subscription group. Each sellable tier
-- and billing period receives a unique App Store product inside that group.
-- This allows a fan to support many creators at once while Apple still enforces
-- one active tier within any single creator's group.

create table if not exists public.creator_membership_iap_catalogues (
  creator_profile_id uuid primary key references public.profiles(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending',
  reference_name text not null,
  locale text not null default 'en-GB',
  apple_group_id text,
  apple_group_state text,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint creator_membership_iap_catalogues_status_check check (
    status in ('pending', 'approved', 'suspended', 'retired')
  ),
  constraint creator_membership_iap_catalogues_reference_check check (
    length(trim(reference_name)) between 3 and 64
  ),
  constraint creator_membership_iap_catalogues_group_unique unique (apple_group_id)
);

create index if not exists creator_membership_iap_catalogues_creator_idx
  on public.creator_membership_iap_catalogues (creator_id, status);

alter table public.creator_membership_iap_catalogues enable row level security;
drop policy if exists "Creators view own membership IAP catalogue" on public.creator_membership_iap_catalogues;
create policy "Creators view own membership IAP catalogue"
  on public.creator_membership_iap_catalogues for select to authenticated
  using (creator_id = auth.uid());
drop policy if exists "Service role manages membership IAP catalogues" on public.creator_membership_iap_catalogues;
create policy "Service role manages membership IAP catalogues"
  on public.creator_membership_iap_catalogues for all to service_role
  using (true) with check (true);

create table if not exists public.membership_iap_provisioning_jobs (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references auth.users(id) on delete cascade,
  membership_tier_id uuid not null references public.membership_tiers(id) on delete cascade,
  billing_period text not null,
  desired_product_id text not null,
  status text not null default 'queued',
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  apple_group_id text,
  apple_subscription_id text,
  apple_state text,
  progress jsonb not null default '{}'::jsonb,
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_iap_provisioning_jobs_period_check check (
    billing_period in ('monthly', 'yearly')
  ),
  constraint membership_iap_provisioning_jobs_status_check check (
    status in (
      'queued', 'processing', 'pricing', 'awaiting_review', 'active',
      'blocked', 'failed', 'retired'
    )
  ),
  constraint membership_iap_provisioning_jobs_attempts_check check (attempts >= 0),
  constraint membership_iap_provisioning_jobs_product_unique unique (desired_product_id),
  constraint membership_iap_provisioning_jobs_tier_period_unique unique (
    membership_tier_id,
    billing_period
  )
);

create index if not exists membership_iap_provisioning_jobs_queue_idx
  on public.membership_iap_provisioning_jobs (status, next_attempt_at, created_at);
create index if not exists membership_iap_provisioning_jobs_creator_idx
  on public.membership_iap_provisioning_jobs (creator_id, status);

alter table public.membership_iap_provisioning_jobs enable row level security;
drop policy if exists "Creators view own membership IAP provisioning" on public.membership_iap_provisioning_jobs;
create policy "Creators view own membership IAP provisioning"
  on public.membership_iap_provisioning_jobs for select to authenticated
  using (creator_id = auth.uid());
drop policy if exists "Service role manages membership IAP provisioning" on public.membership_iap_provisioning_jobs;
create policy "Service role manages membership IAP provisioning"
  on public.membership_iap_provisioning_jobs for all to service_role
  using (true) with check (true);

alter table public.membership_iap_products
  add column if not exists apple_subscription_id text,
  add column if not exists apple_state text,
  add column if not exists provisioning_job_id uuid references public.membership_iap_provisioning_jobs(id) on delete set null,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_error text;

create unique index if not exists membership_iap_products_apple_subscription_idx
  on public.membership_iap_products (apple_subscription_id)
  where apple_subscription_id is not null;

create or replace function public.membership_iap_product_identifier(
  p_creator_profile_id uuid,
  p_tier_id uuid,
  p_billing_period text
)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select 'com.pluggd.membership.p'
    || left(replace(p_creator_profile_id::text, '-', ''), 12)
    || '.t'
    || left(replace(p_tier_id::text, '-', ''), 12)
    || case p_billing_period when 'yearly' then '.yearly' else '.monthly' end;
$$;

create or replace function public.queue_creator_membership_iap(
  p_creator_profile_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_catalogue public.creator_membership_iap_catalogues%rowtype;
  v_count integer := 0;
  v_tier record;
  v_period text;
  v_product_id text;
begin
  select * into v_catalogue
  from public.creator_membership_iap_catalogues
  where creator_profile_id = p_creator_profile_id
  for update;

  if not found or v_catalogue.status <> 'approved' then
    return 0;
  end if;

  for v_tier in
    select id, price_monthly, price_yearly
    from public.membership_tiers
    where owner_type = 'profile'
      and owner_id = p_creator_profile_id
      and status = 'active'
      and (price_monthly is not null or price_yearly is not null)
    order by tier_order asc, created_at asc
  loop
    foreach v_period in array array['monthly', 'yearly']::text[]
    loop
      if (v_period = 'monthly' and v_tier.price_monthly is null)
        or (v_period = 'yearly' and v_tier.price_yearly is null) then
        continue;
      end if;

      select coalesce(
        (
          select product.product_id
          from public.membership_iap_products product
          where product.membership_tier_id = v_tier.id
            and product.billing_period = v_period
            and product.status <> 'retired'
          order by product.created_at asc
          limit 1
        ),
        public.membership_iap_product_identifier(
          p_creator_profile_id,
          v_tier.id,
          v_period
        )
      ) into v_product_id;

      insert into public.membership_iap_provisioning_jobs (
        creator_profile_id,
        creator_id,
        membership_tier_id,
        billing_period,
        desired_product_id,
        status,
        next_attempt_at,
        last_error,
        completed_at
      ) values (
        p_creator_profile_id,
        v_catalogue.creator_id,
        v_tier.id,
        v_period,
        v_product_id,
        'queued',
        now(),
        null,
        null
      )
      on conflict (membership_tier_id, billing_period) do update
      set creator_profile_id = excluded.creator_profile_id,
          creator_id = excluded.creator_id,
          desired_product_id = excluded.desired_product_id,
          status = case
            when membership_iap_provisioning_jobs.status = 'active' then 'active'
            else 'queued'
          end,
          next_attempt_at = case
            when membership_iap_provisioning_jobs.status = 'active'
              then membership_iap_provisioning_jobs.next_attempt_at
            else now()
          end,
          last_error = case
            when membership_iap_provisioning_jobs.status = 'active'
              then membership_iap_provisioning_jobs.last_error
            else null
          end,
          updated_at = now();

      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.queue_creator_membership_iap(uuid) from public, anon, authenticated;
grant execute on function public.queue_creator_membership_iap(uuid) to service_role;

create or replace function public.approve_creator_membership_iap(
  p_creator_profile_id uuid,
  p_approved_by uuid default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles%rowtype;
  v_reference_name text;
begin
  select * into v_profile
  from public.profiles
  where id = p_creator_profile_id
  for update;

  if not found then
    raise exception 'Creator profile not found';
  end if;
  if coalesce(v_profile.is_creator, false) is not true
    or coalesce(v_profile.is_verified, false) is not true
    or coalesce(v_profile.verification_status, '') <> 'approved' then
    raise exception 'Creator must be verified and approved before memberships can be provisioned';
  end if;

  v_reference_name := left(
    coalesce(nullif(trim(v_profile.full_name), ''), nullif(trim(v_profile.username), ''), 'Creator')
      || ' Memberships · '
      || left(replace(v_profile.id::text, '-', ''), 8),
    64
  );

  insert into public.creator_membership_iap_catalogues (
    creator_profile_id,
    creator_id,
    status,
    reference_name,
    approved_at,
    approved_by,
    last_error
  ) values (
    v_profile.id,
    v_profile.user_id,
    'approved',
    v_reference_name,
    now(),
    p_approved_by,
    null
  )
  on conflict (creator_profile_id) do update
  set creator_id = excluded.creator_id,
      status = 'approved',
      reference_name = excluded.reference_name,
      approved_at = now(),
      approved_by = excluded.approved_by,
      last_error = null,
      updated_at = now();

  return public.queue_creator_membership_iap(p_creator_profile_id);
end;
$$;

revoke all on function public.approve_creator_membership_iap(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_creator_membership_iap(uuid, uuid) to service_role;

create or replace function public.claim_membership_iap_provisioning_jobs(
  p_limit integer,
  p_worker_id text
)
returns setof public.membership_iap_provisioning_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select id
    from public.membership_iap_provisioning_jobs
    where status in ('queued', 'pricing')
      and next_attempt_at <= now()
      and attempts < 8
    order by next_attempt_at asc, created_at asc
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 1), 10))
  )
  update public.membership_iap_provisioning_jobs job
  set status = 'processing',
      attempts = job.attempts + 1,
      locked_at = now(),
      locked_by = left(coalesce(nullif(p_worker_id, ''), 'worker'), 120),
      updated_at = now()
  from candidates
  where job.id = candidates.id
  returning job.*;
end;
$$;

revoke all on function public.claim_membership_iap_provisioning_jobs(integer, text) from public, anon, authenticated;
grant execute on function public.claim_membership_iap_provisioning_jobs(integer, text) to service_role;

create or replace function public.enqueue_changed_membership_tier_iap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_type = 'profile'
    and new.status = 'active'
    and (new.price_monthly is not null or new.price_yearly is not null)
    and exists (
      select 1
      from public.creator_membership_iap_catalogues catalogue
      where catalogue.creator_profile_id = new.owner_id
        and catalogue.status = 'approved'
    ) then
    perform public.queue_creator_membership_iap(new.owner_id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_changed_membership_tier_iap on public.membership_tiers;
create trigger trg_enqueue_changed_membership_tier_iap
  after insert or update of name, description, price_monthly, price_yearly, currency, status, tier_order
  on public.membership_tiers
  for each row execute function public.enqueue_changed_membership_tier_iap();

create or replace function public.sync_verified_creator_membership_iap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.is_creator, false) is true
    and coalesce(new.is_verified, false) is true
    and coalesce(new.verification_status, '') = 'approved' then
    if tg_op = 'INSERT'
      or coalesce(old.is_verified, false) is distinct from true
      or coalesce(old.verification_status, '') is distinct from 'approved' then
      perform public.approve_creator_membership_iap(new.id, null);
    end if;
  elsif tg_op = 'UPDATE'
    and (
      coalesce(old.is_verified, false) is true
      or coalesce(old.verification_status, '') = 'approved'
    ) then
    update public.creator_membership_iap_catalogues
    set status = 'suspended',
        last_error = 'Creator verification is no longer approved',
        updated_at = now()
    where creator_profile_id = new.id;

    update public.membership_iap_products
    set status = 'inactive',
        last_error = 'Creator verification is no longer approved',
        updated_at = now()
    where creator_id = new.user_id
      and status in ('provisioned', 'active');

    update public.membership_iap_provisioning_jobs
    set status = 'blocked',
        last_error = 'Creator verification is no longer approved',
        locked_at = null,
        locked_by = null,
        updated_at = now()
    where creator_profile_id = new.id
      and status in ('queued', 'processing', 'pricing');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_verified_creator_membership_iap on public.profiles;
create trigger trg_sync_verified_creator_membership_iap
  after insert or update of is_creator, is_verified, verification_status
  on public.profiles
  for each row execute function public.sync_verified_creator_membership_iap();

revoke all on table public.creator_membership_iap_catalogues from public, anon;
grant select on table public.creator_membership_iap_catalogues to authenticated;
grant all on table public.creator_membership_iap_catalogues to service_role;
revoke all on table public.membership_iap_provisioning_jobs from public, anon;
grant select on table public.membership_iap_provisioning_jobs to authenticated;
grant all on table public.membership_iap_provisioning_jobs to service_role;

comment on table public.creator_membership_iap_catalogues is
  'One Apple subscription group per approved creator; never a shared creator SKU.';
comment on table public.membership_iap_provisioning_jobs is
  'Idempotent queue for creator-specific subscription groups, tier products, pricing and review readiness.';

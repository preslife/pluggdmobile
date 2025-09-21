-- =========================
-- Labels & Team Schema (sync)
-- Safe to run multiple times
-- =========================

-- Helper used by triggers (safe to re-run)
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Enums ----------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'label_member_role') then
    create type public.label_member_role as enum ('owner','admin','editor','viewer');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'managed_profile_role') then
    create type public.managed_profile_role as enum ('primary','distribution_only');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'managed_profile_status') then
    create type public.managed_profile_status as enum ('pending','active','removed');
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'label_deletion_type') then
    create type public.label_deletion_type as enum ('downgrade','delete');
  end if;
end $$;

-- Tables ---------------------------------------------------------------------
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,}$'),
  name text not null,
  logo_url text,
  cover_image_url text,
  genre text,
  contact_email text,
  country text,
  owner_user_id uuid references auth.users(id),
  created_by_admin boolean not null default false,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_labels_owner on public.labels(owner_user_id);

create table if not exists public.label_members (
  id uuid primary key default gen_random_uuid(),
  label_id uuid not null references public.labels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.label_member_role not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (label_id, user_id)
);

create index if not exists idx_label_members_role
  on public.label_members(label_id, role);

create table if not exists public.label_invitations (
  id uuid primary key default gen_random_uuid(),
  label_id uuid not null references public.labels(id) on delete cascade,
  email text not null,
  role public.label_member_role not null default 'viewer',
  token text not null unique,
  expires_at timestamptz not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_label_invitations_label on public.label_invitations(label_id);
create index if not exists idx_label_invitations_email on public.label_invitations(lower(email));

create table if not exists public.managed_profiles (
  id uuid primary key default gen_random_uuid(),
  label_id uuid not null references public.labels(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.managed_profile_role not null default 'primary',
  status public.managed_profile_status not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (label_id, profile_id)
);

create index if not exists idx_managed_profiles_status
  on public.managed_profiles(status);

create table if not exists public.ownership_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  label_id uuid not null references public.labels(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid references auth.users(id) on delete set null,
  to_email text,
  token text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_transfer_requests_label on public.ownership_transfer_requests(label_id);
create index if not exists idx_transfer_requests_to_user on public.ownership_transfer_requests(to_user_id);

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  label_id uuid not null references public.labels(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  type public.label_deletion_type not null,
  payload_json jsonb not null default '{}'::jsonb,
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_deletion_requests_label on public.deletion_requests(label_id);

create table if not exists public.label_stripe_accounts (
  label_id uuid primary key references public.labels(id) on delete cascade,
  stripe_account_id text,
  onboarding_complete boolean default false,
  requirements jsonb default '{}'::jsonb,
  capabilities jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Triggers -------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_labels_updated_at') then
    create trigger trg_labels_updated_at
    before update on public.labels
    for each row execute function public.update_updated_at_column();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'trg_label_stripe_accounts_updated_at') then
    create trigger trg_label_stripe_accounts_updated_at
    before update on public.label_stripe_accounts
    for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- RLS ------------------------------------------------------------------------
alter table public.labels enable row level security;
alter table public.label_members enable row level security;
alter table public.label_invitations enable row level security;
alter table public.managed_profiles enable row level security;
alter table public.ownership_transfer_requests enable row level security;
alter table public.deletion_requests enable row level security;
alter table public.label_stripe_accounts enable row level security;

-- Remove legacy label policies if present (no-op if missing)
drop policy if exists labels_select_public  on public.labels;
drop policy if exists labels_insert_owner   on public.labels;
drop policy if exists labels_update_owner   on public.labels;
drop policy if exists labels_delete_owner   on public.labels;

-- Labels policies
create policy if not exists labels_public_select on public.labels
  for select using (true);

create policy if not exists labels_owner_insert on public.labels
  for insert with check (auth.uid() = owner_user_id);

create policy if not exists labels_owner_update on public.labels
  for update
  using (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.label_members lm
      where lm.label_id = labels.id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
  )
  with check (
    auth.uid() = owner_user_id
    or exists (
      select 1 from public.label_members lm
      where lm.label_id = labels.id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
  );

-- Label members policies
create policy if not exists label_members_select on public.label_members
  for select using (
    auth.uid() = user_id
    or exists (
      select 1 from public.label_members lm2
      where lm2.label_id = label_members.label_id
        and lm2.user_id = auth.uid()
        and lm2.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_members.label_id
        and l.owner_user_id = auth.uid()
    )
  );

create policy if not exists label_members_manage on public.label_members
  for all
  using (
    exists (
      select 1 from public.label_members lm2
      where lm2.label_id = label_members.label_id
        and lm2.user_id = auth.uid()
        and lm2.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_members.label_id
        and l.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.label_members lm2
      where lm2.label_id = label_members.label_id
        and lm2.user_id = auth.uid()
        and lm2.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_members.label_id
        and l.owner_user_id = auth.uid()
    )
  );

-- Label invitations policies
create policy if not exists label_invitations_select on public.label_invitations
  for select using (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = label_invitations.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_invitations.label_id
        and l.owner_user_id = auth.uid()
    )
  );

create policy if not exists label_invitations_manage on public.label_invitations
  for all
  using (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = label_invitations.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_invitations.label_id
        and l.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = label_invitations.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_invitations.label_id
        and l.owner_user_id = auth.uid()
    )
  );

-- Managed profiles policies
create policy if not exists managed_profiles_select on public.managed_profiles
  for select using (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = managed_profiles.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin','editor')
    )
    or exists (
      select 1 from public.profiles p
      where p.id = managed_profiles.profile_id
        and p.user_id = auth.uid()
    )
  );

create policy if not exists managed_profiles_manage on public.managed_profiles
  for all
  using (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = managed_profiles.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin','editor')
    )
  )
  with check (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = managed_profiles.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin','editor')
    )
  );

-- Ownership transfer policies
create policy if not exists transfer_requests_select on public.ownership_transfer_requests
  for select using (
    from_user_id = auth.uid()
    or to_user_id = auth.uid()
    or exists (
      select 1 from public.label_members lm
      where lm.label_id = ownership_transfer_requests.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
  );

create policy if not exists transfer_requests_manage on public.ownership_transfer_requests
  for all
  using (
    from_user_id = auth.uid()
    or exists (
      select 1 from public.label_members lm
      where lm.label_id = ownership_transfer_requests.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner')
    )
  )
  with check (
    from_user_id = auth.uid()
    or exists (
      select 1 from public.label_members lm
      where lm.label_id = ownership_transfer_requests.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner')
    )
  );

-- Deletion requests policies
create policy if not exists deletion_requests_select on public.deletion_requests
  for select using (
    requested_by = auth.uid()
    or exists (
      select 1 from public.label_members lm
      where lm.label_id = deletion_requests.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
  );

create policy if not exists deletion_requests_manage on public.deletion_requests
  for all
  using (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = deletion_requests.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = deletion_requests.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
  );

-- Label stripe account policies
create policy if not exists label_stripe_accounts_select on public.label_stripe_accounts
  for select using (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = label_stripe_accounts.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_stripe_accounts.label_id
        and l.owner_user_id = auth.uid()
    )
  );

create policy if not exists label_stripe_accounts_manage on public.label_stripe_accounts
  for all
  using (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = label_stripe_accounts.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_stripe_accounts.label_id
        and l.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.label_members lm
      where lm.label_id = label_stripe_accounts.label_id
        and lm.user_id = auth.uid()
        and lm.role::text in ('owner','admin')
    )
    or exists (
      select 1 from public.labels l
      where l.id = label_stripe_accounts.label_id
        and l.owner_user_id = auth.uid()
    )
  );

-- absorb Studio auto-LIMIT if appended
select 1;

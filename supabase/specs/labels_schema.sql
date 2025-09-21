-- Labels/Teams Schema Draft (idempotent-safe where possible)
-- NOTE: Run with a service role. Adjust FK targets to your actual schema if needed.

-- Dependencies
create extension if not exists pgcrypto;

-- Enums
do $$ begin
  if not exists (select 1 from pg_type where typname = 'label_role') then
    create type label_role as enum ('owner','admin','editor','viewer');
  end if;
end $$;

-- Utility: updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

-- Table: labels
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  cover_image_url text,
  genre text,
  contact_email text,
  country text,
  owner_user_id uuid references auth.users(id) on delete set null,
  created_by_admin boolean not null default false,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint labels_slug_chk check (slug ~ '^[a-z0-9-]{3,}$')
);

drop trigger if exists trg_labels_updated_at on public.labels;
create trigger trg_labels_updated_at before update on public.labels
for each row execute function public.set_updated_at();

-- Table: label_members
create table if not exists public.label_members (
  label_id uuid not null references public.labels(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role label_role not null default 'viewer',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (label_id, user_id)
);

-- Table: label_invitations
create table if not exists public.label_invitations (
  id uuid primary key default gen_random_uuid(),
  label_id uuid not null references public.labels(id) on delete cascade,
  email text not null,
  role label_role not null default 'viewer',
  token text unique not null,
  expires_at timestamptz not null,
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Table: ownership_transfer_requests
create table if not exists public.ownership_transfer_requests (
  id uuid primary key default gen_random_uuid(),
  label_id uuid not null references public.labels(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid references auth.users(id) on delete set null,
  to_email text,
  token text unique not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint otr_target_chk check ((to_user_id is not null) or (to_email is not null))
);

-- Table: deletion_requests
do $$ begin
  if not exists (select 1 from pg_type where typname = 'label_delete_type') then
    create type label_delete_type as enum ('downgrade','delete');
  end if;
end $$;

create table if not exists public.deletion_requests (
  id uuid primary key default gen_random_uuid(),
  label_id uuid not null references public.labels(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  type label_delete_type not null,
  payload_json jsonb not null default '{}',
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Indexes (performance)
create index if not exists idx_labels_slug on public.labels(slug);
create index if not exists idx_label_members_user on public.label_members(user_id);
create index if not exists idx_label_members_label on public.label_members(label_id);
create index if not exists idx_label_invites_label on public.label_invitations(label_id);
create index if not exists idx_otr_label on public.ownership_transfer_requests(label_id);
create index if not exists idx_delreq_label on public.deletion_requests(label_id);



-- App Store release contracts: age-aware safety, portable exports, account deletion
-- audit, and a quarantine path for user-generated content.

create table if not exists public.account_safety_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  age_band text check (age_band in ('under_16', '16_plus', '18_plus')),
  sensitive_content_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_safety_settings enable row level security;

drop policy if exists "Users manage their own safety settings" on public.account_safety_settings;
create policy "Users manage their own safety settings"
  on public.account_safety_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.seed_account_safety_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.account_safety_settings (user_id, age_band)
  values (
    new.id,
    case
      when new.raw_user_meta_data ->> 'age_band' in ('under_16', '16_plus', '18_plus')
        then new.raw_user_meta_data ->> 'age_band'
      else null
    end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_seed_safety on auth.users;
create trigger on_auth_user_seed_safety
  after insert on auth.users
  for each row execute function public.seed_account_safety_settings();

insert into public.account_safety_settings (user_id, age_band)
select id, null from auth.users
on conflict (user_id) do nothing;

create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'requested'
    check (status in ('requested', 'processing', 'ready', 'failed', 'expired')),
  object_path text,
  expires_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.data_export_requests enable row level security;
drop policy if exists "Users view their own export requests" on public.data_export_requests;
create policy "Users view their own export requests"
  on public.data_export_requests for select using (auth.uid() = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-data-exports',
  'user-data-exports',
  false,
  52428800,
  array['application/json', 'application/zip']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit)
values ('ugc-quarantine', 'ugc-quarantine', false, 104857600)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

drop policy if exists "Users upload to their quarantine folder" on storage.objects;
create policy "Users upload to their quarantine folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ugc-quarantine'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users view their quarantine submissions" on storage.objects;
create policy "Users view their quarantine submissions"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ugc-quarantine'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create table if not exists public.account_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  status text not null default 'completed'
    check (status in ('completed', 'partial', 'failed')),
  retained_categories text[] not null default
    array['financial transaction records', 'fraud and safety records'],
  created_at timestamptz not null default now()
);

alter table public.account_deletion_audit enable row level security;

-- Financial records may need to be retained for accounting, refund, and fraud
-- obligations, but they must no longer identify the deleted App Store account.
alter table public.iap_transactions
  add column if not exists account_hash text;

alter table public.iap_transactions
  alter column user_id drop not null;

alter table public.iap_transactions
  drop constraint if exists iap_transactions_user_id_fkey;

alter table public.iap_transactions
  add constraint iap_transactions_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;

create index if not exists iap_transactions_account_hash_idx
  on public.iap_transactions (account_hash, created_at desc);

create table if not exists public.ugc_moderation_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_kind text not null,
  text_content text,
  media_urls text[] not null default '{}',
  destination jsonb,
  decision text not null check (decision in ('review', 'rejected')),
  reason_codes text[] not null default '{}',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id) on delete set null
);

alter table public.ugc_moderation_submissions enable row level security;
drop policy if exists "Users view their own moderation submissions" on public.ugc_moderation_submissions;
create policy "Users view their own moderation submissions"
  on public.ugc_moderation_submissions for select using (auth.uid() = user_id);

create index if not exists account_safety_age_band_idx
  on public.account_safety_settings (age_band);
create index if not exists data_export_requests_user_created_idx
  on public.data_export_requests (user_id, created_at desc);
create index if not exists ugc_moderation_pending_idx
  on public.ugc_moderation_submissions (status, created_at);

-- Stories are first-class reportable UGC in the iPhone app.
alter table public.content_reports
  drop constraint if exists content_reports_target_type_check;
alter table public.content_reports
  add constraint content_reports_target_type_check
    check (target_type in ('release', 'beat', 'post', 'profile', 'comment', 'blog_post', 'story'));

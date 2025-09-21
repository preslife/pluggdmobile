-- SESSION ROOMS
create table if not exists public.session_rooms (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(user_id) on delete cascade,
  title text not null,
  status text not null default 'idle' check (status in ('idle','live','ended')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);

create table if not exists public.session_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.session_rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  role text not null default 'collaborator' check (role in ('host','collaborator','viewer')),
  joined_at timestamptz not null default now(),
  left_at timestamptz
);

create table if not exists public.session_files (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.session_rooms(id) on delete cascade,
  uploader_id uuid not null references public.profiles(user_id),
  file_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.session_rooms(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.session_feedback (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.session_rooms(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id),
  timestamp_ms integer not null default 0,
  comment text not null,
  created_at timestamptz not null default now()
);

-- OAUTH CONNECTIONS
create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  provider text not null check (provider in ('instagram','tiktok','youtube','twitter','gmail','mailchimp','sendgrid')),
  display_name text,
  account_id text,
  scopes text[],
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- INBOX (normalized minimal)
create table if not exists public.unified_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  provider text not null,
  thread_id text,
  message_id text,
  author_handle text,
  author_name text,
  snippet text,
  permalink text,
  created_at timestamptz not null default now(),
  is_read boolean not null default false,
  is_starred boolean not null default false
);

-- OUTBOX (cross-post log)
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null,
  media_paths text[] default '{}',
  destinations text[] not null,
  scheduled_at timestamptz,
  status text not null default 'queued' check (status in ('queued','posted','failed','cancelled')),
  provider_message_ids jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.session_rooms enable row level security;
alter table public.session_participants enable row level security;
alter table public.session_files enable row level security;
alter table public.session_notes enable row level security;
alter table public.session_feedback enable row level security;
alter table public.social_connections enable row level security;
alter table public.unified_inbox enable row level security;
alter table public.social_posts enable row level security;

-- Session Rooms Policies
create policy rooms_read on public.session_rooms for select using (true);

create policy rooms_host_write on public.session_rooms for all
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- Session Participants Policies  
create policy parts_read on public.session_participants for select using (
  exists (select 1 from public.session_rooms r where r.id = room_id and (r.host_id = auth.uid() or exists (
    select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid()
  )))
);

create policy parts_write on public.session_participants for all using (
  exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
) with check (
  exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
);

-- Session Files Policies
create policy files_access on public.session_files for all using (
  exists (select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid())
  or exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
) with check (
  exists (select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid())
  or exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
);

-- Session Notes Policies
create policy notes_access on public.session_notes for all using (
  exists (select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid())
  or exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
) with check (true);

-- Session Feedback Policies
create policy feedback_access on public.session_feedback for all using (
  exists (select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid())
  or exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
) with check (true);

-- Social Connections Policies
create policy conn_owner on public.social_connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Unified Inbox Policies
create policy inbox_owner on public.unified_inbox for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Social Posts Policies
create policy posts_owner on public.social_posts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Create session-files storage bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('session-files', 'session-files', false)
on conflict (id) do nothing;
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id),
  locale_settings jsonb default '{}'::jsonb
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  created_at timestamptz default now(),
  dismissed_at timestamptz,
  payload jsonb default '{}'::jsonb
);

create table if not exists public.streaming_sessions (
  user_id uuid,
  session_start timestamptz,
  total_tracks_played integer,
  total_duration integer,
  unique_tracks integer,
  device_info jsonb,
  quality_settings jsonb
);

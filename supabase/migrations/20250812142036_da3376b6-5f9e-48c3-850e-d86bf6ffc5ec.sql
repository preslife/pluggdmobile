
-- Enable UUID generator if not already available
create extension if not exists "pgcrypto";

-- 1) Sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null,
  title text not null,
  description text null,
  status text not null default 'live' check (status in ('scheduled','live','ended')),
  is_public boolean not null default true,
  scheduled_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

-- Host can create sessions
drop policy if exists "Hosts can create sessions" on public.sessions;
create policy "Hosts can create sessions"
  on public.sessions for insert
  with check (auth.uid() = host_id);

-- Public sessions viewable by everyone
drop policy if exists "Public sessions are viewable" on public.sessions;
create policy "Public sessions are viewable"
  on public.sessions for select
  using (is_public = true);

-- Hosts and members can view private sessions
drop policy if exists "Hosts and members can view sessions" on public.sessions;
create policy "Hosts and members can view sessions"
  on public.sessions for select
  using (
    (host_id = auth.uid())
    or exists (
      select 1 from public.session_members sm
      where sm.session_id = sessions.id
        and sm.user_id = auth.uid()
    )
  );

-- Only host can update/delete their session
drop policy if exists "Host can update own session" on public.sessions;
create policy "Host can update own session"
  on public.sessions for update
  using (host_id = auth.uid());

drop policy if exists "Host can delete own session" on public.sessions;
create policy "Host can delete own session"
  on public.sessions for delete
  using (host_id = auth.uid());

-- Keep updated_at fresh
drop trigger if exists set_sessions_updated_at on public.sessions;
create trigger set_sessions_updated_at
  before update on public.sessions
  for each row
  execute procedure public.update_updated_at_column();

-- Helpful index
create index if not exists sessions_created_at_idx on public.sessions (created_at desc);


-- 2) Session notes (1 row per session, shared)
create table if not exists public.session_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  content text not null default '',
  updated_by uuid not null,
  updated_at timestamptz not null default now(),
  unique (session_id)
);

alter table public.session_notes enable row level security;

-- Members and host can read notes
drop policy if exists "Members and host can read notes" on public.session_notes;
create policy "Members and host can read notes"
  on public.session_notes for select
  using (
    exists (
      select 1 from public.sessions s
      left join public.session_members sm
        on sm.session_id = s.id and sm.user_id = auth.uid()
      where s.id = session_notes.session_id
        and (s.host_id = auth.uid() or sm.user_id is not null or s.is_public = true)
    )
  );

-- Members and host can create notes (upsert path)
drop policy if exists "Members and host can create notes" on public.session_notes;
create policy "Members and host can create notes"
  on public.session_notes for insert
  with check (
    (updated_by = auth.uid()) and
    exists (
      select 1 from public.sessions s
      left join public.session_members sm
        on sm.session_id = s.id and sm.user_id = auth.uid()
      where s.id = session_notes.session_id
        and (s.host_id = auth.uid() or sm.user_id is not null)
    )
  );

-- Members and host can update notes; ensure updated_by reflects the editor
drop policy if exists "Members and host can update notes" on public.session_notes;
create policy "Members and host can update notes"
  on public.session_notes for update
  using (
    exists (
      select 1 from public.sessions s
      left join public.session_members sm
        on sm.session_id = s.id and sm.user_id = auth.uid()
      where s.id = session_notes.session_id
        and (s.host_id = auth.uid() or sm.user_id is not null)
    )
  )
  with check (updated_by = auth.uid());

-- Host can delete notes if needed
drop policy if exists "Host can delete notes" on public.session_notes;
create policy "Host can delete notes"
  on public.session_notes for delete
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_notes.session_id
        and s.host_id = auth.uid()
    )
  );

-- Keep updated_at fresh
drop trigger if exists set_session_notes_updated_at on public.session_notes;
create trigger set_session_notes_updated_at
  before update on public.session_notes
  for each row
  execute procedure public.update_updated_at_column();


-- 3) Ensure realtime for live chat (session_messages)
-- Make sure row images are replicated for realtime
alter table if exists public.session_messages replica identity full;

-- Safely add to supabase_realtime publication if not already there
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.session_messages';
  exception
    when duplicate_object then null;
  end;
end $$;


-- 4) Storage RLS for session-files bucket
-- Convention: store files under "<session_id>/<filename>"
-- Policies allow session host or any member to read/write/delete

-- Allow members/host to upload into session folder
drop policy if exists "Session members can upload session files" on storage.objects;
create policy "Session members can upload session files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'session-files'
  and exists (
    select 1 from public.sessions s
    left join public.session_members sm
      on sm.session_id = s.id and sm.user_id = auth.uid()
    where s.id = split_part(name, '/', 1)::uuid
      and (s.host_id = auth.uid() or sm.user_id is not null)
  )
);

-- Allow members/host to read files in session folder
drop policy if exists "Session members can read session files" on storage.objects;
create policy "Session members can read session files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'session-files'
  and exists (
    select 1 from public.sessions s
    left join public.session_members sm
      on sm.session_id = s.id and sm.user_id = auth.uid()
    where s.id = split_part(name, '/', 1)::uuid
      and (s.host_id = auth.uid() or sm.user_id is not null or s.is_public = true)
  )
);

-- Allow file owner or host to delete files
drop policy if exists "Owner or host can delete session files" on storage.objects;
create policy "Owner or host can delete session files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'session-files'
  and (
    owner = auth.uid()
    or exists (
      select 1 from public.sessions s
      where s.id = split_part(name, '/', 1)::uuid
        and s.host_id = auth.uid()
    )
  )
);

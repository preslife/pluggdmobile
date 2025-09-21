
-- Finalize Live Session enhancements: schema alignment, RLS, and realtime

-- 1) SESSION_FEEDBACK schema alignment
-- - Migrate legacy columns to the ones used by the frontend hook
-- - Ensure indexes and correct RLS
-- - Ensure reliable realtime

-- Add target columns if missing
alter table if exists public.session_feedback
  add column if not exists content text,
  add column if not exists timecode_seconds integer;

-- Migrate legacy "comment" -> "content" and "timestamp_sec" -> "timecode_seconds"
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='session_feedback' and column_name='comment'
  ) then
    execute $mig$
      update public.session_feedback
      set content = coalesce(content, comment)
      where comment is not null and (content is null or content = '')
    $mig$;
    execute 'alter table public.session_feedback drop column if exists comment';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='session_feedback' and column_name='timestamp_sec'
  ) then
    execute $mig$
      update public.session_feedback
      set timecode_seconds = coalesce(timecode_seconds, floor(timestamp_sec)::int)
      where timestamp_sec is not null and timecode_seconds is null
    $mig$;
    execute 'alter table public.session_feedback drop column if exists timestamp_sec';
  end if;
end $$;

-- Drop unused columns if they exist
alter table if exists public.session_feedback
  drop column if exists target_file_id,
  drop column if exists target_audio_url;

-- Index for efficient loading and ordering
create index if not exists idx_session_feedback_session_created_at
  on public.session_feedback (session_id, created_at desc);

-- RLS: ensure it is enabled
alter table if exists public.session_feedback enable row level security;

-- Reset session_feedback policies to match app behavior
drop policy if exists "Members can view feedback" on public.session_feedback;
drop policy if exists "Members can add feedback" on public.session_feedback;
drop policy if exists "Owners or host can delete feedback" on public.session_feedback;

create policy "Members can view feedback"
  on public.session_feedback
  for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_feedback.session_id
        and (
          s.host_id = auth.uid()
          or exists (
            select 1 from public.session_members sm
            where sm.session_id = s.id and sm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Members can add feedback"
  on public.session_feedback
  for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.sessions s
      where s.id = session_feedback.session_id
        and s.status <> 'ended'
        and (
          s.host_id = auth.uid()
          or exists (
            select 1 from public.session_members sm
            where sm.session_id = s.id and sm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Owners or host can delete feedback"
  on public.session_feedback
  for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.sessions s
      where s.id = session_feedback.session_id and s.host_id = auth.uid()
    )
  );

-- Realtime reliability for feedback
alter table if exists public.session_feedback replica identity full;
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.session_feedback';
  exception
    when duplicate_object then null;
  end;
end $$;

--------------------------------------------------------------------------------

-- 2) SESSION_NOTES structure and policies
-- - Make session_id the primary key (one row per session)
-- - Enforce FK and cascade
-- - Align RLS with frontend and close sessions when ended
-- - Ensure reliable realtime

-- If the table was created with an "id" primary key, migrate to session_id as PK
-- a) Drop PK on id and the unique(session_id) if present
alter table if exists public.session_notes drop constraint if exists session_notes_pkey;
alter table if exists public.session_notes drop constraint if exists session_notes_session_id_key;

-- b) Drop the "id" column if it exists
alter table if exists public.session_notes drop column if exists id;

-- c) Add FK on session_id if missing
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'session_notes'
      and constraint_type = 'FOREIGN KEY'
  ) then
    alter table public.session_notes
      add constraint session_notes_session_id_fkey
      foreign key (session_id)
      references public.sessions(id)
      on delete cascade;
  end if;
end $$;

-- d) Make session_id the primary key (one row per session)
alter table if exists public.session_notes add primary key (session_id);

-- RLS: ensure it is enabled
alter table if exists public.session_notes enable row level security;

-- Reset policies for notes (cover various past names)
drop policy if exists "Members can view notes" on public.session_notes;
drop policy if exists "Members can upsert notes" on public.session_notes;
drop policy if exists "Members can insert notes" on public.session_notes;
drop policy if exists "Members can update notes" on public.session_notes;
drop policy if exists "Members and host can read notes" on public.session_notes;
drop policy if exists "Members and host can create notes" on public.session_notes;
drop policy if exists "Members and host can update notes" on public.session_notes;
drop policy if exists "Host can delete notes" on public.session_notes;

create policy "Members can view notes"
  on public.session_notes
  for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_notes.session_id
        and (
          s.host_id = auth.uid()
          or exists (
            select 1 from public.session_members sm
            where sm.session_id = s.id and sm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Members can insert notes"
  on public.session_notes
  for insert
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.id = session_notes.session_id
        and s.status <> 'ended'
        and (
          s.host_id = auth.uid()
          or exists (
            select 1 from public.session_members sm
            where sm.session_id = s.id and sm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Members can update notes"
  on public.session_notes
  for update
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_notes.session_id
        and (
          s.host_id = auth.uid()
          or exists (
            select 1 from public.session_members sm
            where sm.session_id = s.id and sm.user_id = auth.uid()
          )
        )
    )
  )
  with check (
    updated_by = auth.uid()
    and exists (
      select 1 from public.sessions s
      where s.id = session_notes.session_id
        and s.status <> 'ended'
        and (
          s.host_id = auth.uid()
          or exists (
            select 1 from public.session_members sm
            where sm.session_id = s.id and sm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Host can delete notes"
  on public.session_notes
  for delete
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_notes.session_id and s.host_id = auth.uid()
    )
  );

-- Ensure updated_at trigger exists
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'trg_update_session_notes_updated_at'
  ) then
    create trigger trg_update_session_notes_updated_at
    before update on public.session_notes
    for each row execute procedure public.update_updated_at_column();
  end if;
end $$;

-- Realtime reliability for notes
alter table if exists public.session_notes replica identity full;
do $$
begin
  begin
    execute 'alter publication supabase_realtime add table public.session_notes';
  exception
    when duplicate_object then null;
  end;
end $$;

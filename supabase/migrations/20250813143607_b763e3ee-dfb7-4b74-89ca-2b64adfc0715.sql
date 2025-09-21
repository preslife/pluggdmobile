begin;

-- 1) Create collaborative session notes table
create table if not exists public.session_notes (
  session_id uuid primary key,
  content text not null default '',
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.session_notes enable row level security;

-- Policies: members or host can read; insert/update when member/host and updated_by = auth.uid()
drop policy if exists "Members/host can view session notes" on public.session_notes;
create policy "Members/host can view session notes"
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

drop policy if exists "Members/host can insert session notes" on public.session_notes;
create policy "Members/host can insert session notes"
on public.session_notes
for insert
with check (
  auth.uid() = updated_by
  and exists (
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

drop policy if exists "Members/host can update session notes" on public.session_notes;
create policy "Members/host can update session notes"
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
with check (auth.uid() = updated_by);

-- Trigger to maintain updated_at
drop trigger if exists update_session_notes_updated_at on public.session_notes;
create trigger update_session_notes_updated_at
before update on public.session_notes
for each row execute function public.update_updated_at_column();

-- Realtime config for session_notes
alter table public.session_notes replica identity full;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'session_notes'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes';
  END IF;
END$$;

-- Ensure realtime deletes for session_feedback (used by UI)
alter table public.session_feedback replica identity full;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'session_feedback'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.session_feedback';
  END IF;
END$$;

-- 2) Notification trigger on new session feedback to notify the session host
create or replace function public.create_session_feedback_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host uuid;
begin
  select s.host_id into host from public.sessions s where s.id = new.session_id;
  if host is not null and host <> new.user_id then
    insert into public.notifications (user_id, type, title, message, data)
    values (
      host,
      'session_feedback',
      'New session feedback',
      'You received new feedback in your session',
      jsonb_build_object('session_id', new.session_id, 'feedback_id', new.id, 'timecode', new.timecode_seconds)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_session_feedback_notify on public.session_feedback;
create trigger trg_session_feedback_notify
after insert on public.session_feedback
for each row execute function public.create_session_feedback_notification();

commit;
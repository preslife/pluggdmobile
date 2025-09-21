-- Add RLS policies for all session tables

-- Session Rooms Policies
drop policy if exists rooms_read on public.session_rooms;
create policy rooms_read on public.session_rooms for select using (true);

drop policy if exists rooms_host_write on public.session_rooms;
create policy rooms_host_write on public.session_rooms for all
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- Session Participants Policies  
drop policy if exists parts_read on public.session_participants;
create policy parts_read on public.session_participants for select using (
  exists (select 1 from public.session_rooms r where r.id = room_id and (r.host_id = auth.uid() or exists (
    select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid()
  )))
);

drop policy if exists parts_write on public.session_participants;
create policy parts_write on public.session_participants for all using (
  exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
) with check (
  exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
);

-- Session Files Policies
drop policy if exists files_access on public.session_files;
create policy files_access on public.session_files for all using (
  exists (select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid())
  or exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
) with check (
  exists (select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid())
  or exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
);

-- Session Notes Policies
drop policy if exists notes_access on public.session_notes;
create policy notes_access on public.session_notes for all using (
  exists (select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid())
  or exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
) with check (true);

-- Session Feedback Policies
drop policy if exists feedback_access on public.session_feedback;
create policy feedback_access on public.session_feedback for all using (
  exists (select 1 from public.session_participants p where p.room_id = room_id and p.user_id = auth.uid())
  or exists (select 1 from public.session_rooms r where r.id = room_id and r.host_id = auth.uid())
) with check (true);

-- Social Connections Policies
drop policy if exists conn_owner on public.social_connections;
create policy conn_owner on public.social_connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Unified Inbox Policies
drop policy if exists inbox_owner on public.unified_inbox;
create policy inbox_owner on public.unified_inbox for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Social Posts Policies
drop policy if exists posts_owner on public.social_posts;
create policy posts_owner on public.social_posts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
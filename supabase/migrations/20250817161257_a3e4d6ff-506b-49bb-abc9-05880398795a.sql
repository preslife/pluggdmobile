-- Add RLS policies with proper table references

-- Session Rooms Policies
create policy rooms_read on public.session_rooms for select using (true);

create policy rooms_host_write on public.session_rooms for all
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- Session Participants Policies  
create policy parts_read on public.session_participants for select using (
  exists (
    select 1 from public.session_rooms sr 
    where sr.id = session_participants.room_id 
    and (sr.host_id = auth.uid() or exists (
      select 1 from public.session_participants sp2 
      where sp2.room_id = session_participants.room_id 
      and sp2.user_id = auth.uid()
    ))
  )
);

create policy parts_write on public.session_participants for all using (
  exists (
    select 1 from public.session_rooms sr 
    where sr.id = session_participants.room_id 
    and sr.host_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.session_rooms sr 
    where sr.id = session_participants.room_id 
    and sr.host_id = auth.uid()
  )
);

-- Session Files Policies
create policy files_access on public.session_files for all using (
  exists (
    select 1 from public.session_participants sp 
    where sp.room_id = session_files.room_id 
    and sp.user_id = auth.uid()
  )
  or exists (
    select 1 from public.session_rooms sr 
    where sr.id = session_files.room_id 
    and sr.host_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.session_participants sp 
    where sp.room_id = session_files.room_id 
    and sp.user_id = auth.uid()
  )
  or exists (
    select 1 from public.session_rooms sr 
    where sr.id = session_files.room_id 
    and sr.host_id = auth.uid()
  )
);

-- Session Notes Policies
create policy notes_access on public.session_notes for all using (
  exists (
    select 1 from public.session_participants sp 
    where sp.room_id = session_notes.room_id 
    and sp.user_id = auth.uid()
  )
  or exists (
    select 1 from public.session_rooms sr 
    where sr.id = session_notes.room_id 
    and sr.host_id = auth.uid()
  )
) with check (true);

-- Session Feedback Policies
create policy feedback_access on public.session_feedback for all using (
  exists (
    select 1 from public.session_participants sp 
    where sp.room_id = session_feedback.room_id 
    and sp.user_id = auth.uid()
  )
  or exists (
    select 1 from public.session_rooms sr 
    where sr.id = session_feedback.room_id 
    and sr.host_id = auth.uid()
  )
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
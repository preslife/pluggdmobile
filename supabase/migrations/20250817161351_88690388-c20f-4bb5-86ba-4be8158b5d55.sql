-- Update RLS policies to use correct column names from the actual schema

-- Session Rooms Policies (these were created new)
create policy rooms_read on public.session_rooms for select using (true);

create policy rooms_host_write on public.session_rooms for all
  using (auth.uid() = host_id)
  with check (auth.uid() = host_id);

-- Session Participants Policies (these were created new with room_id)
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

-- Social Connections Policies (these were created new)
create policy conn_owner on public.social_connections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Unified Inbox Policies (these were created new)
create policy inbox_owner on public.unified_inbox for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Social Posts Policies (these were created new)
create policy posts_owner on public.social_posts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
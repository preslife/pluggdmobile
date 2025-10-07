create table if not exists public.live_session_reminders (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('24h', '1h')),
  send_at timestamptz not null,
  ics_url text,
  title text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_live_session_reminders_session_id on public.live_session_reminders(session_id);
create index if not exists idx_live_session_reminders_user_id on public.live_session_reminders(user_id);
create index if not exists idx_live_session_reminders_send_at on public.live_session_reminders(send_at);

alter table public.live_session_reminders enable row level security;

create policy "Hosts and attendees can view reminders" on public.live_session_reminders
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.sessions s
      where s.id = live_session_reminders.session_id
        and s.host_id = auth.uid()
    )
  );

create policy "Users can manage their reminders" on public.live_session_reminders
  for delete
  using (auth.uid() = user_id);

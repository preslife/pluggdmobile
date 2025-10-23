-- Notification preferences table aligning with schema 2110
set check_function_bodies = off;

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_push boolean default true,
  notify_contest_reminders boolean default true,
  notify_live_sessions boolean default true,
  notify_purchases boolean default true,
  notify_supporters boolean default true,
  notify_follows boolean default true,
  notify_session_feedback boolean default true,
  notify_email_marketing boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'notification_prefs_set_updated_at'
      and n.nspname = 'public'
  ) then
    execute '
      create trigger notification_prefs_set_updated_at
        before update on public.notification_prefs
        for each row execute function public.update_updated_at_column()
    ';
  end if;
end;
$$;

alter table public.notification_prefs enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_prefs'
      and policyname = 'notification_prefs_self'
  ) then
    execute '
      create policy notification_prefs_self on public.notification_prefs
        for all using (auth.uid() = user_id)
        with check (auth.uid() = user_id)
    ';
  end if;
end;
$$;

grant select, insert, update, delete on public.notification_prefs to authenticated;

grant select on public.notification_prefs to service_role;


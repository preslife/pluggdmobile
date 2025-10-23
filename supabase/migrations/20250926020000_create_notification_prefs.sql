set check_function_bodies = off;

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_push boolean not null default true,
  notify_contest_reminders boolean not null default true,
  notify_live_sessions boolean not null default true,
  notify_purchases boolean not null default true,
  notify_supporters boolean not null default true,
  notify_follows boolean not null default true,
  notify_session_feedback boolean not null default true,
  notify_email_marketing boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notification_prefs
  alter column notify_push set default true,
  alter column notify_contest_reminders set default true,
  alter column notify_live_sessions set default true,
  alter column notify_purchases set default true,
  alter column notify_supporters set default true,
  alter column notify_follows set default true,
  alter column notify_session_feedback set default true,
  alter column notify_email_marketing set default true;

update public.notification_prefs
set
  notify_push = coalesce(notify_push, true),
  notify_contest_reminders = coalesce(notify_contest_reminders, true),
  notify_live_sessions = coalesce(notify_live_sessions, true),
  notify_purchases = coalesce(notify_purchases, true),
  notify_supporters = coalesce(notify_supporters, true),
  notify_follows = coalesce(notify_follows, true),
  notify_session_feedback = coalesce(notify_session_feedback, true),
  notify_email_marketing = coalesce(notify_email_marketing, true);

alter table public.notification_prefs
  alter column notify_push set not null,
  alter column notify_contest_reminders set not null,
  alter column notify_live_sessions set not null,
  alter column notify_purchases set not null,
  alter column notify_supporters set not null,
  alter column notify_follows set not null,
  alter column notify_session_feedback set not null,
  alter column notify_email_marketing set not null;

insert into public.notification_prefs (user_id)
select id from auth.users
on conflict (user_id) do nothing;

drop trigger if exists notification_prefs_set_updated_at on public.notification_prefs;
create trigger notification_prefs_set_updated_at
before update on public.notification_prefs
for each row execute function public.set_updated_at();

alter table public.notification_prefs enable row level security;

drop policy if exists "Users can view their notification preferences" on public.notification_prefs;
create policy "Users can view their notification preferences"
  on public.notification_prefs
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'::user_role
    )
  );

drop policy if exists "Users can manage their notification preferences" on public.notification_prefs;
create policy "Users can manage their notification preferences"
  on public.notification_prefs
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'::user_role
    )
  );

drop policy if exists "Admins can manage all notification preferences" on public.notification_prefs;
create policy "Admins can manage all notification preferences"
  on public.notification_prefs
  for all
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'::user_role
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'::user_role
    )
  );

drop function if exists public.get_notification_prefs(uuid);
create or replace function public.get_notification_prefs(p_user_id uuid default null)
returns public.notification_prefs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := auth.uid();
  v_role text := auth.role();
  v_target uuid := coalesce(p_user_id, v_requester);
  v_is_admin boolean := false;
  v_result public.notification_prefs;
begin
  if v_role <> 'service_role' then
    if v_requester is null then
      raise exception 'Not authenticated';
    end if;
  elsif v_target is null then
    raise exception 'Target user required';
  end if;

  if v_role <> 'service_role' and v_target <> v_requester then
    select exists(
      select 1 from public.user_roles where user_id = v_requester and role = 'admin'::user_role
    ) into v_is_admin;

    if not v_is_admin then
      raise exception 'Access denied';
    end if;
  end if;

  insert into public.notification_prefs (user_id)
  values (v_target)
  on conflict (user_id) do update set updated_at = now();

  select * into v_result from public.notification_prefs where user_id = v_target;
  return v_result;
end;
$$;

drop function if exists public.set_notification_pref(text, boolean, uuid);
create or replace function public.set_notification_pref(
  p_key text,
  p_value boolean,
  p_user_id uuid default null
)
returns public.notification_prefs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := auth.uid();
  v_role text := auth.role();
  v_target uuid := coalesce(p_user_id, v_requester);
  v_is_admin boolean := false;
  v_result public.notification_prefs;
  v_column text;
  v_sql text;
begin
  if p_value is null then
    raise exception 'Preference value cannot be null';
  end if;

  if v_role <> 'service_role' then
    if v_requester is null then
      raise exception 'Not authenticated';
    end if;
  elsif v_target is null then
    raise exception 'Target user required';
  end if;

  if v_role <> 'service_role' and v_target <> v_requester then
    select exists(
      select 1 from public.user_roles where user_id = v_requester and role = 'admin'::user_role
    ) into v_is_admin;

    if not v_is_admin then
      raise exception 'Access denied';
    end if;
  end if;

  if p_key not in (
    'notify_push',
    'notify_contest_reminders',
    'notify_live_sessions',
    'notify_purchases',
    'notify_supporters',
    'notify_follows',
    'notify_session_feedback',
    'notify_email_marketing'
  ) then
    raise exception 'Invalid notification preference key';
  end if;

  insert into public.notification_prefs (user_id)
  values (v_target)
  on conflict (user_id) do nothing;

  v_sql := format(
    'update public.notification_prefs set %I = $1, updated_at = now() where user_id = $2 returning *',
    p_key
  );

  execute v_sql using p_value, v_target into v_result;
  return v_result;
end;
$$;

grant execute on function public.get_notification_prefs(uuid) to authenticated;
grant execute on function public.get_notification_prefs(uuid) to service_role;

grant execute on function public.set_notification_pref(text, boolean, uuid) to authenticated;
grant execute on function public.set_notification_pref(text, boolean, uuid) to service_role;

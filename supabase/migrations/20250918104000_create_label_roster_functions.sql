-- Label roster + invites helpers
create or replace function public.label_roster(p_label_id uuid)
returns table (
  member_user_id uuid,
  member_role text,
  joined_at timestamptz,
  username text,
  full_name text,
  avatar_url text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  select role::text into v_role
  from public.label_members
  where label_id = p_label_id
    and user_id = v_uid
  limit 1;

  if v_role is null then
    raise exception 'not_a_member';
  end if;

  return query
    select
      lm.user_id as member_user_id,
      lm.role::text as member_role,
      lm.created_at as joined_at,
      p.username,
      p.full_name,
      p.avatar_url
    from public.label_members lm
    left join public.profiles p on p.user_id = lm.user_id
    where lm.label_id = p_label_id
    order by lm.role, lm.created_at;
end;
$$;

grant execute on function public.label_roster(uuid) to authenticated;

create or replace function public.label_pending_invites(p_label_id uuid)
returns table (
  invitation_id uuid,
  email text,
  invite_role text,
  expires_at timestamptz,
  token text,
  invited_by uuid,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role text;
begin
  if v_uid is null then
    raise exception 'auth_required';
  end if;

  select role::text into v_role
  from public.label_members
  where label_id = p_label_id
    and user_id = v_uid
  limit 1;

  if v_role is null then
    raise exception 'not_a_member';
  end if;

  return query
    select
      li.id as invitation_id,
      li.email,
      li.role::text as invite_role,
      li.expires_at,
      li.token,
      li.invited_by,
      li.created_at
    from public.label_invitations li
    where li.label_id = p_label_id
      and li.accepted_at is null
      and li.expires_at >= now()
    order by li.created_at desc;
end;
$$;

grant execute on function public.label_pending_invites(uuid) to authenticated;

-- Function to get label invitation details (for invitation acceptance page)
create or replace function public.get_label_invitation_details(p_token text)
returns table(
  invitation_id uuid,
  label_id uuid,
  label_name text,
  label_slug text,
  role text,
  invited_by_name text,
  expires_at timestamptz,
  is_member boolean,
  current_role text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  return query
  select
    li.id as invitation_id,
    l.id as label_id,
    l.name as label_name,
    l.slug as label_slug,
    li.role::text as role,
    coalesce(p.username, p.display_name, 'Team Admin') as invited_by_name,
    li.expires_at,
    exists(
      select 1
      from public.label_members lm
      where lm.label_id = l.id
      and lm.user_id = v_user_id
    ) as is_member,
    (
      select lm.role::text
      from public.label_members lm
      where lm.label_id = l.id
      and lm.user_id = v_user_id
      limit 1
    ) as current_role
  from public.label_invitations li
  join public.labels l on li.label_id = l.id
  left join public.profiles p on li.invited_by = p.user_id
  where li.token = p_token
  and (li.accepted_at is null or li.accepted_by_user_id = v_user_id)
  limit 1;
end;
$$;

grant execute on function public.get_label_invitation_details(text) to authenticated;

-- Update accept_label_invite to handle email-based invites better
create or replace function public.accept_label_invite(p_token text)
returns table(label_id uuid, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_label_id uuid;
  v_role public.label_member_role;
  v_now timestamptz := now();
  v_invitation_id uuid;
begin
  perform public._set_search_path();

  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- Get user email
  select email into v_user_email
  from auth.users
  where id = v_user_id;

  -- Find and validate invitation
  select li.id, li.label_id, li.role
  into v_invitation_id, v_label_id, v_role
  from public.label_invitations li
  where li.token = p_token
    and li.accepted_at is null
    and li.expires_at > v_now
    and (lower(li.email) = lower(v_user_email) or li.email = '*')  -- Allow wildcard invites
  limit 1;

  if not found then
    -- Check if already accepted
    if exists (
      select 1
      from public.label_invitations
      where token = p_token
      and accepted_at is not null
    ) then
      raise exception 'invitation_already_used';
    end if;

    -- Check if expired
    if exists (
      select 1
      from public.label_invitations
      where token = p_token
      and expires_at <= v_now
    ) then
      raise exception 'invitation_expired';
    end if;

    raise exception 'invitation_not_found';
  end if;

  -- Check if already a member
  if exists (
    select 1
    from public.label_members
    where label_id = v_label_id
    and user_id = v_user_id
  ) then
    -- Update role if the invitation offers a higher role
    update public.label_members
    set role = v_role
    where label_id = v_label_id
      and user_id = v_user_id
      and (
        (role = 'viewer' and v_role in ('editor', 'admin', 'owner')) or
        (role = 'editor' and v_role in ('admin', 'owner')) or
        (role = 'admin' and v_role = 'owner')
      );

    -- Mark invitation as accepted
    update public.label_invitations
    set accepted_at = v_now,
        accepted_by_user_id = v_user_id
    where id = v_invitation_id;

    return query select v_label_id, v_role::text;
    return;
  end if;

  -- Add user as label member
  insert into public.label_members (label_id, user_id, role, invited_by, created_at)
  select v_label_id, v_user_id, v_role, li.invited_by, v_now
  from public.label_invitations li
  where li.id = v_invitation_id;

  -- Mark invitation as accepted
  update public.label_invitations
  set accepted_at = v_now,
      accepted_by_user_id = v_user_id
  where id = v_invitation_id;

  return query select v_label_id, v_role::text;
end;
$$;

grant execute on function public.accept_label_invite(text) to authenticated;
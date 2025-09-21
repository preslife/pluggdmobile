-- Update labels/team management functions to align with new schema

create or replace function public._set_search_path() returns void
language sql
as $$ select set_config('search_path','public',true); $$;

-- create_label_for_current_user ------------------------------------------------
create or replace function public.create_label_for_current_user(
  p_name text,
  p_slug text,
  p_genre text default null,
  p_contact_email text default null,
  p_country text default null,
  p_logo_url text default null,
  p_cover_image_url text default null
)
returns table(label_id uuid, slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := now();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if exists (select 1 from public.labels where slug = lower(p_slug)) then
    raise exception 'slug_conflict';
  end if;

  insert into public.labels(
    slug,
    name,
    logo_url,
    cover_image_url,
    genre,
    contact_email,
    country,
    owner_user_id,
    created_by_admin,
    created_at,
    updated_at
  )
  values (
    lower(p_slug),
    p_name,
    p_logo_url,
    p_cover_image_url,
    p_genre,
    p_contact_email,
    p_country,
    v_user_id,
    false,
    v_now,
    v_now
  )
  returning id, slug into label_id, slug;

  insert into public.label_members(label_id, user_id, role, invited_by, created_at)
  values (label_id, v_user_id, 'owner', v_user_id, v_now)
  on conflict (label_id, user_id) do update set role = excluded.role;

  return next;
end;
$$;

grant execute on function public.create_label_for_current_user(text, text, text, text, text, text, text) to authenticated;

-- admin_create_managed_label ---------------------------------------------------
create or replace function public.admin_create_managed_label(
  p_name text,
  p_slug text,
  p_owner_email text default null,
  p_contact_email text default null,
  p_country text default null,
  p_logo_url text default null,
  p_cover_image_url text default null
)
returns table(label_id uuid, claim_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := '';
  v_owner_user_id uuid;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_now timestamptz := now();
  v_invited_by uuid := auth.uid();
begin
  perform public._set_search_path();
  begin
    v_role := coalesce((current_setting('request.jwt.claims', true)::json->>'role'),'');
  exception when others then
    v_role := '';
  end;
  if v_role <> 'service_role' then
    raise exception 'forbidden_service_role_required';
  end if;

  if exists (select 1 from public.labels where slug = lower(p_slug)) then
    raise exception 'slug_conflict';
  end if;

  if p_owner_email is not null then
    select id into v_owner_user_id from auth.users where lower(email) = lower(p_owner_email) limit 1;
  end if;

  insert into public.labels(
    slug,
    name,
    logo_url,
    cover_image_url,
    contact_email,
    country,
    owner_user_id,
    created_by_admin,
    created_at,
    updated_at
  )
  values (
    lower(p_slug),
    p_name,
    p_logo_url,
    p_cover_image_url,
    coalesce(p_contact_email, p_owner_email),
    p_country,
    v_owner_user_id,
    true,
    v_now,
    v_now
  )
  returning id into label_id;

  if p_owner_email is not null then
    insert into public.label_invitations(label_id, email, role, token, expires_at, invited_by, created_at)
    values (label_id, lower(p_owner_email), 'owner', v_token, v_now + interval '7 days', v_invited_by, v_now)
    on conflict (label_id, email) do update set token = excluded.token, expires_at = excluded.expires_at;
    claim_token := v_token;
  end if;

  return next;
end;
$$;

grant execute on function public.admin_create_managed_label(text, text, text, text, text, text, text) to service_role;

-- invite_label_member ---------------------------------------------------------
create or replace function public.invite_label_member(
  p_label_id uuid,
  p_email text,
  p_role public.label_member_role
)
returns table(invitation_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_email text := lower(p_email);
  v_now timestamptz := now();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (
    select 1 from public.label_members m
    where m.label_id = p_label_id and m.user_id = v_user_id and m.role in ('owner','admin')
  ) then
    raise exception 'forbidden_not_label_admin_or_owner';
  end if;

  insert into public.label_invitations(label_id, email, role, token, expires_at, invited_by, created_at)
  values (p_label_id, v_email, p_role, v_token, v_now + interval '7 days', v_user_id, v_now)
  returning id, token, expires_at into invitation_id, token, expires_at;

  return next;
end;
$$;

grant execute on function public.invite_label_member(uuid, text, public.label_member_role) to authenticated;

-- resend_label_invite ---------------------------------------------------------
create or replace function public.resend_label_invite(
  p_invitation_id uuid
)
returns table(token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_inv public.label_invitations%rowtype;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_expires timestamptz := now() + interval '7 days';
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select * into v_inv from public.label_invitations where id = p_invitation_id;
  if not found then
    raise exception 'invitation_not_found';
  end if;

  if not exists (
    select 1 from public.label_members m
    where m.label_id = v_inv.label_id and m.user_id = v_user_id and m.role in ('owner','admin')
  ) then
    raise exception 'forbidden_not_label_admin_or_owner';
  end if;

  update public.label_invitations
  set token = v_token,
      expires_at = v_expires,
      accepted_by_user_id = null,
      accepted_at = null
  where id = v_inv.id;

  token := v_token;
  expires_at := v_expires;
  return next;
end;
$$;

grant execute on function public.resend_label_invite(uuid) to authenticated;

-- accept_label_invite ---------------------------------------------------------
create or replace function public.accept_label_invite(
  p_token text
)
returns table(label_id uuid, member_role public.label_member_role)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_inv public.label_invitations%rowtype;
  v_now timestamptz := now();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    raise exception 'no_user_email';
  end if;

  select * into v_inv
  from public.label_invitations
  where token = p_token and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    raise exception 'invalid_or_expired_token';
  end if;

  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'email_mismatch';
  end if;

  insert into public.label_members(label_id, user_id, role, invited_by, created_at)
  values (v_inv.label_id, v_user_id, v_inv.role, v_inv.invited_by, v_now)
  on conflict (label_id, user_id) do update set role = excluded.role;

  update public.label_invitations
  set accepted_by_user_id = v_user_id,
      accepted_at = v_now
  where id = v_inv.id;

  if v_inv.role = 'owner' then
    update public.labels
    set owner_user_id = v_user_id,
        claimed_at = coalesce(claimed_at, v_now)
    where id = v_inv.label_id;
  end if;

  label_id := v_inv.label_id;
  member_role := v_inv.role;
  return next;
end;
$$;

grant execute on function public.accept_label_invite(text) to authenticated;

-- request_ownership_transfer --------------------------------------------------
create or replace function public.request_ownership_transfer(
  p_label_id uuid,
  p_to_user_id uuid default null,
  p_to_email text default null
)
returns table(transfer_id uuid, token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_expires timestamptz := now() + interval '48 hours';
  v_email text := case when p_to_email is not null then lower(p_to_email) else null end;
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_to_user_id is null and v_email is null then
    raise exception 'target_required';
  end if;

  if not exists (
    select 1 from public.label_members m where m.label_id = p_label_id and m.user_id = v_user_id and m.role = 'owner'
  ) then
    raise exception 'forbidden_owner_required';
  end if;

  insert into public.ownership_transfer_requests(label_id, from_user_id, to_user_id, to_email, token, expires_at, created_at)
  values (p_label_id, v_user_id, p_to_user_id, v_email, v_token, v_expires, now())
  returning id, token, expires_at into transfer_id, token, expires_at;

  return next;
end;
$$;

grant execute on function public.request_ownership_transfer(uuid, uuid, text) to authenticated;

-- accept_ownership_transfer ---------------------------------------------------
create or replace function public.accept_ownership_transfer(
  p_token text
)
returns table(label_id uuid, new_owner_user_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_req public.ownership_transfer_requests%rowtype;
  v_now timestamptz := now();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  select * into v_req from public.ownership_transfer_requests
  where token = p_token and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    raise exception 'invalid_or_expired_token';
  end if;

  if v_req.to_user_id is not null and v_req.to_user_id <> v_user_id then
    raise exception 'forbidden_not_recipient';
  end if;

  if v_req.to_user_id is null and v_req.to_email is not null and (v_email is null or lower(v_req.to_email) <> lower(v_email)) then
    raise exception 'email_mismatch';
  end if;

  update public.label_members set role = 'admin'
  where label_id = v_req.label_id and role = 'owner';

  insert into public.label_members(label_id, user_id, role, invited_by, created_at)
  values (v_req.label_id, v_user_id, 'owner', v_req.from_user_id, v_now)
  on conflict (label_id, user_id) do update set role = excluded.role;

  update public.labels
  set owner_user_id = v_user_id,
      claimed_at = coalesce(claimed_at, v_now)
  where id = v_req.label_id;

  update public.ownership_transfer_requests
  set accepted_at = v_now
  where id = v_req.id;

  label_id := v_req.label_id;
  new_owner_user_id := v_user_id;
  return next;
end;
$$;

grant execute on function public.accept_ownership_transfer(text) to authenticated;

-- request_label_action --------------------------------------------------------
create or replace function public.request_label_action(
  p_label_id uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns table(request_id uuid, action text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_type public.label_deletion_type;
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_action not in ('downgrade','delete') then
    raise exception 'invalid_action';
  end if;
  v_type := p_action::public.label_deletion_type;

  if not exists (
    select 1 from public.label_members m where m.label_id = p_label_id and m.user_id = v_user_id and m.role = 'owner'
  ) then
    raise exception 'forbidden_owner_required';
  end if;

  insert into public.deletion_requests(label_id, requested_by, type, payload_json, created_at)
  values (p_label_id, v_user_id, v_type, coalesce(p_payload, '{}'::jsonb), now())
  returning id, type::text into request_id, action;

  return next;
end;
$$;

grant execute on function public.request_label_action(uuid, text, jsonb) to authenticated;

-- claim_admin_created_profile -------------------------------------------------
create or replace function public.claim_admin_created_profile(
  p_token text
)
returns table(label_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_inv public.label_invitations%rowtype;
  v_now timestamptz := now();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select email into v_email from auth.users where id = v_user_id;

  select * into v_inv from public.label_invitations
  where token = p_token and role = 'owner' and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    raise exception 'invalid_or_expired_token';
  end if;

  if v_email is null or lower(v_inv.email) <> lower(v_email) then
    raise exception 'email_mismatch';
  end if;

  insert into public.label_members(label_id, user_id, role, invited_by, created_at)
  values (v_inv.label_id, v_user_id, 'owner', v_inv.invited_by, v_now)
  on conflict (label_id, user_id) do update set role = excluded.role;

  update public.labels
  set owner_user_id = v_user_id,
      claimed_at = v_now
  where id = v_inv.label_id;

  update public.label_invitations
  set accepted_by_user_id = v_user_id,
      accepted_at = v_now
  where id = v_inv.id;

  label_id := v_inv.label_id;
  return next;
end;
$$;

grant execute on function public.claim_admin_created_profile(text) to authenticated;

-- Artist link management ------------------------------------------------------
create or replace function public.request_artist_link(
  p_label_id uuid,
  p_creator_profile_id uuid,
  p_role public.managed_profile_role default 'distribution_only'
)
returns table(link_id uuid, status public.managed_profile_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.managed_profiles%rowtype;
  v_now timestamptz := now();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (
    select 1 from public.label_members m
    where m.label_id = p_label_id and m.user_id = v_user_id and m.role in ('owner','admin','editor')
  ) then
    raise exception 'forbidden_label_permissions_required';
  end if;

  select * into v_row
  from public.managed_profiles
  where label_id = p_label_id and profile_id = p_creator_profile_id
  limit 1;

  if found then
    if v_row.status = 'removed' then
      update public.managed_profiles
      set status = 'pending', invited_by = v_user_id, accepted_at = null, role = p_role, created_at = v_now
      where id = v_row.id
      returning * into v_row;
    end if;
  else
    insert into public.managed_profiles(label_id, profile_id, role, status, invited_by, created_at)
    values (p_label_id, p_creator_profile_id, p_role, 'pending', v_user_id, v_now)
    returning * into v_row;
  end if;

  link_id := v_row.id;
  status := v_row.status;
  return next;
end;
$$;

grant execute on function public.request_artist_link(uuid, uuid, public.managed_profile_role) to authenticated;

create or replace function public.accept_artist_link(
  p_link_id uuid
)
returns table(link_id uuid, status public.managed_profile_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
  v_now timestamptz := now();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select profile_id into v_profile_id from public.managed_profiles where id = p_link_id;
  if not found then
    raise exception 'link_not_found';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = v_profile_id and p.user_id = v_user_id
  ) then
    raise exception 'forbidden_not_profile_owner';
  end if;

  update public.managed_profiles
  set status = 'active', accepted_at = v_now
  where id = p_link_id
  returning id, status into link_id, status;

  return next;
end;
$$;

grant execute on function public.accept_artist_link(uuid) to authenticated;

create or replace function public.unlink_artist_from_label(
  p_label_id uuid,
  p_creator_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if not exists (
    select 1 from public.label_members m
    where m.label_id = p_label_id and m.user_id = v_user_id and m.role in ('owner','admin','editor')
  ) and not exists (
    select 1 from public.profiles p where p.id = p_creator_profile_id and p.user_id = v_user_id
  ) then
    raise exception 'forbidden_not_authorized';
  end if;

  delete from public.managed_profiles
  where label_id = p_label_id and profile_id = p_creator_profile_id;
end;
$$;

grant execute on function public.unlink_artist_from_label(uuid, uuid) to authenticated;

-- switch_content_owner --------------------------------------------------------
create or replace function public.switch_content_owner(
  p_table regclass,
  p_id uuid,
  p_to_owner_type text,
  p_to_owner_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_from_owner_type text;
  v_from_owner_id uuid;
  v_sql text;
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_to_owner_type not in ('label','profile') then
    raise exception 'invalid_owner_type';
  end if;

  v_sql := format('select owner_type::text, owner_id::uuid from %s where id = $1 for update', p_table::text);
  execute v_sql using p_id into v_from_owner_type, v_from_owner_id;
  if v_from_owner_type is null then
    raise exception 'record_not_found_or_missing_owner';
  end if;

  if v_from_owner_type = 'label' then
    if not exists (
      select 1 from public.label_members m where m.label_id = v_from_owner_id and m.user_id = v_user_id and m.role in ('owner','admin','editor')
    ) then
      raise exception 'forbidden_on_from_label';
    end if;
  elsif v_from_owner_type = 'profile' then
    if not exists (
      select 1 from public.profiles p where p.id = v_from_owner_id and p.user_id = v_user_id
    ) then
      raise exception 'forbidden_on_from_profile';
    end if;
  else
    raise exception 'unsupported_from_owner_type';
  end if;

  if p_to_owner_type = 'label' then
    if not exists (
      select 1 from public.label_members m where m.label_id = p_to_owner_id and m.user_id = v_user_id and m.role in ('owner','admin','editor')
    ) then
      raise exception 'forbidden_on_to_label';
    end if;
  elsif p_to_owner_type = 'profile' then
    if not exists (
      select 1 from public.profiles p where p.id = p_to_owner_id and p.user_id = v_user_id
    ) then
      raise exception 'forbidden_on_to_profile';
    end if;
  end if;

  v_sql := format('update %s set owner_type = $1::text, owner_id = $2::uuid where id = $3', p_table::text);
  execute v_sql using p_to_owner_type, p_to_owner_id, p_id;
end;
$$;

grant execute on function public.switch_content_owner(regclass, uuid, text, uuid) to authenticated;

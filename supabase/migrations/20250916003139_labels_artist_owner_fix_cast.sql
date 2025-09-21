-- Labels/Teams: Artist Link/Unlink + Switch Content Owner
-- Assumes table public.managed_profiles(label_id, creator_profile_id, status)

-- request_artist_link (label owner/admin/editor)
create or replace function public.request_artist_link(
  p_label_id uuid,
  p_creator_profile_id uuid
)
returns table(link_id uuid, status text) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;

  -- caller must be owner/admin/editor of the label
  if not exists (
    select 1 from public.label_members m
    where m.label_id = p_label_id and m.user_id = v_user_id and m.role in ('owner','admin','editor')
  ) then
    raise exception 'forbidden_label_permissions_required';
  end if;

  -- avoid duplicates: reactivate if removed
  select true into v_exists from public.managed_profiles
  where label_id = p_label_id and creator_profile_id = p_creator_profile_id limit 1;

  if v_exists then
    update public.managed_profiles
    set status = 'pending'
    where label_id = p_label_id and creator_profile_id = p_creator_profile_id
    returning id, status into link_id, status;
  else
    insert into public.managed_profiles(label_id, creator_profile_id, status)
    values (p_label_id, p_creator_profile_id, 'pending')
    returning id, status into link_id, status;
  end if;

  return next;
end; $$;

-- accept_artist_link (creator must own the profile)
create or replace function public.accept_artist_link(
  p_link_id uuid
)
returns table(link_id uuid, status text) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_profile_id uuid;
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;

  select mp.creator_profile_id into v_profile_id from public.managed_profiles mp where mp.id = p_link_id;
  if not found then raise exception 'link_not_found'; end if;

  -- verify user owns the creator profile
  if not exists (
    select 1 from public.profiles p where p.id = v_profile_id and p.user_id = v_user_id
  ) then
    raise exception 'forbidden_not_profile_owner';
  end if;

  update public.managed_profiles set status = 'active' where id = p_link_id returning id, status into link_id, status;
  return next;
end; $$;

-- unlink_artist_from_label (label owner/admin/editor OR creator owner)
create or replace function public.unlink_artist_from_label(
  p_label_id uuid,
  p_creator_profile_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;

  if not exists (
    select 1 from public.label_members m
    where m.label_id = p_label_id and m.user_id = v_user_id and m.role in ('owner','admin','editor')
  ) and not exists (
    select 1 from public.profiles p where p.id = p_creator_profile_id and p.user_id = v_user_id
  ) then
    raise exception 'forbidden_not_authorized';
  end if;

  update public.managed_profiles set status = 'removed'
  where label_id = p_label_id and creator_profile_id = p_creator_profile_id;
end; $$;

-- switch_content_owner with table whitelisting via regclass
create or replace function public.switch_content_owner(
  p_table regclass,
  p_id uuid,
  p_to_owner_type text,
  p_to_owner_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_from_owner_type text;
  v_from_owner_id uuid;
  v_sql text;
begin
  if v_user_id is null then raise exception 'unauthenticated'; end if;

  if p_to_owner_type not in ('label','profile') then
    raise exception 'invalid_owner_type';
  end if;

  -- load current owner
  v_sql := format('select owner_type::text, owner_id::uuid from %s where id = $1 for update', p_table::text);
  execute v_sql using p_id into v_from_owner_type, v_from_owner_id;
  if v_from_owner_type is null then raise exception 'record_not_found_or_no_owner_fields'; end if;

  -- check caller rights on FROM owner
  if v_from_owner_type = 'label' then
    if not exists (
      select 1 from public.label_members m where m.label_id = v_from_owner_id and m.user_id = v_user_id and m.role in ('owner','admin','editor')
    ) then raise exception 'forbidden_on_from_label'; end if;
  elsif v_from_owner_type = 'profile' then
    if not exists (
      select 1 from public.profiles p where p.id = v_from_owner_id and p.user_id = v_user_id
    ) then raise exception 'forbidden_on_from_profile'; end if;
  else
    raise exception 'unsupported_from_owner_type';
  end if;

  -- check caller rights on TO owner
  if p_to_owner_type = 'label' then
    if not exists (
      select 1 from public.label_members m where m.label_id = p_to_owner_id and m.user_id = v_user_id and m.role in ('owner','admin','editor')
    ) then raise exception 'forbidden_on_to_label'; end if;
  elsif p_to_owner_type = 'profile' then
    if not exists (
      select 1 from public.profiles p where p.id = p_to_owner_id and p.user_id = v_user_id
    ) then raise exception 'forbidden_on_to_profile'; end if;
  end if;

  -- perform update
  v_sql := format('update %s set owner_type = $1::text, owner_id = $2::uuid where id = $3', p_table::text);
  -- Note: casting via text to keep compatibility. Adjust type if you use enum types.
  execute v_sql using p_to_owner_type, p_to_owner_id, p_id;
end; $$;

-- Grants
grant execute on function public.request_artist_link(uuid, uuid) to authenticated;
grant execute on function public.accept_artist_link(uuid) to authenticated;
grant execute on function public.unlink_artist_from_label(uuid, uuid) to authenticated;
grant execute on function public.switch_content_owner(regclass, uuid, text, uuid) to authenticated;



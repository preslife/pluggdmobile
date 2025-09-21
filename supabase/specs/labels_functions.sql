-- Labels/Teams Core Functions
-- Note: Intended for use with Supabase PostgREST/Edge Functions. Functions are SECURITY DEFINER to bypass RLS where needed.

-- Helper: ensure search_path
create or replace function public._set_search_path() returns void language sql as $$ select set_config('search_path','public',true); $$;

-- create_label_for_current_user
create or replace function public.create_label_for_current_user(
  p_name text,
  p_slug text,
  p_genre text default null,
  p_contact_email text default null,
  p_country text default null,
  p_logo_url text default null,
  p_cover_image_url text default null
)
returns table(label_id uuid, slug text) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- enforce slug uniqueness
  if exists (select 1 from public.labels where slug = p_slug) then
    raise exception 'slug_conflict';
  end if;

  insert into public.labels(slug, name, logo_url, cover_image_url, genre, contact_email, country, owner_user_id, created_by_admin)
  values (p_slug, p_name, p_logo_url, p_cover_image_url, p_genre, p_contact_email, p_country, v_user_id, false)
  returning id, slug into label_id, slug;

  -- owner membership
  insert into public.label_members(label_id, user_id, role, invited_by)
  values (label_id, v_user_id, 'owner', v_user_id)
  on conflict (label_id, user_id) do nothing;

  return next;
end; $$;

-- admin_create_managed_label (service role only)
create or replace function public.admin_create_managed_label(
  p_name text,
  p_slug text,
  p_owner_email text default null,
  p_contact_email text default null,
  p_country text default null,
  p_logo_url text default null,
  p_cover_image_url text default null
)
returns table(label_id uuid, claim_token text) language plpgsql security definer set search_path = public as $$
declare
  v_role text;
  v_owner_user_id uuid;
  v_token text := md5(random()::text || clock_timestamp()::text || coalesce(current_setting('request.jwt.claims', true), ''));
begin
  perform public._set_search_path();
  -- require service role
  begin
    v_role := coalesce((current_setting('request.jwt.claims', true)::json->>'role'),'');
  exception when others then
    v_role := '';
  end;
  if v_role <> 'service_role' then
    raise exception 'forbidden_service_role_required';
  end if;

  if exists (select 1 from public.labels where slug = p_slug) then
    raise exception 'slug_conflict';
  end if;

  -- optional: resolve owner user by email if already exists
  if p_owner_email is not null then
    select id into v_owner_user_id from auth.users where lower(email) = lower(p_owner_email) limit 1;
  end if;

  insert into public.labels(slug, name, logo_url, cover_image_url, contact_email, country, owner_user_id, created_by_admin)
  values (p_slug, p_name, p_logo_url, p_cover_image_url, coalesce(p_contact_email, p_owner_email), p_country, v_owner_user_id, true)
  returning id into label_id;

  -- create claim invitation if owner email provided
  if p_owner_email is not null then
    insert into public.label_invitations(label_id, email, role, token, expires_at, invited_by)
    values (label_id, p_owner_email, 'owner', v_token, now() + interval '7 days', auth.uid())
    on conflict do nothing;
    claim_token := v_token;
  end if;

  return next;
end; $$;

-- invite_label_member (owner/admin only)
create or replace function public.invite_label_member(
  p_label_id uuid,
  p_email text,
  p_role label_role
)
returns table(invitation_id uuid, token text) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := md5(random()::text || clock_timestamp()::text || coalesce(current_setting('request.jwt.claims', true), ''));
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  -- ensure caller is owner/admin of label
  if not exists (
    select 1 from public.label_members m
    where m.label_id = p_label_id and m.user_id = v_user_id and m.role in ('owner','admin')
  ) then
    raise exception 'forbidden_not_label_admin_or_owner';
  end if;

  insert into public.label_invitations(label_id, email, role, token, expires_at, invited_by)
  values (p_label_id, lower(p_email), p_role, v_token, now() + interval '7 days', v_user_id)
  returning id, token into invitation_id, token;

  return next;
end; $$;

-- accept_label_invite (authed user; email must match invitation)
create or replace function public.accept_label_invite(
  p_token text
)
returns table(label_id uuid, member_role label_role) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_role label_role;
  v_inv record;
begin
  perform public._set_search_path();
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    raise exception 'no_user_email';
  end if;

  select * into v_inv from public.label_invitations
  where token = p_token and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    raise exception 'invalid_or_expired_token';
  end if;

  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'email_mismatch';
  end if;

  v_role := v_inv.role;
  label_id := v_inv.label_id;

  -- create membership
  insert into public.label_members(label_id, user_id, role, invited_by)
  values (v_inv.label_id, v_user_id, v_role, v_inv.invited_by)
  on conflict (label_id, user_id) do update set role = excluded.role;

  -- mark accepted
  update public.label_invitations
  set accepted_by_user_id = v_user_id, accepted_at = now()
  where id = v_inv.id;

  member_role := v_role;
  return next;
end; $$;

-- Grants (adjust as needed)
grant execute on function public.create_label_for_current_user(text, text, text, text, text, text, text) to authenticated;
grant execute on function public.invite_label_member(uuid, text, label_role) to authenticated;
grant execute on function public.accept_label_invite(text) to authenticated;
grant execute on function public.admin_create_managed_label(text, text, text, text, text, text, text) to service_role;



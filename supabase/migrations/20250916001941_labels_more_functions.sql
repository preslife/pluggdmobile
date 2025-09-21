-- Labels/Teams Additional Functions
-- Includes ownership transfer, downgrade/delete request, claim profile, invite management

-- request_ownership_transfer (owner only)
create or replace function public.request_ownership_transfer(
  p_label_id uuid,
  p_to_user_id uuid default null,
  p_to_email text default null
)
returns table(transfer_id uuid, token text, expires_at timestamptz) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_expires timestamptz := now() + interval '48 hours';
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_to_user_id is null and (p_to_email is null or length(trim(p_to_email)) = 0) then
    raise exception 'target_required';
  end if;

  if not exists (
    select 1 from public.label_members m
    where m.label_id = p_label_id and m.user_id = v_user_id and m.role = 'owner'
  ) then
    raise exception 'forbidden_owner_required';
  end if;

  insert into public.ownership_transfer_requests(label_id, from_user_id, to_user_id, to_email, token, expires_at)
  values (p_label_id, v_user_id, p_to_user_id, p_to_email, v_token, v_expires)
  returning id, token, expires_at into transfer_id, token, expires_at;

  return next;
end; $$;

-- accept_ownership_transfer (recipient)
create or replace function public.accept_ownership_transfer(
  p_token text
)
returns table(label_id uuid, new_owner_user_id uuid) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_req public.ownership_transfer_requests%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    raise exception 'no_user_email';
  end if;

  select * into v_req from public.ownership_transfer_requests
  where token = p_token and (expires_at is null or expires_at > now())
  limit 1;

  if not found then
    raise exception 'invalid_or_expired_token';
  end if;

  if v_req.to_user_id is not null and v_req.to_user_id <> v_user_id then
    raise exception 'forbidden_not_recipient';
  end if;

  if v_req.to_user_id is null and v_req.to_email is not null and lower(v_req.to_email) <> lower(v_email) then
    raise exception 'email_mismatch';
  end if;

  -- demote any current owners to admin
  update public.label_members set role = 'admin'
  where label_id = v_req.label_id and role = 'owner';

  -- promote recipient to owner
  insert into public.label_members(label_id, user_id, role, invited_by)
  values (v_req.label_id, v_user_id, 'owner', v_req.from_user_id)
  on conflict (label_id, user_id) do update set role = excluded.role;

  -- update canonical owner on labels
  update public.labels set owner_user_id = v_user_id where id = v_req.label_id;

  -- mark accepted
  update public.ownership_transfer_requests set accepted_at = now() where id = v_req.id;

  label_id := v_req.label_id;
  new_owner_user_id := v_user_id;
  return next;
end; $$;

-- request_label_action (owner only) for downgrade/delete
create or replace function public.request_label_action(
  p_label_id uuid,
  p_action text,
  p_payload jsonb default '{}'::jsonb
)
returns table(request_id uuid, action text) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_type public.label_delete_type;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;

  if p_action not in ('downgrade','delete') then
    raise exception 'invalid_action';
  end if;
  v_type := p_action::public.label_delete_type;

  if not exists (
    select 1 from public.label_members m
    where m.label_id = p_label_id and m.user_id = v_user_id and m.role = 'owner'
  ) then
    raise exception 'forbidden_owner_required';
  end if;

  insert into public.deletion_requests(label_id, requested_by, type, payload_json)
  values (p_label_id, v_user_id, v_type, coalesce(p_payload,'{}'::jsonb))
  returning id, type::text into request_id, action;

  return next;
end; $$;

-- claim_admin_created_profile (owner invitation token)
create or replace function public.claim_admin_created_profile(
  p_token text
)
returns table(label_id uuid) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_inv record;
begin
  if v_user_id is null then
    raise exception 'unauthenticated';
  end if;
  select email into v_email from auth.users where id = v_user_id;
  if v_email is null then
    raise exception 'no_user_email';
  end if;

  select * into v_inv from public.label_invitations
  where token = p_token and role = 'owner' and (expires_at is null or expires_at > now())
  limit 1;
  if not found then
    raise exception 'invalid_or_expired_token';
  end if;
  if lower(v_inv.email) <> lower(v_email) then
    raise exception 'email_mismatch';
  end if;

  -- upsert owner membership
  insert into public.label_members(label_id, user_id, role, invited_by)
  values (v_inv.label_id, v_user_id, 'owner', v_inv.invited_by)
  on conflict (label_id, user_id) do update set role = excluded.role;

  -- set canonical owner and claimed_at
  update public.labels set owner_user_id = v_user_id, claimed_at = now() where id = v_inv.label_id;

  -- mark accepted
  update public.label_invitations
  set accepted_by_user_id = v_user_id, accepted_at = now()
  where id = v_inv.id;

  label_id := v_inv.label_id;
  return next;
end; $$;

-- resend_label_invite (owner/admin)
create or replace function public.resend_label_invite(
  p_invitation_id uuid
)
returns table(token text, expires_at timestamptz) language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_inv record;
  v_token text := encode(gen_random_bytes(24), 'hex');
  v_expires timestamptz := now() + interval '7 days';
begin
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

  update public.label_invitations set token = v_token, expires_at = v_expires, accepted_by_user_id = null, accepted_at = null
  where id = v_inv.id;

  token := v_token;
  expires_at := v_expires;
  return next;
end; $$;

-- revoke_label_invite (owner/admin)
create or replace function public.revoke_label_invite(
  p_invitation_id uuid
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid();
  v_inv record;
begin
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
  delete from public.label_invitations where id = v_inv.id;
end; $$;

-- Grants
grant execute on function public.request_ownership_transfer(uuid, uuid, text) to authenticated;
grant execute on function public.accept_ownership_transfer(text) to authenticated;
grant execute on function public.request_label_action(uuid, text, jsonb) to authenticated;
grant execute on function public.claim_admin_created_profile(text) to authenticated;
grant execute on function public.resend_label_invite(uuid) to authenticated;
grant execute on function public.revoke_label_invite(uuid) to authenticated;



-- Allow authenticated admins (user_roles.role='admin') to remove labels in addition to service role
create or replace function public.admin_delete_label(p_label_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth.role();
  v_user uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_role = 'service_role' then
    -- allowed
    null;
  else
    if v_user is null then
      raise exception using message = 'admin_delete_label requires authenticated admin';
    end if;

    select exists (
      select 1 from public.user_roles ur
      where ur.user_id = v_user
        and ur.role = 'admin'
    ) into v_is_admin;

    if not v_is_admin then
      raise exception using message = 'admin privileges required';
    end if;
  end if;

  if not exists (select 1 from public.labels where id = p_label_id) then
    raise exception using message = format('Label %s not found', p_label_id);
  end if;

  delete from public.label_members where label_id = p_label_id;
  delete from public.label_invitations where label_id = p_label_id;
  delete from public.managed_profiles where label_id = p_label_id;
  delete from public.ownership_transfer_requests where label_id = p_label_id;
  delete from public.deletion_requests where label_id = p_label_id;
  delete from public.label_stripe_accounts where label_id = p_label_id;

  delete from public.labels where id = p_label_id;
end;
$$;

grant execute on function public.admin_delete_label(uuid) to authenticated;

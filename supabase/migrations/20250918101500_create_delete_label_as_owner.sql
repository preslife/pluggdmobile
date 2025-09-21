-- Allow label owners to delete their label + related records
create or replace function public.delete_label_as_owner(p_label_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_is_owner boolean;
begin
  if v_uid is null then
    raise exception using message = 'You must be signed in';
  end if;

  select exists (
    select 1
    from public.label_members
    where label_id = p_label_id
      and user_id = v_uid
      and role = 'owner'
  ) into v_is_owner;

  if not v_is_owner then
    raise exception using message = 'Only label owners can delete this label';
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

grant execute on function public.delete_label_as_owner(uuid) to authenticated;

-- Admin helper for safely removing labels and related rows
set check_function_bodies = off;

create or replace function public.admin_delete_label(p_label_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := auth.role();
begin
  if v_role is distinct from 'service_role' then
    raise exception using message = 'admin_delete_label requires service role access';
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

grant execute on function public.admin_delete_label(uuid) to service_role;
-- Optional: allow supabase_admin (if present) to run from SQL editor
-- grant execute on function public.admin_delete_label(uuid) to supabase_admin;

create or replace function public.get_unified_inbox_messages(
  p_user_id uuid,
  p_provider text default null,
  p_status text default null,
  p_search text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns setof public.unified_inbox
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_requester uuid := auth.uid();
  v_provider text := nullif(p_provider, 'all');
  v_status text := nullif(p_status, 'all');
  v_limit integer := greatest(coalesce(p_limit, 50), 1);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if v_requester is null or p_user_id is null or v_requester <> p_user_id then
    raise exception 'not authorized' using errcode = '42501';
  end if;

  return query
  select *
  from public.unified_inbox ui
  where ui.user_id = p_user_id
    and (v_provider is null or ui.provider = v_provider)
    and (
      v_status is null
      or (v_status = 'unread' and ui.is_read = false)
      or (v_status = 'starred' and ui.is_starred = true)
      or (v_status not in ('unread', 'starred'))
    )
    and (
      p_search is null
      or ui.snippet ilike '%' || p_search || '%'
      or coalesce(ui.body, '') ilike '%' || p_search || '%'
      or coalesce(ui.author_name, '') ilike '%' || p_search || '%'
      or coalesce(ui.author_handle, '') ilike '%' || p_search || '%'
    )
  order by ui.created_at desc
  limit v_limit
  offset v_offset;
end;
$$;

grant execute on function public.get_unified_inbox_messages(uuid, text, text, text, integer, integer) to authenticated;

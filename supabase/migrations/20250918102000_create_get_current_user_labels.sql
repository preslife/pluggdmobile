-- Return labels the current user belongs to with metadata
create or replace function public.get_current_user_labels()
returns table (
  id uuid,
  slug text,
  name text,
  logo_url text,
  cover_image_url text,
  role text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    l.id,
    l.slug,
    l.name,
    l.logo_url,
    l.cover_image_url,
    lm.role::text as role,
    lm.created_at
  from public.labels l
  join public.label_members lm on lm.label_id = l.id
  where lm.user_id = auth.uid()
  order by lm.created_at asc;
$$;

grant execute on function public.get_current_user_labels() to authenticated;

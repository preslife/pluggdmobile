create or replace function public.label_basic_by_slug(p_slug text)
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
    l.created_at
  from public.labels l
  join public.label_members lm on lm.label_id = l.id
  where lower(l.slug) = lower(p_slug)
    and lm.user_id = auth.uid()
  limit 1;
$$;

grant execute on function public.label_basic_by_slug(text) to authenticated;

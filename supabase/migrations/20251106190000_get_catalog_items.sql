create or replace function public.get_catalog_items(
  p_owner_type text,
  p_owner_id uuid,
  p_content_type text default null,
  p_search text default null,
  p_status text default null,
  p_sort text default 'created_desc',
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  id uuid,
  title text,
  item_type text,
  status text,
  price numeric,
  sales numeric,
  revenue numeric,
  created_at timestamptz,
  updated_at timestamptz,
  cover_art_url text,
  image_url text,
  description text
)
language sql
security definer
set search_path = public
stable
as $$
with normalized as (
  select
    r.id,
    r.title,
    'release'::text as item_type,
    coalesce(r.status, 'draft') as status,
    coalesce(r.price, 0)::numeric as price,
    coalesce(r.total_plays, 0)::numeric as sales,
    coalesce(r.price, 0)::numeric * coalesce(r.total_plays, 0)::numeric as revenue,
    r.created_at,
    r.updated_at,
    r.cover_art_url,
    null::text as image_url,
    r.description
  from public.releases r
  where r.owner_type = p_owner_type
    and r.owner_id = p_owner_id

  union all

  select
    b.id,
    b.title,
    'beat'::text,
    case when b.is_published then 'live' else 'draft' end,
    coalesce(b.price, 0)::numeric,
    0::numeric as sales,
    0::numeric as revenue,
    b.created_at,
    b.updated_at,
    null::text as cover_art_url,
    b.image_url as image_url,
    b.description
  from public.beats b
  where (
      p_owner_type = 'label'
      and b.owner_type = 'label'
      and b.owner_id = p_owner_id
    )
    or (
      p_owner_type = 'profile'
      and (
        b.user_id = p_owner_id
        or (b.owner_type = 'profile' and b.owner_id = p_owner_id)
      )
    )

  union all

  select
    sp.id,
    sp.title,
    'pack'::text,
    'live'::text,
    coalesce(sp.price, 0)::numeric,
    coalesce(sp.total_downloads, 0)::numeric,
    coalesce(sp.total_revenue, 0)::numeric,
    sp.created_at,
    sp.updated_at,
    sp.cover_art_url as cover_art_url,
    sp.cover_art_url as image_url,
    sp.description
  from public.sample_packs sp
  where (
      sp.owner_type = p_owner_type and sp.owner_id = p_owner_id
    )
    or (p_owner_type = 'profile' and sp.user_id = p_owner_id)

  union all

  select
    merch.id,
    merch.title,
    'merch'::text,
    coalesce(merch.status, 'draft'),
    coalesce(merch.price, 0)::numeric,
    coalesce(merch.sales_count, 0)::numeric,
    coalesce(merch.revenue_total, 0)::numeric,
    merch.created_at,
    merch.updated_at,
    merch.image_url as cover_art_url,
    merch.image_url as image_url,
    merch.description
  from public.creator_merchandise merch
  where merch.owner_type = p_owner_type
    and merch.owner_id = p_owner_id

  union all

  select
    bundle.id,
    bundle.title,
    'bundle'::text,
    coalesce(bundle.status, 'draft'),
    coalesce(bundle.bundle_price, 0)::numeric,
    coalesce(bundle.sales_count, 0)::numeric,
    coalesce(bundle.revenue_total, 0)::numeric,
    bundle.created_at,
    bundle.updated_at,
    bundle.image_url as cover_art_url,
    bundle.image_url as image_url,
    bundle.description
  from public.creator_bundles bundle
  where bundle.owner_type = p_owner_type
    and bundle.owner_id = p_owner_id

  union all

  select
    col.id,
    col.title,
    'collectible'::text,
    coalesce(col.status, 'draft'),
    coalesce(col.price, 0)::numeric,
    coalesce(col.sales_count, 0)::numeric,
    coalesce(col.revenue_total, 0)::numeric,
    col.created_at,
    col.updated_at,
    col.digital_assets->>'cover_art_url' as cover_art_url,
    col.digital_assets->>'cover_art_url' as image_url,
    col.description
  from public.creator_collectibles col
  where col.owner_type = p_owner_type
    and col.owner_id = p_owner_id
)
select
  n.id,
  n.title,
  n.item_type,
  n.status,
  n.price,
  n.sales,
  n.revenue,
  n.created_at,
  n.updated_at,
  n.cover_art_url,
  n.image_url,
  n.description
from normalized n
where (p_content_type is null
       or (p_content_type = 'sound-packs' and n.item_type = 'pack')
       or n.item_type = p_content_type)
  and (p_status is null or p_status = 'all' or n.status = p_status)
  and (
    p_search is null
    or n.title ilike '%' || p_search || '%'
    or coalesce(n.description, '') ilike '%' || p_search || '%'
  )
order by
  case when p_sort = 'title' then lower(n.title) end asc,
  case
    when p_sort = 'revenue' then n.revenue
  end desc,
  case
    when p_sort = 'sales' then n.sales
  end desc,
  case
    when p_sort = 'updated_at' then coalesce(n.updated_at, n.created_at)
    else n.created_at
  end desc
limit greatest(p_limit, 1)
offset greatest(p_offset, 0);
$$;

grant execute on function public.get_catalog_items(text, uuid, text, text, text, text, integer, integer) to authenticated;

-- Create RPC for fetching orders with aggregated items

set check_function_bodies = off;

create or replace function public.get_orders_for_user(
  p_user_id uuid,
  p_limit integer default 20,
  p_offset integer default 0,
  p_order_id uuid default null
)
returns table (
  order_id uuid,
  created_at timestamptz,
  status text,
  total_amount numeric,
  payment_provider text,
  paid_at timestamptz,
  shipping_address jsonb,
  item_count integer,
  currency text,
  items jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_requester is null then
    raise exception 'Not authenticated';
  end if;

  select exists(
    select 1
    from user_roles
    where user_id = v_requester
      and role = 'admin'
  )
  into v_is_admin;

  if v_requester <> p_user_id and not v_is_admin then
    raise exception 'Access denied';
  end if;

  return query
  select
    o.id as order_id,
    o.created_at,
    o.status,
    coalesce(o.total_amount, 0) as total_amount,
    coalesce(o.payment_provider, 'stripe') as payment_provider,
    o.paid_at,
    o.shipping_address,
    count(oi.id) as item_count,
    'GBP'::text as currency,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'kind', oi.kind,
          'quantity', oi.quantity,
          'price', oi.price,
          'creator_id', oi.creator_id,
          'title', coalesce(sp.title, rel.title, beat.title, samp.title, 'Store item'),
          'image_url', coalesce(sp.image_url, rel.cover_art_url, beat.image_url, samp.cover_art_url)
        )
        order by oi.created_at
      ) filter (where oi.id is not null), '[]'::jsonb
    ) as items
  from orders o
  left join order_items oi on oi.order_id = o.id
  left join store_products sp on oi.product_id = sp.id
  left join releases rel on oi.product_id = rel.id
  left join beats beat on oi.product_id = beat.id
  left join sample_packs samp on oi.product_id = samp.id
  where o.user_id = p_user_id
    and (p_order_id is null or o.id = p_order_id)
  group by o.id
  order by o.created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.get_orders_for_user(uuid, integer, integer, uuid) to authenticated;
grant execute on function public.get_orders_for_user(uuid, integer, integer, uuid) to service_role;
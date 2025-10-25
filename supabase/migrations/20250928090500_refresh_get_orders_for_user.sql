-- Refresh get_orders_for_user to include store purchases and artist tips for Account Orders dashboard.
-- References: BUILD GUIDES/MASTER BUILD GUIDE -2510 (Milestones A1/A2), docs/qa-regression-checklist.md

set check_function_bodies = off;

create or replace function public.get_orders_for_user(
  p_user_id uuid,
  p_limit integer default 20,
  p_offset integer default 0,
  p_order_id uuid default null,
  p_include_tips boolean default true
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
  items jsonb,
  order_type text,
  source_details jsonb
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
  with order_rows as (
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
            'creator_id', oi.creator_id
          )
          order by oi.created_at
        ) filter (where oi.id is not null), '[]'::jsonb
      ) as items,
      'store_order'::text as order_type,
      jsonb_build_object(
        'order_id', o.id,
        'status', o.status,
        'stripe_session_id', o.stripe_session_id,
        'payment_id', o.payment_id
      ) as source_details
    from orders o
    left join order_items oi on oi.order_id = o.id
    where o.user_id = p_user_id
      and (p_order_id is null or o.id = p_order_id)
    group by o.id
  ), tip_rows as (
    select
      t.id as order_id,
      t.created_at,
      t.status,
      coalesce(t.amount, 0) as total_amount,
      'stripe'::text as payment_provider,
      t.paid_at,
      null::jsonb as shipping_address,
      1 as item_count,
      'GBP'::text as currency,
      jsonb_build_array(
        jsonb_build_object(
          'id', t.id,
          'product_id', t.release_id,
          'kind', 'artist_tip',
          'quantity', 1,
          'price', coalesce(t.amount, 0),
          'creator_id', t.artist_id,
          'fan_id', t.fan_id,
          'message', t.message
        )
      ) as items,
      'artist_tip'::text as order_type,
      jsonb_build_object(
        'tip_id', t.id,
        'artist_id', t.artist_id,
        'fan_id', t.fan_id,
        'stripe_session_id', t.stripe_session_id,
        'stripe_payment_intent_id', t.stripe_payment_intent_id
      ) as source_details
    from artist_tips t
    where p_include_tips is true
      and t.fan_id = p_user_id
  ), combined as (
    select * from order_rows
    union all
    select * from tip_rows
  )
  select
    order_id,
    created_at,
    status,
    total_amount,
    payment_provider,
    paid_at,
    shipping_address,
    item_count,
    currency,
    items,
    order_type,
    source_details
  from combined
  order by created_at desc
  limit greatest(coalesce(p_limit, 20), 1)
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.get_orders_for_user(uuid, integer, integer, uuid, boolean) to authenticated;
grant execute on function public.get_orders_for_user(uuid, integer, integer, uuid, boolean) to service_role;

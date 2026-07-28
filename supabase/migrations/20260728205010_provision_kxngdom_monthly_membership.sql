do $$
declare
  v_creator_id uuid;
  v_tier_id uuid;
begin
  select p.user_id, mt.id
    into v_creator_id, v_tier_id
  from public.profiles p
  join public.membership_tiers mt
    on mt.owner_type = 'profile'
   and mt.owner_id = p.id
  where lower(p.username) = 'kxngdom'
    and mt.slug = 'vip-supporters-fxpy'
    and mt.status = 'active';

  if v_creator_id is null or v_tier_id is null then
    raise exception 'Kxngdom VIP supporters membership tier was not found';
  end if;

  insert into public.membership_iap_products (
    creator_id,
    membership_tier_id,
    product_id,
    status,
    billing_period,
    subscription_group_id,
    price_point_cents,
    currency
  )
  values (
    v_creator_id,
    v_tier_id,
    'com.pluggd.membership.kxngdom.vip.monthly',
    'provisioned',
    'monthly',
    '22271259',
    299,
    'USD'
  )
  on conflict (product_id) do update
    set creator_id = excluded.creator_id,
        membership_tier_id = excluded.membership_tier_id,
        status = excluded.status,
        billing_period = excluded.billing_period,
        subscription_group_id = excluded.subscription_group_id,
        price_point_cents = excluded.price_point_cents,
        currency = excluded.currency,
        updated_at = now();
end
$$;

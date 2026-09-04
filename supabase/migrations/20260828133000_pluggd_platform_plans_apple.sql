-- Build 13: secure, provider-neutral PLUGGD platform plans.
-- Fan memberships and wallet credits remain separate commerce domains.

create table if not exists public.platform_pricing_config (
  id uuid primary key default gen_random_uuid(),
  tier text not null check (tier in ('free', 'starter', 'creator', 'pro')),
  monthly_price_cents integer not null default 0,
  yearly_price_cents integer not null default 0,
  currency text not null default 'GBP',
  commission_rate numeric not null default 0,
  stripe_product_id text,
  stripe_monthly_price_id text,
  stripe_yearly_price_id text,
  features jsonb not null default '[]'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tier, currency)
);

insert into public.platform_pricing_config (
  tier, monthly_price_cents, yearly_price_cents, currency,
  commission_rate, features, limits, is_active
)
values
  ('free', 0, 0, 'GBP', 20,
   '["Basic creator profile","Community access & social feed","Basic live streaming","Standard licensing templates"]'::jsonb,
   '{"max_courses":1,"max_beats_per_month":5,"max_releases_per_month":5,"max_tracks_per_release":-1}'::jsonb, true),
  ('starter', 499, 4900, 'GBP', 12.5,
   '["Unlimited beat uploads","Unlimited releases","Active beat store","Sell sample packs","Basic analytics","Basic live streaming"]'::jsonb,
   '{"max_courses":3,"max_beats_per_month":-1,"max_releases_per_month":-1,"max_tracks_per_release":-1}'::jsonb, true),
  ('creator', 1299, 12990, 'GBP', 5,
   '["Advanced live streaming","Full analytics","AI content tools","Host events","Private collaboration tools","Verified badge"]'::jsonb,
   '{"max_courses":5,"max_beats_per_month":-1,"max_releases_per_month":-1,"max_tracks_per_release":-1}'::jsonb, true),
  ('pro', 2999, 29990, 'GBP', 0,
   '["Everything in Creator","Unlimited creator tools","Full analytics & exports","Featured listings","Private collaborations","Availability calendar"]'::jsonb,
   '{"max_courses":-1,"max_beats_per_month":-1,"max_releases_per_month":-1,"max_tracks_per_release":-1}'::jsonb, true)
on conflict (tier, currency) do update set
  monthly_price_cents = excluded.monthly_price_cents,
  yearly_price_cents = excluded.yearly_price_cents,
  commission_rate = excluded.commission_rate,
  features = excluded.features,
  limits = excluded.limits,
  is_active = excluded.is_active,
  updated_at = now();

-- Feature descriptions are entitlement highlights, not a place to advertise
-- unfinished tools. Keep every storefront currency on one truthful matrix.
update public.platform_pricing_config
set features = case tier
  when 'free' then '["Basic creator profile","Community access & social feed","Basic live streaming","Standard licensing templates"]'::jsonb
  when 'starter' then '["Unlimited beat uploads","Unlimited releases","Active beat store","Sell sample packs","Basic analytics","Basic live streaming"]'::jsonb
  when 'creator' then '["Advanced live streaming","Full analytics","AI content tools","Host events","Private collaboration tools","Verified badge"]'::jsonb
  when 'pro' then '["Everything in Creator","Unlimited creator tools","Full analytics & exports","Featured listings","Private collaborations","Availability calendar"]'::jsonb
  else features
end,
updated_at = now()
where tier in ('free', 'starter', 'creator', 'pro');

alter table public.platform_pricing_config enable row level security;
drop policy if exists "Active platform pricing is public" on public.platform_pricing_config;
create policy "Active platform pricing is public"
  on public.platform_pricing_config for select to anon, authenticated
  using (is_active = true);
revoke insert, update, delete, truncate on public.platform_pricing_config from anon, authenticated;
grant select on public.platform_pricing_config to anon, authenticated;
grant all on public.platform_pricing_config to service_role;

create table if not exists public.platform_subscription_products (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('apple', 'stripe', 'google_play')),
  product_id text not null,
  tier public.subscription_tier not null check (tier <> 'free'::public.subscription_tier),
  billing_cycle text not null check (billing_cycle in ('monthly', 'yearly')),
  service_level integer not null check (service_level between 1 and 3),
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, product_id)
);

insert into public.platform_subscription_products
  (provider, product_id, tier, billing_cycle, service_level, is_active, metadata)
values
  ('apple', 'com.pluggd.mobile.plan.starter.monthly', 'starter', 'monthly', 3, true, '{"subscription_group":"PLUGGD Creator Plans"}'::jsonb),
  ('apple', 'com.pluggd.mobile.plan.starter.yearly', 'starter', 'yearly', 3, true, '{"subscription_group":"PLUGGD Creator Plans"}'::jsonb),
  ('apple', 'com.pluggd.mobile.plan.creator.monthly', 'creator', 'monthly', 2, true, '{"subscription_group":"PLUGGD Creator Plans"}'::jsonb),
  ('apple', 'com.pluggd.mobile.plan.creator.yearly', 'creator', 'yearly', 2, true, '{"subscription_group":"PLUGGD Creator Plans"}'::jsonb),
  ('apple', 'com.pluggd.mobile.plan.pro.monthly', 'pro', 'monthly', 1, true, '{"subscription_group":"PLUGGD Creator Plans"}'::jsonb),
  ('apple', 'com.pluggd.mobile.plan.pro.yearly.v2', 'pro', 'yearly', 1, true, '{"subscription_group":"PLUGGD Creator Plans"}'::jsonb)
on conflict (provider, product_id) do update set
  tier = excluded.tier,
  billing_cycle = excluded.billing_cycle,
  service_level = excluded.service_level,
  is_active = excluded.is_active,
  metadata = excluded.metadata,
  updated_at = now();

-- Stripe is mapped by provider price ID, never inferred from an amount.
insert into public.platform_subscription_products
  (provider, product_id, tier, billing_cycle, service_level, is_active)
select 'stripe', price_id, pricing.tier::public.subscription_tier,
       pricing.billing_cycle,
       case pricing.tier when 'pro' then 1 when 'creator' then 2 else 3 end,
       pricing.is_active
from (
  select tier, stripe_monthly_price_id as price_id,
         'monthly'::text as billing_cycle, is_active
  from public.platform_pricing_config
  union all
  select tier, stripe_yearly_price_id as price_id,
         'yearly'::text as billing_cycle, is_active
  from public.platform_pricing_config
) pricing
where price_id is not null and pricing.tier in ('starter', 'creator', 'pro')
on conflict (provider, product_id) do update set
  tier = excluded.tier,
  billing_cycle = excluded.billing_cycle,
  service_level = excluded.service_level,
  is_active = excluded.is_active,
  updated_at = now();

alter table public.platform_subscription_products enable row level security;
drop policy if exists "Active platform subscription products are readable" on public.platform_subscription_products;
create policy "Active platform subscription products are readable"
  on public.platform_subscription_products for select to anon, authenticated
  using (is_active = true);
revoke insert, update, delete, truncate on public.platform_subscription_products from anon, authenticated;
grant select on public.platform_subscription_products to anon, authenticated;
grant all on public.platform_subscription_products to service_role;

alter table public.user_subscriptions
  add column if not exists billing_provider text,
  add column if not exists provider_product_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_original_transaction_id text,
  add column if not exists provider_environment text,
  add column if not exists auto_renew_status boolean,
  add column if not exists grace_period_end timestamptz,
  add column if not exists stripe_product_id text,
  add column if not exists stripe_billing_cycle text,
  add column if not exists apple_product_id text,
  add column if not exists apple_original_transaction_id text,
  add column if not exists apple_transaction_id text,
  add column if not exists apple_tier public.subscription_tier,
  add column if not exists apple_status text,
  add column if not exists apple_current_period_start timestamptz,
  add column if not exists apple_current_period_end timestamptz,
  add column if not exists apple_environment text,
  add column if not exists apple_auto_renew_status boolean,
  add column if not exists apple_grace_period_end timestamptz,
  add column if not exists apple_billing_cycle text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.user_subscriptions alter column commission_rate set default 20;
update public.user_subscriptions set billing_cycle = 'yearly' where billing_cycle = 'annual';
update public.user_subscriptions
set billing_provider = 'stripe',
    provider_subscription_id = coalesce(provider_subscription_id, stripe_subscription_id),
    provider_product_id = coalesce(provider_product_id, stripe_product_id)
where stripe_subscription_id is not null and billing_provider is null;
update public.user_subscriptions subscription
set commission_rate = pricing.commission_rate
from public.platform_pricing_config pricing
where pricing.tier = subscription.tier::text
  and pricing.currency = 'GBP' and pricing.is_active = true;

alter table public.user_subscriptions drop constraint if exists user_subscriptions_source_check;
alter table public.user_subscriptions add constraint user_subscriptions_source_check
  check (source in ('stripe', 'apple', 'google_play', 'access_code', 'admin_grant', 'combined')) not valid;
alter table public.user_subscriptions drop constraint if exists user_subscriptions_billing_provider_check;
alter table public.user_subscriptions add constraint user_subscriptions_billing_provider_check
  check (billing_provider is null or billing_provider in ('stripe', 'apple', 'google_play', 'access_code', 'admin_grant')) not valid;
alter table public.user_subscriptions drop constraint if exists user_subscriptions_billing_cycle_check;
alter table public.user_subscriptions add constraint user_subscriptions_billing_cycle_check
  check (billing_cycle is null or billing_cycle in ('monthly', 'yearly', 'comped')) not valid;
alter table public.user_subscriptions drop constraint if exists user_subscriptions_apple_billing_cycle_check;
alter table public.user_subscriptions add constraint user_subscriptions_apple_billing_cycle_check
  check (apple_billing_cycle is null or apple_billing_cycle in ('monthly', 'yearly')) not valid;

create unique index if not exists user_subscriptions_apple_original_tx_unique
  on public.user_subscriptions (apple_original_transaction_id)
  where apple_original_transaction_id is not null;
create index if not exists user_subscriptions_billing_provider_idx
  on public.user_subscriptions (billing_provider, status);
create index if not exists user_subscriptions_apple_lifecycle_idx
  on public.user_subscriptions (apple_status, apple_current_period_end);

-- Paid entitlement rows are client read-only and backend owned.
drop policy if exists "System can manage subscriptions" on public.user_subscriptions;
drop policy if exists "System can insert user subscriptions" on public.user_subscriptions;
drop policy if exists "System can update user subscriptions" on public.user_subscriptions;
drop policy if exists "Users can view their own subscription" on public.user_subscriptions;
drop policy if exists "Users read own subscription" on public.user_subscriptions;
drop policy if exists "Admins read user subscriptions" on public.user_subscriptions;
create policy "Users read own subscription"
  on public.user_subscriptions for select to authenticated
  using (auth.uid() = user_id);
create policy "Admins read user subscriptions"
  on public.user_subscriptions for select to authenticated
  using (exists (
    select 1 from public.user_roles
    where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
  ));
revoke insert, update, delete, truncate on public.user_subscriptions from anon, authenticated;
grant select on public.user_subscriptions to authenticated;
grant all on public.user_subscriptions to service_role;

alter table public.iap_transactions add column if not exists product_kind text;
update public.iap_transactions
set product_kind = case when type = 'credits' then 'credits' else 'fan_membership' end
where product_kind is null;
alter table public.iap_transactions alter column product_kind set not null;
alter table public.iap_transactions drop constraint if exists iap_transactions_product_kind_check;
alter table public.iap_transactions add constraint iap_transactions_product_kind_check
  check (product_kind in ('credits', 'fan_membership', 'platform_subscription'));
create index if not exists iap_transactions_product_kind_idx
  on public.iap_transactions (product_kind, product_id, status);

create or replace function public.subscription_tier_rank(p_tier public.subscription_tier)
returns integer language sql immutable as $$
  select case p_tier
    when 'pro' then 3 when 'creator' then 2 when 'starter' then 1 else 0
  end;
$$;

create or replace function public.platform_reconcile_user_subscription(p_user_id uuid)
returns public.user_subscriptions
language plpgsql security definer set search_path = public
as $$
declare
  v_sub public.user_subscriptions%rowtype;
  v_promo public.platform_promo_entitlements%rowtype;
  v_stripe_active boolean := false;
  v_apple_active boolean := false;
  v_admin_active boolean := false;
  v_paid_active boolean := false;
  v_paid_tier public.subscription_tier := 'free';
  v_paid_provider text := null;
  v_paid_product_id text := null;
  v_paid_subscription_id text := null;
  v_paid_original_transaction_id text := null;
  v_paid_environment text := null;
  v_paid_auto_renew boolean := null;
  v_paid_grace_end timestamptz := null;
  v_paid_cycle text := null;
  v_paid_start timestamptz := null;
  v_paid_end timestamptz := null;
  v_paid_status text := 'inactive';
  v_effective_tier public.subscription_tier := 'free';
  v_effective_source text := 'stripe';
  v_effective_start timestamptz := null;
  v_effective_end timestamptz := null;
  v_effective_status text := 'active';
  v_effective_cycle text := null;
  v_commission numeric := 20;
begin
  select * into v_sub from public.user_subscriptions
  where user_id = p_user_id for update;
  if not found then
    insert into public.user_subscriptions
      (user_id, tier, status, source, billing_cycle, commission_rate)
    values (p_user_id, 'free', 'active', 'stripe', 'monthly', 20)
    returning * into v_sub;
  end if;
  select * into v_promo from public.platform_promo_entitlements
  where user_id = p_user_id for update;

  v_stripe_active := v_sub.stripe_tier is not null
    and coalesce(v_sub.stripe_status, 'inactive') in ('active', 'trialing', 'past_due', 'cancelled', 'canceled')
    and (v_sub.stripe_current_period_end is null or v_sub.stripe_current_period_end > now());
  v_apple_active := v_sub.apple_tier is not null
    and coalesce(v_sub.apple_status, 'inactive') in ('active', 'trialing', 'past_due', 'cancelled', 'canceled')
    and (v_sub.apple_current_period_end is null or v_sub.apple_current_period_end > now()
         or v_sub.apple_grace_period_end > now());
  v_admin_active := v_sub.source = 'admin_grant' and v_sub.status = 'active'
    and (v_sub.current_period_end is null or v_sub.current_period_end > now());

  if v_stripe_active then
    v_paid_active := true;
    v_paid_tier := v_sub.stripe_tier;
    v_paid_provider := 'stripe';
    v_paid_product_id := v_sub.stripe_product_id;
    v_paid_subscription_id := v_sub.stripe_subscription_id;
    v_paid_cycle := coalesce(v_sub.stripe_billing_cycle, v_sub.billing_cycle, 'monthly');
    v_paid_start := v_sub.stripe_current_period_start;
    v_paid_end := v_sub.stripe_current_period_end;
    v_paid_status := coalesce(v_sub.stripe_status, 'active');
  end if;

  if v_apple_active and (
    not v_paid_active
    or public.subscription_tier_rank(v_sub.apple_tier) > public.subscription_tier_rank(v_paid_tier)
    or (public.subscription_tier_rank(v_sub.apple_tier) = public.subscription_tier_rank(v_paid_tier)
        and coalesce(v_sub.apple_current_period_end, 'infinity'::timestamptz)
            >= coalesce(v_paid_end, 'infinity'::timestamptz))
  ) then
    v_paid_active := true;
    v_paid_tier := v_sub.apple_tier;
    v_paid_provider := 'apple';
    v_paid_product_id := v_sub.apple_product_id;
    v_paid_subscription_id := v_sub.apple_transaction_id;
    v_paid_original_transaction_id := v_sub.apple_original_transaction_id;
    v_paid_environment := v_sub.apple_environment;
    v_paid_auto_renew := v_sub.apple_auto_renew_status;
    v_paid_grace_end := v_sub.apple_grace_period_end;
    v_paid_cycle := coalesce(v_sub.apple_billing_cycle, 'monthly');
    v_paid_start := v_sub.apple_current_period_start;
    v_paid_end := v_sub.apple_current_period_end;
    v_paid_status := coalesce(v_sub.apple_status, 'active');
  end if;

  if v_promo.user_id is not null then
    if v_promo.status = 'active' and not v_promo.is_permanent
       and v_promo.ends_at is not null and v_promo.ends_at <= now() then
      update public.platform_promo_entitlements set status = 'expired'
      where user_id = p_user_id returning * into v_promo;
    end if;
    if v_promo.status = 'active' and not v_promo.is_permanent
       and v_promo.ends_at is not null and v_promo.ends_at > now()
       and v_paid_active
       and public.subscription_tier_rank(v_paid_tier) >= public.subscription_tier_rank(v_promo.tier) then
      update public.platform_promo_entitlements
      set status = 'queued', starts_at = null, ends_at = null,
          banked_months = banked_months + greatest(
            1, ceil(extract(epoch from (v_promo.ends_at - now())) / 2592000.0)::integer)
      where user_id = p_user_id returning * into v_promo;
    end if;
    if v_promo.status = 'queued' and (
       not v_paid_active
       or public.subscription_tier_rank(v_promo.tier) > public.subscription_tier_rank(v_paid_tier)) then
      update public.platform_promo_entitlements
      set status = 'active', starts_at = now(),
          ends_at = case when is_permanent then null
                    else now() + make_interval(months => greatest(banked_months, 0)) end,
          banked_months = 0
      where user_id = p_user_id returning * into v_promo;
    end if;
  end if;

  if v_paid_active then
    v_effective_tier := v_paid_tier;
    v_effective_source := case when v_stripe_active and v_apple_active then 'combined'
                               else v_paid_provider end;
    v_effective_start := v_paid_start;
    v_effective_end := v_paid_end;
    v_effective_status := v_paid_status;
    v_effective_cycle := v_paid_cycle;
  end if;
  if v_admin_active and public.subscription_tier_rank(v_sub.tier)
     > public.subscription_tier_rank(v_effective_tier) then
    v_effective_tier := v_sub.tier;
    v_effective_source := 'admin_grant';
    v_effective_start := v_sub.current_period_start;
    v_effective_end := v_sub.current_period_end;
    v_effective_status := 'active';
    v_effective_cycle := 'comped';
  end if;
  if v_promo.user_id is not null and v_promo.status = 'active'
     and (v_promo.is_permanent or v_promo.ends_at is null or v_promo.ends_at > now())
     and public.subscription_tier_rank(v_promo.tier)
         >= public.subscription_tier_rank(v_effective_tier) then
    v_effective_source := case when v_paid_active or v_admin_active then 'combined'
                               else 'access_code' end;
    v_effective_tier := v_promo.tier;
    v_effective_start := v_promo.starts_at;
    v_effective_end := v_promo.ends_at;
    v_effective_status := 'active';
    v_effective_cycle := 'comped';
  end if;

  select pricing.commission_rate into v_commission
  from public.platform_pricing_config pricing
  where pricing.tier = v_effective_tier::text and pricing.is_active = true
  order by case when pricing.currency = 'GBP' then 0 else 1 end,
           pricing.updated_at desc limit 1;
  v_commission := coalesce(v_commission, 20);

  update public.user_subscriptions set
    tier = v_effective_tier, status = v_effective_status,
    source = v_effective_source, commission_rate = v_commission,
    access_code_id = case
      when v_promo.user_id is not null and v_promo.status in ('active', 'queued')
      then v_promo.last_code_id else access_code_id end,
    current_period_start = v_effective_start,
    current_period_end = v_effective_end,
    billing_cycle = coalesce(v_effective_cycle, 'monthly'),
    billing_provider = case
      when v_effective_source in ('access_code', 'admin_grant') then v_effective_source
      else v_paid_provider end,
    provider_product_id = v_paid_product_id,
    provider_subscription_id = v_paid_subscription_id,
    provider_original_transaction_id = v_paid_original_transaction_id,
    provider_environment = v_paid_environment,
    auto_renew_status = v_paid_auto_renew,
    grace_period_end = v_paid_grace_end,
    updated_at = now()
  where user_id = p_user_id returning * into v_sub;
  return v_sub;
end;
$$;

drop function if exists public.platform_sync_stripe_subscription(
  uuid, text, text, text, timestamptz, timestamptz
);
create function public.platform_sync_stripe_subscription(
  p_user_id uuid, p_tier text, p_status text,
  p_subscription_id text default null, p_period_start timestamptz default null,
  p_period_end timestamptz default null, p_product_id text default null,
  p_billing_cycle text default 'monthly'
)
returns public.user_subscriptions
language plpgsql security definer set search_path = public
as $$
declare
  v_tier public.subscription_tier;
  v_result public.user_subscriptions%rowtype;
begin
  v_tier := case lower(coalesce(p_tier, 'free'))
    when 'starter' then 'starter'::public.subscription_tier
    when 'creator' then 'creator'::public.subscription_tier
    when 'pro' then 'pro'::public.subscription_tier
    else 'free'::public.subscription_tier end;
  insert into public.user_subscriptions (
    user_id, tier, status, source, stripe_subscription_id, stripe_product_id,
    stripe_tier, stripe_status, stripe_current_period_start,
    stripe_current_period_end, stripe_billing_cycle,
    current_period_start, current_period_end
  ) values (
    p_user_id, v_tier, coalesce(p_status, 'inactive'), 'stripe',
    p_subscription_id, p_product_id, v_tier, coalesce(p_status, 'inactive'),
    p_period_start, p_period_end,
    case when p_billing_cycle = 'annual' then 'yearly' else p_billing_cycle end,
    p_period_start, p_period_end
  ) on conflict (user_id) do update set
    stripe_subscription_id = excluded.stripe_subscription_id,
    stripe_product_id = excluded.stripe_product_id,
    stripe_tier = excluded.stripe_tier,
    stripe_status = excluded.stripe_status,
    stripe_current_period_start = excluded.stripe_current_period_start,
    stripe_current_period_end = excluded.stripe_current_period_end,
    stripe_billing_cycle = excluded.stripe_billing_cycle,
    updated_at = now();
  select * into v_result from public.platform_reconcile_user_subscription(p_user_id);
  return v_result;
end;
$$;

create or replace function public.platform_sync_apple_subscription(
  p_user_id uuid, p_product_id text, p_transaction_id text,
  p_original_transaction_id text, p_status text,
  p_period_start timestamptz default null, p_period_end timestamptz default null,
  p_environment text default null, p_auto_renew_status boolean default null,
  p_grace_period_end timestamptz default null
)
returns public.user_subscriptions
language plpgsql security definer set search_path = public
as $$
declare
  v_product public.platform_subscription_products%rowtype;
  v_result public.user_subscriptions%rowtype;
begin
  select * into v_product from public.platform_subscription_products
  where provider = 'apple' and product_id = p_product_id and is_active = true;
  if not found then raise exception 'Unknown or inactive Apple platform product'; end if;
  insert into public.user_subscriptions (
    user_id, tier, status, source, apple_product_id,
    apple_original_transaction_id, apple_transaction_id, apple_tier,
    apple_status, apple_current_period_start, apple_current_period_end,
    apple_environment, apple_auto_renew_status, apple_grace_period_end,
    apple_billing_cycle, current_period_start, current_period_end
  ) values (
    p_user_id, v_product.tier, coalesce(p_status, 'inactive'), 'apple',
    p_product_id, p_original_transaction_id, p_transaction_id,
    v_product.tier, coalesce(p_status, 'inactive'), p_period_start,
    p_period_end, p_environment, p_auto_renew_status, p_grace_period_end,
    v_product.billing_cycle, p_period_start, p_period_end
  ) on conflict (user_id) do update set
    apple_product_id = excluded.apple_product_id,
    apple_original_transaction_id = excluded.apple_original_transaction_id,
    apple_transaction_id = excluded.apple_transaction_id,
    apple_tier = excluded.apple_tier,
    apple_status = excluded.apple_status,
    apple_current_period_start = excluded.apple_current_period_start,
    apple_current_period_end = excluded.apple_current_period_end,
    apple_environment = excluded.apple_environment,
    apple_auto_renew_status = excluded.apple_auto_renew_status,
    apple_grace_period_end = excluded.apple_grace_period_end,
    apple_billing_cycle = excluded.apple_billing_cycle,
    updated_at = now();
  select * into v_result from public.platform_reconcile_user_subscription(p_user_id);
  return v_result;
end;
$$;

revoke execute on function public.platform_reconcile_user_subscription(uuid) from public, anon, authenticated;
revoke execute on function public.platform_sync_stripe_subscription(uuid, text, text, text, timestamptz, timestamptz, text, text) from public, anon, authenticated;
revoke execute on function public.platform_sync_apple_subscription(uuid, text, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz) from public, anon, authenticated;
grant execute on function public.platform_reconcile_user_subscription(uuid) to service_role;
grant execute on function public.platform_sync_stripe_subscription(uuid, text, text, text, timestamptz, timestamptz, text, text) to service_role;
grant execute on function public.platform_sync_apple_subscription(uuid, text, text, text, text, timestamptz, timestamptz, text, boolean, timestamptz) to service_role;

comment on table public.platform_subscription_products is
  'Server-owned provider product mapping for PLUGGD platform plans.';
comment on column public.iap_transactions.product_kind is
  'Separates credits, fan memberships and PLUGGD platform subscriptions.';

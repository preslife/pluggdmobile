-- Server-owned hybrid commerce policy, trusted payment records, and ticket inventory.
-- This migration intentionally adds columns before constraints so it remains safe
-- across the slightly different legacy schemas deployed in PLUGGD environments.

create table if not exists public.commerce_policy_rules (
  purchase_kind text primary key,
  enabled boolean not null default false,
  primary_rail text not null default 'unavailable',
  alternative_rail text,
  storefront_config jsonb not null default '{}'::jsonb,
  server_flags jsonb not null default '{}'::jsonb,
  required_entitlement text,
  cta text,
  policy_version text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_policy_rules_kind_check check (
    purchase_kind in (
      'credit_pack', 'release_unlock', 'tip', 'live_gift',
      'creator_membership', 'beat_license', 'event_ticket', 'physical_merch'
    )
  ),
  constraint commerce_policy_rules_primary_rail_check check (
    primary_rail in (
      'apple_iap', 'apple_subscription', 'credits',
      'stripe_checkout', 'unavailable'
    )
  ),
  constraint commerce_policy_rules_alternative_rail_check check (
    alternative_rail is null or alternative_rail in (
      'apple_iap', 'apple_subscription', 'credits',
      'stripe_checkout', 'unavailable'
    )
  )
);

insert into public.commerce_policy_rules (
  purchase_kind,
  enabled,
  primary_rail,
  alternative_rail,
  storefront_config,
  server_flags,
  required_entitlement,
  cta,
  policy_version
)
values
  (
    'credit_pack', true, 'apple_iap', null,
    '{"primary":["*"]}'::jsonb,
    '{"apple_iap_enabled":true}'::jsonb,
    'provisioned_credit_pack', 'Buy credits', '2026-07-27.1'
  ),
  (
    'release_unlock', true, 'credits', 'stripe_checkout',
    '{"primary":["*"],"alternative":["US"]}'::jsonb,
    '{"credits_enabled":true,"external_checkout_enabled":true}'::jsonb,
    null, 'Unlock release', '2026-07-27.1'
  ),
  (
    'tip', true, 'credits', null,
    '{"primary":["*"]}'::jsonb,
    '{"credits_enabled":true}'::jsonb,
    'sufficient_credit_balance', 'Send tip', '2026-07-27.1'
  ),
  (
    'live_gift', true, 'credits', null,
    '{"primary":["*"]}'::jsonb,
    '{"credits_enabled":true}'::jsonb,
    'sufficient_credit_balance', 'Send gift', '2026-07-27.1'
  ),
  (
    'creator_membership', true, 'apple_subscription', null,
    '{"primary":["*"]}'::jsonb,
    '{"apple_subscription_enabled":true,"require_provisioned_product":true}'::jsonb,
    'active_provisioned_membership_product', 'Join membership', '2026-07-27.1'
  ),
  (
    'beat_license', true, 'stripe_checkout', null,
    '{"primary":["US"]}'::jsonb,
    '{"external_checkout_enabled":true,"require_professional_license":true}'::jsonb,
    'professional_off_app_license', 'Review licence', '2026-07-27.1'
  ),
  (
    'event_ticket', true, 'stripe_checkout', null,
    '{"primary":["*"]}'::jsonb,
    '{"external_checkout_enabled":true,"require_physical_classification":true}'::jsonb,
    'verified_physical_event', 'Choose tickets', '2026-07-27.1'
  ),
  (
    'physical_merch', true, 'stripe_checkout', null,
    '{"primary":["*"]}'::jsonb,
    '{"external_checkout_enabled":true,"require_physical_classification":true}'::jsonb,
    'verified_physical_merchandise', 'Choose options', '2026-07-27.1'
  )
on conflict (purchase_kind) do update set
  enabled = excluded.enabled,
  primary_rail = excluded.primary_rail,
  alternative_rail = excluded.alternative_rail,
  storefront_config = excluded.storefront_config,
  server_flags = excluded.server_flags,
  required_entitlement = excluded.required_entitlement,
  cta = excluded.cta,
  policy_version = excluded.policy_version,
  updated_at = now();

alter table public.commerce_policy_rules enable row level security;
drop policy if exists "Service role manages commerce policy" on public.commerce_policy_rules;
create policy "Service role manages commerce policy"
  on public.commerce_policy_rules for all to service_role
  using (true) with check (true);

create table if not exists public.external_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  purchase_kind text not null,
  resource_id uuid not null,
  variant_id uuid,
  quantity integer not null default 1,
  amount_cents bigint not null,
  currency text not null,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  status text not null default 'created',
  idempotency_key text not null,
  policy_version text not null,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  provider_metadata jsonb not null default '{}'::jsonb,
  refunded_amount_cents bigint not null default 0,
  refund_reason text,
  refunded_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint external_checkout_sessions_kind_check check (
    purchase_kind in ('release_unlock', 'beat_license', 'event_ticket', 'physical_merch')
  ),
  constraint external_checkout_sessions_status_check check (
    status in (
      'created', 'open', 'completed', 'expired', 'cancelled',
      'failed', 'partially_refunded', 'refunded', 'disputed'
    )
  ),
  constraint external_checkout_sessions_amount_check check (
    amount_cents >= 0 and refunded_amount_cents >= 0
    and refunded_amount_cents <= amount_cents and quantity > 0
  ),
  constraint external_checkout_sessions_currency_check check (
    currency ~ '^[A-Z]{3}$'
  ),
  unique (idempotency_key),
  unique (stripe_checkout_session_id),
  unique (stripe_payment_intent_id)
);

alter table public.external_checkout_sessions enable row level security;
drop policy if exists "Users view own external checkout sessions" on public.external_checkout_sessions;
create policy "Users view own external checkout sessions"
  on public.external_checkout_sessions for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Service role manages external checkout sessions" on public.external_checkout_sessions;
create policy "Service role manages external checkout sessions"
  on public.external_checkout_sessions for all to service_role
  using (true) with check (true);

create index if not exists external_checkout_sessions_user_created_idx
  on public.external_checkout_sessions (user_id, created_at desc);
create index if not exists external_checkout_sessions_resource_idx
  on public.external_checkout_sessions (purchase_kind, resource_id, variant_id);

create table if not exists public.membership_iap_products (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users(id) on delete cascade,
  membership_tier_id uuid not null references public.membership_tiers(id) on delete cascade,
  product_id text not null,
  status text not null default 'draft',
  billing_period text not null default 'monthly',
  subscription_group_id text not null,
  price_point_cents integer not null,
  currency text not null default 'USD',
  legacy_product_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_iap_products_status_check check (
    status in ('draft', 'provisioning', 'provisioned', 'active', 'inactive', 'retired')
  ),
  constraint membership_iap_products_billing_period_check check (
    billing_period in ('monthly', 'yearly')
  ),
  constraint membership_iap_products_price_check check (price_point_cents > 0),
  constraint membership_iap_products_currency_check check (currency ~ '^[A-Z]{3}$'),
  unique (product_id)
);

create unique index if not exists membership_iap_products_active_tier_period_idx
  on public.membership_iap_products (membership_tier_id, billing_period)
  where status = 'active';
create index if not exists membership_iap_products_creator_idx
  on public.membership_iap_products (creator_id, status);

alter table public.membership_iap_products enable row level security;
drop policy if exists "Users view active provisioned membership products" on public.membership_iap_products;
create policy "Users view active provisioned membership products"
  on public.membership_iap_products for select to authenticated
  using (
    status = 'active'
    and product_id <> ''
    and subscription_group_id <> ''
    and price_point_cents > 0
  );
drop policy if exists "Service role manages membership IAP products" on public.membership_iap_products;
create policy "Service role manages membership IAP products"
  on public.membership_iap_products for all to service_role
  using (true) with check (true);

-- Canonical event classification is server-owned and cannot be supplied by mobile.
alter table public.events
  add column if not exists commerce_classification text not null default 'unclassified';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.events'::regclass
      and conname = 'events_commerce_classification_check'
  ) then
    alter table public.events
      add constraint events_commerce_classification_check
      check (commerce_classification in ('unclassified', 'physical', 'virtual', 'hybrid'))
      not valid;
  end if;
end
$$;

create table if not exists public.event_ticket_tiers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  description text,
  price_cents integer not null,
  fee_cents integer not null default 0,
  currency text not null default 'GBP',
  capacity integer,
  reserved_quantity integer not null default 0,
  sold_quantity integer not null default 0,
  available_quantity integer generated always as (
    case
      when capacity is null then null
      else capacity - reserved_quantity - sold_quantity
    end
  ) stored,
  max_per_order integer not null default 4,
  is_active boolean not null default false,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  refund_terms text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_ticket_tiers_price_check check (price_cents >= 0 and fee_cents >= 0),
  constraint event_ticket_tiers_inventory_check check (
    capacity is null or (
      capacity >= 0 and reserved_quantity >= 0 and sold_quantity >= 0
      and reserved_quantity + sold_quantity <= capacity
    )
  ),
  constraint event_ticket_tiers_order_limit_check check (max_per_order > 0),
  constraint event_ticket_tiers_currency_check check (currency ~ '^[A-Z]{3}$')
);

create index if not exists event_ticket_tiers_event_active_idx
  on public.event_ticket_tiers (event_id, is_active);

alter table public.event_ticket_tiers enable row level security;
drop policy if exists "Users view active physical event ticket tiers" on public.event_ticket_tiers;
create policy "Users view active physical event ticket tiers"
  on public.event_ticket_tiers for select
  using (
    is_active
    and exists (
      select 1 from public.events
      where events.id = event_ticket_tiers.event_id
        and events.commerce_classification = 'physical'
    )
  );
drop policy if exists "Service role manages event ticket tiers" on public.event_ticket_tiers;
create policy "Service role manages event ticket tiers"
  on public.event_ticket_tiers for all to service_role
  using (true) with check (true);

create table if not exists public.ticket_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  ticket_tier_id uuid not null references public.event_ticket_tiers(id) on delete restrict,
  quantity integer not null,
  unit_amount_cents integer not null,
  fee_amount_cents integer not null default 0,
  total_amount_cents integer not null,
  currency text not null,
  status text not null default 'reserved',
  reservation_expires_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  idempotency_key text not null,
  policy_version text not null,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  refunded_amount_cents integer not null default 0,
  refund_reason text,
  refunded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ticket_orders_quantity_check check (quantity > 0),
  constraint ticket_orders_amount_check check (
    unit_amount_cents >= 0 and fee_amount_cents >= 0 and total_amount_cents >= 0
    and refunded_amount_cents >= 0 and refunded_amount_cents <= total_amount_cents
  ),
  constraint ticket_orders_total_check check (
    total_amount_cents = (unit_amount_cents * quantity) + fee_amount_cents
  ),
  constraint ticket_orders_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint ticket_orders_status_check check (
    status in (
      'reserved', 'checkout_open', 'completed', 'expired', 'cancelled',
      'failed', 'partially_refunded', 'refunded', 'disputed'
    )
  ),
  unique (idempotency_key),
  unique (stripe_checkout_session_id),
  unique (stripe_payment_intent_id)
);

-- Production already has a legacy ticket_orders table. `create table if not
-- exists` intentionally leaves that table in place, so add the trusted checkout
-- fields separately before creating indexes or policies. The legacy table is
-- retained for compatibility (`tier_id`, `total_cents`, `stripe_session_id`,
-- and `qr_code_data` remain untouched). New hybrid-commerce orders always write
-- the canonical columns below.
alter table public.ticket_orders
  add column if not exists ticket_tier_id uuid
    references public.event_ticket_tiers(id) on delete restrict,
  add column if not exists unit_amount_cents integer,
  add column if not exists fee_amount_cents integer not null default 0,
  add column if not exists total_amount_cents integer,
  add column if not exists currency text not null default 'GBP',
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists idempotency_key text,
  add column if not exists policy_version text,
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists refunded_amount_cents integer not null default 0,
  add column if not exists refund_reason text,
  add column if not exists refunded_at timestamptz,
  add column if not exists completed_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ticket_orders'
      and column_name = 'total_cents'
  ) then
    execute $backfill$
      update public.ticket_orders
      set
        total_amount_cents = coalesce(total_amount_cents, total_cents),
        unit_amount_cents = coalesce(
          unit_amount_cents,
          case when quantity > 0 then total_cents / quantity else total_cents end
        )
      where total_amount_cents is null or unit_amount_cents is null
    $backfill$;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'ticket_orders'
      and column_name = 'stripe_session_id'
  ) then
    execute $backfill$
      update public.ticket_orders
      set stripe_checkout_session_id = stripe_session_id
      where stripe_checkout_session_id is null
        and stripe_session_id is not null
    $backfill$;
  end if;
end
$$;

create index if not exists ticket_orders_user_created_idx
  on public.ticket_orders (user_id, created_at desc);
create index if not exists ticket_orders_active_reservation_idx
  on public.ticket_orders (ticket_tier_id, reservation_expires_at)
  where status in ('reserved', 'checkout_open');
create unique index if not exists ticket_orders_idempotency_uidx
  on public.ticket_orders (idempotency_key)
  where idempotency_key is not null;
create unique index if not exists ticket_orders_checkout_session_uidx
  on public.ticket_orders (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists ticket_orders_payment_intent_uidx
  on public.ticket_orders (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.ticket_orders enable row level security;
drop policy if exists "Users view own ticket orders" on public.ticket_orders;
create policy "Users view own ticket orders"
  on public.ticket_orders for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Service role manages ticket orders" on public.ticket_orders;
create policy "Service role manages ticket orders"
  on public.ticket_orders for all to service_role
  using (true) with check (true);

create table if not exists public.physical_merch_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  product_id uuid not null,
  product_source text not null,
  creator_id uuid,
  quantity integer not null,
  unit_amount_cents integer not null,
  total_amount_cents integer not null,
  currency text not null,
  status text not null default 'reserved',
  reservation_expires_at timestamptz,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  idempotency_key text not null,
  policy_version text not null,
  pricing_snapshot jsonb not null default '{}'::jsonb,
  shipping_address jsonb,
  receipt_pdf_url text,
  refunded_amount_cents integer not null default 0,
  refund_reason text,
  refunded_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint physical_merch_orders_source_check check (
    product_source in ('store_products', 'creator_merchandise')
  ),
  constraint physical_merch_orders_amount_check check (
    quantity > 0 and unit_amount_cents > 0
    and total_amount_cents = unit_amount_cents * quantity
    and refunded_amount_cents between 0 and total_amount_cents
  ),
  constraint physical_merch_orders_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint physical_merch_orders_status_check check (
    status in (
      'reserved', 'checkout_open', 'completed', 'expired', 'cancelled',
      'failed', 'partially_refunded', 'refunded', 'disputed'
    )
  ),
  unique (idempotency_key),
  unique (stripe_checkout_session_id),
  unique (stripe_payment_intent_id)
);
alter table public.physical_merch_orders
  add column if not exists receipt_pdf_url text;

create index if not exists physical_merch_orders_user_created_idx
  on public.physical_merch_orders (user_id, created_at desc);
create index if not exists physical_merch_orders_product_idx
  on public.physical_merch_orders (product_source, product_id, status);

alter table public.physical_merch_orders enable row level security;
drop policy if exists "Users view own physical merchandise orders"
  on public.physical_merch_orders;
create policy "Users view own physical merchandise orders"
  on public.physical_merch_orders for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Service role manages physical merchandise orders"
  on public.physical_merch_orders;
create policy "Service role manages physical merchandise orders"
  on public.physical_merch_orders for all to service_role
  using (true) with check (true);

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  status text not null default 'processing',
  attempts integer not null default 1,
  last_error text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stripe_webhook_events_status_check check (
    status in ('processing', 'completed', 'failed')
  )
);

alter table public.stripe_webhook_events enable row level security;
drop policy if exists "Service role manages Stripe webhook events"
  on public.stripe_webhook_events;
create policy "Service role manages Stripe webhook events"
  on public.stripe_webhook_events for all to service_role
  using (true) with check (true);

alter table public.event_tickets
  add column if not exists ticket_order_id uuid references public.ticket_orders(id)
    on delete restrict,
  add column if not exists ticket_tier_id uuid references public.event_ticket_tiers(id)
    on delete restrict,
  add column if not exists quantity integer not null default 1,
  add column if not exists qr_token text,
  add column if not exists qr_token_hash text,
  add column if not exists status text not null default 'pending',
  add column if not exists issued_at timestamptz,
  add column if not exists revoked_at timestamptz;
alter table public.ticket_orders
  add column if not exists receipt_pdf_url text,
  add column if not exists checked_in_at timestamptz,
  add column if not exists inventory_released_at timestamptz;

-- Rotating ticket codes can be issued and accepted only for completed,
-- non-revoked orders. This supersedes the earlier mobile gap helper.
create or replace function public.issue_ticket_entry_token(
  p_ticket_order_id uuid
)
returns table(payload text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_order_user uuid;
  v_order_status text;
  v_token text;
  v_hash text;
  v_expires timestamptz := now() + interval '15 seconds';
begin
  if v_user is null then
    raise exception 'Authentication required';
  end if;

  select user_id, status
  into v_order_user, v_order_status
  from public.ticket_orders
  where id = p_ticket_order_id;

  if v_order_user is null or v_order_user <> v_user then
    raise exception 'Ticket order is not available for this account';
  end if;
  if v_order_status <> 'completed' then
    raise exception 'Only active paid tickets can generate an entry code';
  end if;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  insert into public.ticket_entry_tokens (
    ticket_order_id, user_id, token_hash, expires_at
  ) values (
    p_ticket_order_id, v_user, v_hash, v_expires
  );

  return query
  select 'pluggd-ticket-v1:' || p_ticket_order_id::text || ':' || v_token,
    v_expires;
end;
$$;

revoke all on function public.issue_ticket_entry_token(uuid) from public, anon;
grant execute on function public.issue_ticket_entry_token(uuid) to authenticated;

create or replace function public.verify_ticket_entry_token(p_payload text)
returns table(
  ticket_order_id uuid,
  event_id uuid,
  ticket_user_id uuid,
  ticket_status text,
  checked_in_at timestamptz,
  valid boolean,
  reason text
)
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_scanner uuid := auth.uid();
  v_parts text[];
  v_order_id uuid;
  v_token text;
  v_hash text;
  v_token_row public.ticket_entry_tokens%rowtype;
  v_event_id uuid;
  v_ticket_user_id uuid;
  v_ticket_status text;
  v_checked_in_at timestamptz;
  v_event_creator uuid;
  v_is_privileged boolean := false;
begin
  if v_scanner is null then
    raise exception 'Authentication required';
  end if;
  v_parts := string_to_array(coalesce(p_payload, ''), ':');
  if array_length(v_parts, 1) <> 3 or v_parts[1] <> 'pluggd-ticket-v1' then
    return query select null::uuid, null::uuid, null::uuid, null::text,
      null::timestamptz, false, 'Invalid dynamic ticket payload';
    return;
  end if;
  begin
    v_order_id := v_parts[2]::uuid;
  exception when others then
    return query select null::uuid, null::uuid, null::uuid, null::text,
      null::timestamptz, false, 'Invalid ticket order id';
    return;
  end;

  v_token := v_parts[3];
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');
  select * into v_token_row
  from public.ticket_entry_tokens
  where ticket_entry_tokens.ticket_order_id = v_order_id
    and token_hash = v_hash
    and used_at is null
  limit 1;
  if v_token_row.id is null then
    return query select v_order_id, null::uuid, null::uuid, null::text,
      null::timestamptz, false, 'Ticket token not found or already used';
    return;
  end if;
  if v_token_row.expires_at < now() then
    return query select v_order_id, null::uuid, v_token_row.user_id, null::text,
      null::timestamptz, false, 'Ticket token expired';
    return;
  end if;

  select o.event_id, o.user_id, o.status, o.checked_in_at
  into v_event_id, v_ticket_user_id, v_ticket_status, v_checked_in_at
  from public.ticket_orders o where o.id = v_order_id;
  if v_event_id is null then
    return query select v_order_id, null::uuid, v_token_row.user_id, null::text,
      null::timestamptz, false, 'Ticket order not found';
    return;
  end if;
  if v_ticket_status <> 'completed' then
    return query select v_order_id, v_event_id, v_ticket_user_id,
      v_ticket_status, v_checked_in_at, false, 'Ticket is no longer active';
    return;
  end if;

  select e.created_by into v_event_creator
  from public.events e where e.id = v_event_id;
  select exists (
    select 1 from public.user_roles
    where user_id = v_scanner
      and role::text in ('admin', 'promoter', 'venue')
  ) into v_is_privileged;
  if v_scanner <> v_ticket_user_id
    and coalesce(
      v_event_creator,
      '00000000-0000-0000-0000-000000000000'::uuid
    ) <> v_scanner
    and not v_is_privileged
  then
    return query select v_order_id, v_event_id, v_ticket_user_id,
      v_ticket_status, v_checked_in_at, false,
      'Scanner is not authorized for this ticket';
    return;
  end if;

  update public.ticket_orders
  set checked_in_at = coalesce(ticket_orders.checked_in_at, now()),
      updated_at = now()
  where id = v_order_id
  returning ticket_orders.checked_in_at into v_checked_in_at;
  update public.ticket_entry_tokens
  set used_at = now()
  where id = v_token_row.id and used_at is null;

  return query select v_order_id, v_event_id, v_ticket_user_id,
    v_ticket_status, v_checked_in_at, true, 'Ticket verified';
end;
$$;

revoke all on function public.verify_ticket_entry_token(text) from public, anon;
grant execute on function public.verify_ticket_entry_token(text) to authenticated;

create or replace function public.release_ticket_inventory_for_refund(
  p_ticket_order_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.ticket_orders%rowtype;
  v_sold integer;
begin
  select * into v_order from public.ticket_orders
  where id = p_ticket_order_id for update;
  if v_order.id is null then
    raise exception 'Ticket order not found';
  end if;
  if v_order.inventory_released_at is not null then
    return false;
  end if;

  select sold_quantity into v_sold from public.event_ticket_tiers
  where id = v_order.ticket_tier_id for update;
  if v_sold is null or v_sold < v_order.quantity then
    raise exception 'Ticket inventory cannot be released';
  end if;
  update public.event_ticket_tiers
  set sold_quantity = v_sold - v_order.quantity,
      updated_at = now()
  where id = v_order.ticket_tier_id;
  update public.ticket_orders
  set inventory_released_at = now(), updated_at = now()
  where id = v_order.id;
  return true;
end;
$$;

revoke all on function public.release_ticket_inventory_for_refund(uuid)
  from public, anon, authenticated;
grant execute on function public.release_ticket_inventory_for_refund(uuid)
  to service_role;

create or replace function public.finalize_paid_ticket_order(
  p_ticket_order_id uuid,
  p_payment_intent_id text,
  p_receipt_pdf_url text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.ticket_orders%rowtype;
  v_tier public.event_ticket_tiers%rowtype;
begin
  select * into v_order from public.ticket_orders
  where id = p_ticket_order_id for update;
  if v_order.id is null then
    raise exception 'Ticket order not found';
  end if;
  if v_order.status = 'completed' then
    return false;
  end if;
  if v_order.status not in ('reserved', 'checkout_open') then
    raise exception 'Ticket order cannot be completed';
  end if;

  select * into v_tier from public.event_ticket_tiers
  where id = v_order.ticket_tier_id for update;
  if v_tier.id is null or v_tier.reserved_quantity < v_order.quantity then
    raise exception 'Reserved ticket inventory is unavailable';
  end if;
  update public.event_ticket_tiers
  set reserved_quantity = v_tier.reserved_quantity - v_order.quantity,
      sold_quantity = v_tier.sold_quantity + v_order.quantity,
      updated_at = now()
  where id = v_tier.id;
  update public.ticket_orders
  set status = 'completed',
      stripe_payment_intent_id = p_payment_intent_id,
      completed_at = now(),
      reservation_expires_at = null,
      receipt_pdf_url = p_receipt_pdf_url,
      updated_at = now()
  where id = v_order.id;
  return true;
end;
$$;

revoke all on function public.finalize_paid_ticket_order(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.finalize_paid_ticket_order(uuid, text, text)
  to service_role;
alter table public.event_tickets
  drop constraint if exists event_tickets_event_id_user_id_key;
drop index if exists public.event_tickets_ticket_order_uidx;
create unique index event_tickets_ticket_order_uidx
  on public.event_tickets (ticket_order_id);
drop policy if exists "Users can create their own event tickets"
  on public.event_tickets;
drop policy if exists "Service role manages event tickets"
  on public.event_tickets;
create policy "Service role manages event tickets"
  on public.event_tickets for all to service_role
  using (true) with check (true);

-- Trusted checkout snapshots on legacy payment-owned records.
alter table public.purchases
  add column if not exists amount_cents bigint,
  add column if not exists currency text not null default 'GBP',
  add column if not exists license_type text,
  add column if not exists contract_id uuid references public.licensing_contracts(id)
    on delete restrict,
  add column if not exists permitted_rail text not null default 'stripe_checkout',
  add column if not exists status text not null default 'pending',
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists policy_version text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists idempotency_key text,
  add column if not exists refunded_amount_cents bigint not null default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists refunded_at timestamptz;
alter table public.purchases
  drop constraint if exists purchases_buyer_id_beat_id_key;
drop index if exists public.purchases_contract_uidx;
create unique index purchases_contract_uidx
  on public.purchases (contract_id);

alter table public.beat_sales
  add column if not exists amount_cents bigint,
  add column if not exists permitted_rail text not null default 'stripe_checkout',
  add column if not exists sale_status text not null default 'pending',
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists policy_version text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists idempotency_key text,
  add column if not exists refunded_amount_cents bigint not null default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists refunded_at timestamptz;

alter table public.licensing_contracts
  add column if not exists amount_cents bigint,
  add column if not exists currency text not null default 'GBP',
  add column if not exists permitted_rail text not null default 'stripe_checkout',
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists policy_version text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists idempotency_key text,
  add column if not exists refunded_amount_cents bigint not null default 0,
  add column if not exists completed_at timestamptz,
  add column if not exists refunded_at timestamptz;
alter table public.licensing_contracts
  drop constraint if exists licensing_contracts_status_check;
alter table public.licensing_contracts
  add constraint licensing_contracts_status_check check (
    status in ('pending', 'signed', 'completed', 'cancelled', 'refunded', 'revoked')
  ) not valid;

alter table public.release_purchases
  add column if not exists amount_cents bigint,
  add column if not exists currency text not null default 'GBP',
  add column if not exists permitted_rail text not null default 'credits',
  add column if not exists pricing_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists policy_version text,
  add column if not exists status text not null default 'pending',
  add column if not exists idempotency_key text,
  add column if not exists stripe_session_id text,
  add column if not exists wallet_ledger_id uuid,
  add column if not exists paid_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists refunded_amount_cents bigint not null default 0,
  add column if not exists refunded_at timestamptz;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'purchases' and column_name = 'amount'
  ) then
    execute 'update public.purchases set amount_cents = round(amount * 100)::bigint where amount_cents is null and amount is not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'beat_sales' and column_name = 'sale_price'
  ) then
    execute 'update public.beat_sales set amount_cents = round(sale_price * 100)::bigint where amount_cents is null and sale_price is not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'licensing_contracts' and column_name = 'license_fee_pence'
  ) then
    execute 'update public.licensing_contracts set amount_cents = license_fee_pence::bigint where amount_cents is null and license_fee_pence is not null';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'release_purchases' and column_name = 'amount_paid'
  ) then
    execute 'update public.release_purchases set amount_cents = round(amount_paid * 100)::bigint where amount_cents is null and amount_paid is not null';
  end if;
end
$$;

-- Partial unique indexes tolerate null legacy provider identifiers while making
-- all newly trusted provider/idempotency identifiers replay-safe.
create unique index if not exists purchases_checkout_session_uidx
  on public.purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists purchases_payment_intent_uidx
  on public.purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create unique index if not exists purchases_idempotency_uidx
  on public.purchases (idempotency_key) where idempotency_key is not null;

drop index if exists public.beat_sales_checkout_session_uidx;
create unique index beat_sales_checkout_session_uidx
  on public.beat_sales (stripe_checkout_session_id);
create unique index if not exists beat_sales_payment_intent_uidx
  on public.beat_sales (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create unique index if not exists beat_sales_idempotency_uidx
  on public.beat_sales (idempotency_key) where idempotency_key is not null;

create unique index if not exists licensing_contracts_checkout_session_uidx
  on public.licensing_contracts (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create unique index if not exists licensing_contracts_payment_intent_uidx
  on public.licensing_contracts (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create unique index if not exists licensing_contracts_idempotency_uidx
  on public.licensing_contracts (idempotency_key) where idempotency_key is not null;

create unique index if not exists release_purchases_checkout_session_uidx
  on public.release_purchases (stripe_session_id)
  where stripe_session_id is not null;
create unique index if not exists release_purchases_payment_intent_uidx
  on public.release_purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;
create unique index if not exists release_purchases_idempotency_uidx
  on public.release_purchases (idempotency_key) where idempotency_key is not null;

do $$
declare
  item record;
begin
  for item in
    select * from (values
      ('purchases', 'purchases_amount_cents_check', 'amount_cents is null or (amount_cents >= 0 and refunded_amount_cents between 0 and amount_cents)'),
      ('purchases', 'purchases_currency_check', 'currency ~ ''^[A-Z]{3}$'''),
      ('purchases', 'purchases_rail_check', 'permitted_rail = ''stripe_checkout'''),
      ('purchases', 'purchases_status_check', 'status in (''pending'',''completed'',''failed'',''cancelled'',''partially_refunded'',''refunded'',''disputed'')'),
      ('beat_sales', 'beat_sales_amount_cents_check', 'amount_cents is null or (amount_cents >= 0 and refunded_amount_cents between 0 and amount_cents)'),
      ('beat_sales', 'beat_sales_rail_check', 'permitted_rail = ''stripe_checkout'''),
      ('beat_sales', 'beat_sales_status_check', 'sale_status in (''pending'',''completed'',''failed'',''cancelled'',''partially_refunded'',''refunded'',''disputed'')'),
      ('licensing_contracts', 'licensing_contracts_amount_cents_check', 'amount_cents is null or (amount_cents >= 0 and refunded_amount_cents between 0 and amount_cents)'),
      ('licensing_contracts', 'licensing_contracts_currency_check', 'currency ~ ''^[A-Z]{3}$'''),
      ('licensing_contracts', 'licensing_contracts_rail_check', 'permitted_rail = ''stripe_checkout'''),
      ('release_purchases', 'release_purchases_amount_cents_check', 'amount_cents is null or (amount_cents >= 0 and refunded_amount_cents between 0 and amount_cents)'),
      ('release_purchases', 'release_purchases_currency_check', 'currency ~ ''^[A-Z]{3}$'''),
      ('release_purchases', 'release_purchases_rail_check', 'permitted_rail in (''credits'',''stripe_checkout'',''apple_iap'')'),
      ('release_purchases', 'release_purchases_status_check', 'status in (''pending'',''completed'',''failed'',''cancelled'',''partially_refunded'',''refunded'',''revoked'')')
    ) as checks(table_name, constraint_name, expression)
  loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('public.%I', item.table_name)::regclass
        and conname = item.constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I check (%s) not valid',
        item.table_name, item.constraint_name, item.expression
      );
    end if;
  end loop;
end
$$;

create or replace function public.has_purchased_release(
  p_user_id uuid,
  p_release_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.release_purchases
    where user_id = p_user_id
      and release_id = p_release_id
      and status = 'completed'
  );
$$;

-- Some production environments predate explicit release credit pricing.
-- Null preserves the existing GBP-price fallback used by the app and the
-- server-owned debit function below.
alter table public.releases
  add column if not exists credits_price numeric;

-- Provider callbacks and server-side wallet operations must be replay-safe.
alter table public.iap_transactions
  add column if not exists idempotency_key text;
create unique index if not exists iap_transactions_idempotency_uidx
  on public.iap_transactions (idempotency_key)
  where idempotency_key is not null;

alter table public.wallet_ledger
  add column if not exists idempotency_key text;
create unique index if not exists wallet_ledger_idempotency_uidx
  on public.wallet_ledger (idempotency_key)
  where idempotency_key is not null;

alter table public.wallet_ledger
  drop constraint if exists wallet_ledger_kind_check;
alter table public.wallet_ledger
  add constraint wallet_ledger_kind_check check (kind in (
    'topup', 'topup_iap', 'spend_tip', 'spend_purchase', 'spend_unlock',
    'spend_battle', 'award_prize', 'convert_cashout',
    'convert_sub_applied', 'spend_gift', 'earn_gift'
  )) not valid;

create or replace function public.spend_mobile_credits(
  p_user_id uuid,
  p_kind text,
  p_ref_type text,
  p_ref_id uuid,
  p_counterparty_user_id uuid,
  p_amount_credits bigint,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance bigint;
  v_expected bigint;
  v_creator uuid;
  v_ledger_id uuid;
  v_existing uuid;
begin
  if p_user_id is null or p_ref_id is null or p_amount_credits <= 0
    or coalesce(trim(p_idempotency_key), '') = '' then
    raise exception 'INVALID_CREDIT_TRANSACTION';
  end if;

  if p_kind not in ('spend_unlock', 'spend_tip') then
    raise exception 'CREDITS_NOT_PERMITTED_FOR_PURCHASE_KIND';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select id into v_existing
  from public.wallet_ledger
  where idempotency_key = p_idempotency_key;
  if v_existing is not null then
    return jsonb_build_object(
      'ledger_entry_id', v_existing,
      'duplicate', true,
      'balance', public.get_wallet_balance(p_user_id)
    );
  end if;

  if p_kind = 'spend_unlock' then
    if p_ref_type <> 'release' then
      raise exception 'CREDITS_CAN_ONLY_UNLOCK_RELEASES';
    end if;

    select
      r.user_id,
      case
        when coalesce(r.credits_price, 0) > 0 then ceil(r.credits_price)::bigint
        else ceil(coalesce(r.price, 0) * 100)::bigint
      end
    into v_creator, v_expected
    from public.releases r
    where r.id = p_ref_id
      and coalesce(r.status, 'draft') in ('published', 'live', 'approved');

    if v_creator is null or v_expected <= 0 or v_expected <> p_amount_credits then
      raise exception 'RELEASE_PRICE_OR_AVAILABILITY_CHANGED';
    end if;
    if v_creator = p_user_id then
      raise exception 'CREATORS_ALREADY_OWN_THEIR_RELEASES';
    end if;

    select wallet_ledger_id into v_existing
    from public.release_purchases
    where user_id = p_user_id
      and release_id = p_ref_id
      and status = 'completed';
    if found then
      return jsonb_build_object(
        'ledger_entry_id', v_existing,
        'already_owned', true,
        'balance', public.get_wallet_balance(p_user_id)
      );
    end if;
  else
    if p_ref_type not in ('artist', 'creator') or p_counterparty_user_id is null
      or p_counterparty_user_id = p_user_id then
      raise exception 'INVALID_TIP_RECIPIENT';
    end if;
    if not exists (
      select 1 from public.profiles where user_id = p_counterparty_user_id
    ) then
      raise exception 'TIP_RECIPIENT_NOT_FOUND';
    end if;
    v_creator := p_counterparty_user_id;
  end if;

  select coalesce(sum(amount_credits), 0)::bigint
  into v_balance
  from public.wallet_ledger
  where user_id = p_user_id;

  if v_balance < p_amount_credits then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  insert into public.wallet_ledger (
    user_id, kind, amount_credits, ref_type, ref_id,
    counterparty_user_id, idempotency_key, meta
  )
  values (
    p_user_id, p_kind, -p_amount_credits, p_ref_type, p_ref_id,
    v_creator, p_idempotency_key,
    jsonb_build_object('source', 'ios_hybrid_commerce')
  )
  returning id into v_ledger_id;

  insert into public.wallet_ledger (
    user_id, kind, amount_credits, ref_type, ref_id,
    counterparty_user_id, idempotency_key, meta
  )
  values (
    v_creator, p_kind, p_amount_credits, p_ref_type, p_ref_id,
    p_user_id, p_idempotency_key || ':creator',
    jsonb_build_object('source', 'ios_hybrid_commerce')
  );

  if p_kind = 'spend_unlock' then
    insert into public.release_purchases (
      user_id, purchaser_id, release_id, amount_paid, amount_cents,
      currency, permitted_rail, status, pricing_snapshot, policy_version,
      idempotency_key, wallet_ledger_id, purchased_at, paid_at, completed_at
    )
    values (
      p_user_id, p_user_id, p_ref_id, p_amount_credits::numeric / 100,
      p_amount_credits, 'GBP', 'credits', 'completed',
      jsonb_build_object('credits', p_amount_credits, 'credits_per_gbp', 100),
      '2026-07-27.1', p_idempotency_key, v_ledger_id, now(), now(), now()
    )
    on conflict (user_id, release_id) do update set
      amount_paid = excluded.amount_paid,
      amount_cents = excluded.amount_cents,
      currency = excluded.currency,
      permitted_rail = excluded.permitted_rail,
      status = 'completed',
      pricing_snapshot = excluded.pricing_snapshot,
      policy_version = excluded.policy_version,
      idempotency_key = excluded.idempotency_key,
      wallet_ledger_id = excluded.wallet_ledger_id,
      paid_at = now(),
      completed_at = now();
  end if;

  return jsonb_build_object(
    'ledger_entry_id', v_ledger_id,
    'duplicate', false,
    'balance', public.get_wallet_balance(p_user_id)
  );
end;
$$;

revoke all on function public.spend_mobile_credits(
  uuid, text, text, uuid, uuid, bigint, text
) from public, anon, authenticated;
grant execute on function public.spend_mobile_credits(
  uuid, text, text, uuid, uuid, bigint, text
) to service_role;

-- Remove legacy client-write policies from payment-owned records. Authenticated
-- users retain read access to their own records; only service_role may mutate.
alter table public.purchases enable row level security;
drop policy if exists "Users can create their own purchases" on public.purchases;
drop policy if exists "System can manage purchases" on public.purchases;
drop policy if exists "Admins can manage all purchases" on public.purchases;
drop policy if exists "Admins can view all purchases" on public.purchases;
create policy "Admins can view all purchases"
  on public.purchases for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
drop policy if exists "Service role manages purchases" on public.purchases;
create policy "Service role manages purchases"
  on public.purchases for all to service_role
  using (true) with check (true);

alter table public.beat_sales enable row level security;
drop policy if exists "System can insert beat sales" on public.beat_sales;
drop policy if exists "System can update beat sales" on public.beat_sales;
drop policy if exists "Admins can manage all beat sales" on public.beat_sales;
drop policy if exists "Admins can view all beat sales" on public.beat_sales;
create policy "Admins can view all beat sales"
  on public.beat_sales for select
  using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
drop policy if exists "Service role manages beat sales" on public.beat_sales;
create policy "Service role manages beat sales"
  on public.beat_sales for all to service_role
  using (true) with check (true);

alter table public.licensing_contracts enable row level security;
drop policy if exists "Users can create contracts for their beats" on public.licensing_contracts;
drop policy if exists "Contract parties can update their contracts" on public.licensing_contracts;
drop policy if exists "Service role manages licensing contracts" on public.licensing_contracts;
create policy "Service role manages licensing contracts"
  on public.licensing_contracts for all to service_role
  using (true) with check (true);

alter table public.release_purchases enable row level security;
drop policy if exists "Users can create their own purchases" on public.release_purchases;
drop policy if exists "Service role manages release purchases" on public.release_purchases;
create policy "Service role manages release purchases"
  on public.release_purchases for all to service_role
  using (true) with check (true);

alter table public.iap_transactions enable row level security;
drop policy if exists "Service role full access to iap_transactions" on public.iap_transactions;
create policy "Service role full access to iap_transactions"
  on public.iap_transactions for all to service_role
  using (true) with check (true);

alter table public.wallet_ledger enable row level security;
drop policy if exists "system_insert_ledger" on public.wallet_ledger;
drop policy if exists "Service role manages wallet ledger" on public.wallet_ledger;
create policy "Service role manages wallet ledger"
  on public.wallet_ledger for all to service_role
  using (true) with check (true);

alter table public.fan_subscriptions enable row level security;
drop policy if exists "fan can insert own subscription" on public.fan_subscriptions;
drop policy if exists "fan can update own subscription" on public.fan_subscriptions;
drop policy if exists "fan can delete own subscription" on public.fan_subscriptions;
drop policy if exists "system_manage_fan_subs" on public.fan_subscriptions;
drop policy if exists "Service role manages fan subscriptions" on public.fan_subscriptions;
create policy "Service role manages fan subscriptions"
  on public.fan_subscriptions for all to service_role
  using (true) with check (true);

drop policy if exists "System can manage receipts" on storage.objects;
create policy "Service role manages receipts"
  on storage.objects for all to service_role
  using (bucket_id = 'receipts')
  with check (bucket_id = 'receipts');

-- Financial ledgers and payout instructions must never be client-writable.
alter table public.producer_earnings enable row level security;
drop policy if exists "System can manage producer earnings"
  on public.producer_earnings;
drop policy if exists "Service role manages producer earnings"
  on public.producer_earnings;
create policy "Service role manages producer earnings"
  on public.producer_earnings for all to service_role
  using (true) with check (true);

alter table public.producer_payouts enable row level security;
drop policy if exists "System can create producer payouts"
  on public.producer_payouts;
drop policy if exists "System can update producer payouts"
  on public.producer_payouts;
drop policy if exists "Service role manages producer payouts"
  on public.producer_payouts;
create policy "Service role manages producer payouts"
  on public.producer_payouts for all to service_role
  using (true) with check (true);

create table if not exists public.credit_cashout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  amount_credits bigint not null,
  gross_amount_cents bigint not null,
  commission_amount_cents bigint not null,
  net_amount_cents bigint not null,
  currency text not null default 'GBP',
  status text not null default 'pending',
  idempotency_key text not null unique,
  stripe_transfer_id text unique,
  failure_reason text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint credit_cashout_amount_check check (
    amount_credits >= 1000
    and gross_amount_cents = amount_credits
    and commission_amount_cents >= 0
    and net_amount_cents =
      gross_amount_cents - commission_amount_cents
    and net_amount_cents > 0
  ),
  constraint credit_cashout_currency_check check (currency ~ '^[A-Z]{3}$'),
  constraint credit_cashout_status_check check (
    status in ('pending', 'processing', 'completed', 'failed')
  )
);
create unique index if not exists credit_cashout_requests_one_open_idx
  on public.credit_cashout_requests (user_id)
  where status in ('pending', 'processing', 'failed');
alter table public.credit_cashout_requests enable row level security;
drop policy if exists "Users view own credit cashouts"
  on public.credit_cashout_requests;
create policy "Users view own credit cashouts"
  on public.credit_cashout_requests for select to authenticated
  using (auth.uid() = user_id);
drop policy if exists "Service role manages credit cashouts"
  on public.credit_cashout_requests;
create policy "Service role manages credit cashouts"
  on public.credit_cashout_requests for all to service_role
  using (true) with check (true);

create or replace function public.reserve_mobile_credit_cashout(
  p_user_id uuid,
  p_amount_credits bigint,
  p_commission_rate numeric,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_existing public.credit_cashout_requests%rowtype;
  v_balance bigint;
  v_commission bigint;
  v_request public.credit_cashout_requests%rowtype;
begin
  if p_user_id is null or p_amount_credits < 1000 then
    raise exception 'Invalid cash-out request';
  end if;
  if p_commission_rate < 0 or p_commission_rate >= 100 then
    raise exception 'Invalid cash-out commission';
  end if;
  if p_idempotency_key is null or length(p_idempotency_key) < 8 then
    raise exception 'Invalid idempotency key';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  select * into v_existing from public.credit_cashout_requests
  where idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    return jsonb_build_object(
      'request_id', v_existing.id,
      'status', v_existing.status,
      'net_amount_cents', v_existing.net_amount_cents,
      'duplicate', true
    );
  end if;
  select * into v_existing from public.credit_cashout_requests
  where user_id = p_user_id
    and status in ('pending', 'processing', 'failed')
  order by created_at desc
  limit 1;
  if v_existing.id is not null then
    return jsonb_build_object(
      'request_id', v_existing.id,
      'status', v_existing.status,
      'net_amount_cents', v_existing.net_amount_cents,
      'duplicate', true
    );
  end if;

  v_balance := coalesce(
    (public.get_wallet_balance(p_user_id)->>'available_credits')::bigint,
    0
  );
  if v_balance < p_amount_credits then
    raise exception 'Insufficient available credits';
  end if;
  v_commission := round(p_amount_credits * p_commission_rate / 100);

  insert into public.wallet_ledger (
    user_id, kind, amount_credits, ref_type, idempotency_key, meta
  ) values (
    p_user_id, 'convert_cashout', -p_amount_credits, 'cashout',
    p_idempotency_key || ':ledger',
    jsonb_build_object(
      'gross_amount_cents', p_amount_credits,
      'commission_amount_cents', v_commission,
      'net_amount_cents', p_amount_credits - v_commission,
      'source', 'ios_hybrid_commerce'
    )
  );

  insert into public.credit_cashout_requests (
    user_id, amount_credits, gross_amount_cents,
    commission_amount_cents, net_amount_cents, idempotency_key
  ) values (
    p_user_id, p_amount_credits, p_amount_credits,
    v_commission, p_amount_credits - v_commission, p_idempotency_key
  ) returning * into v_request;

  return jsonb_build_object(
    'request_id', v_request.id,
    'status', v_request.status,
    'net_amount_cents', v_request.net_amount_cents,
    'duplicate', false
  );
end;
$$;

revoke all on function public.reserve_mobile_credit_cashout(
  uuid, bigint, numeric, text
) from public, anon, authenticated;
grant execute on function public.reserve_mobile_credit_cashout(
  uuid, bigint, numeric, text
) to service_role;

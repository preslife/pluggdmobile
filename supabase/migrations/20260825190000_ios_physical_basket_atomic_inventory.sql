-- Source authority for the official iOS physical basket.
-- Deployment is intentionally separate from this migration's review.

alter table public.store_products
  add column if not exists creator_id uuid,
  add column if not exists visibility text,
  add column if not exists moderation_status text,
  add column if not exists currency text,
  add column if not exists owner_type text;

update public.store_products
set
  visibility = coalesce(visibility, 'public'),
  moderation_status = coalesce(moderation_status, 'approved'),
  currency = upper(coalesce(nullif(currency, ''), 'GBP')),
  owner_type = coalesce(
    nullif(owner_type, ''),
    case when creator_id is null then 'pluggd' else 'creator' end
  )
where
  visibility is null
  or moderation_status is null
  or currency is null
  or currency = ''
  or owner_type is null
  or owner_type = '';

alter table public.store_products
  alter column visibility set default 'public',
  alter column visibility set not null,
  alter column moderation_status set default 'approved',
  alter column moderation_status set not null,
  alter column currency set default 'GBP',
  alter column currency set not null,
  alter column owner_type set default 'pluggd',
  alter column owner_type set not null;

alter table public.order_items
  add column if not exists selected_options jsonb,
  add column if not exists selected_option_ids uuid[];

update public.order_items
set
  selected_options = coalesce(selected_options, '{}'::jsonb),
  selected_option_ids = coalesce(selected_option_ids, '{}'::uuid[])
where selected_options is null or selected_option_ids is null;

alter table public.order_items
  alter column selected_options set default '{}'::jsonb,
  alter column selected_options set not null,
  alter column selected_option_ids set default '{}'::uuid[],
  alter column selected_option_ids set not null;

create or replace function public.prepare_ios_physical_basket_checkout(
  p_checkout_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_checkout public.external_checkout_sessions%rowtype;
  v_metadata jsonb;
  v_reservation jsonb;
  v_items jsonb;
  v_item jsonb;
  v_state text;
  v_id uuid;
  v_order_id uuid;
  v_quantity integer;
  v_stock integer;
  v_unit_amount_cents bigint;
  v_snapshot_total bigint := 0;
  v_option_id_text text;
  v_selected_option_ids uuid[];
begin
  select *
  into v_checkout
  from public.external_checkout_sessions
  where id = p_checkout_id
  for update;

  if not found
    or v_checkout.purchase_kind <> 'physical_merch'
    or coalesce((v_checkout.provider_metadata ->> 'ios_physical_basket')::boolean, false) is not true
  then
    raise exception 'Trusted iOS physical basket checkout was not found';
  end if;

  v_metadata := coalesce(v_checkout.provider_metadata, '{}'::jsonb);
  v_state := coalesce(v_metadata ->> 'inventory_state', 'planned');
  if v_state in ('reserved', 'consumed') and nullif(v_metadata ->> 'order_id', '') is not null then
    return jsonb_build_object(
      'inventory_state', v_state,
      'order_id', v_metadata ->> 'order_id'
    );
  end if;
  if v_state <> 'planned'
    or v_checkout.status <> 'open'
    or nullif(v_checkout.stripe_checkout_session_id, '') is null
    or nullif(v_metadata ->> 'checkout_url', '') is null
  then
    raise exception 'Physical basket is not eligible for preparation';
  end if;

  v_reservation := v_metadata -> 'reservation';
  if jsonb_typeof(v_reservation) <> 'object'
    or jsonb_typeof(v_reservation -> 'products') <> 'array'
    or jsonb_array_length(v_reservation -> 'products') < 1
    or jsonb_typeof(v_reservation -> 'options') <> 'array'
  then
    raise exception 'Physical basket reservation is invalid';
  end if;

  for v_item in
    select value
    from jsonb_array_elements(v_reservation -> 'products')
    order by value ->> 'id'
  loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'quantity', '') !~ '^[1-9][0-9]*$'
    then
      raise exception 'Physical basket product reservation is invalid';
    end if;
    begin
      v_id := (v_item ->> 'id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'Physical basket product reservation is invalid';
    end;
    if v_quantity > 80 then
      raise exception 'Physical basket product reservation is invalid';
    end if;
    if (
      select count(*)
      from jsonb_array_elements(v_reservation -> 'products') duplicate
      where duplicate ->> 'id' = v_id::text
    ) <> 1 then
      raise exception 'Physical basket product reservation contains duplicates';
    end if;

    select stock_quantity
    into v_stock
    from public.store_products
    where id = v_id
    for update;
    if not found or v_stock is null or v_stock < v_quantity then
      raise exception 'Not enough physical product stock remains';
    end if;
    update public.store_products
    set stock_quantity = v_stock - v_quantity
    where id = v_id;
  end loop;

  for v_item in
    select value
    from jsonb_array_elements(v_reservation -> 'options')
    order by value ->> 'id'
  loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'quantity', '') !~ '^[1-9][0-9]*$'
    then
      raise exception 'Physical basket option reservation is invalid';
    end if;
    begin
      v_id := (v_item ->> 'id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
    exception when others then
      raise exception 'Physical basket option reservation is invalid';
    end;
    if v_quantity > 80 then
      raise exception 'Physical basket option reservation is invalid';
    end if;
    if (
      select count(*)
      from jsonb_array_elements(v_reservation -> 'options') duplicate
      where duplicate ->> 'id' = v_id::text
    ) <> 1 then
      raise exception 'Physical basket option reservation contains duplicates';
    end if;

    select stock_quantity
    into v_stock
    from public.product_options
    where id = v_id
    for update;
    if not found or v_stock is null or v_stock < v_quantity then
      raise exception 'Not enough physical option stock remains';
    end if;
    update public.product_options
    set stock_quantity = v_stock - v_quantity
    where id = v_id;
  end loop;

  v_items := v_checkout.pricing_snapshot -> 'items';
  if jsonb_typeof(v_items) <> 'array'
    or jsonb_array_length(v_items) < 1
    or jsonb_array_length(v_items) > 20
  then
    raise exception 'Physical basket pricing snapshot is invalid';
  end if;

  insert into public.orders (
    user_id,
    total_amount,
    status,
    payment_provider,
    shipping_address
  ) values (
    v_checkout.user_id,
    v_checkout.amount_cents::numeric / 100,
    'pending',
    'stripe',
    null
  )
  returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(v_items)
  loop
    if jsonb_typeof(v_item) <> 'object'
      or coalesce(v_item ->> 'quantity', '') !~ '^[1-9][0-9]*$'
      or coalesce(v_item ->> 'unit_amount_cents', '') !~ '^[1-9][0-9]*$'
      or jsonb_typeof(v_item -> 'selected_options') <> 'object'
      or jsonb_typeof(v_item -> 'selected_option_ids') <> 'array'
    then
      raise exception 'Physical basket order snapshot is invalid';
    end if;
    begin
      v_id := (v_item ->> 'product_id')::uuid;
      v_quantity := (v_item ->> 'quantity')::integer;
      v_unit_amount_cents := (v_item ->> 'unit_amount_cents')::bigint;
    exception when others then
      raise exception 'Physical basket order snapshot is invalid';
    end;
    if v_quantity > 4 or v_unit_amount_cents < 1 then
      raise exception 'Physical basket order snapshot is invalid';
    end if;

    v_selected_option_ids := '{}'::uuid[];
    for v_option_id_text in
      select value #>> '{}'
      from jsonb_array_elements(v_item -> 'selected_option_ids')
    loop
      begin
        v_selected_option_ids := array_append(
          v_selected_option_ids,
          v_option_id_text::uuid
        );
      exception when others then
        raise exception 'Physical basket option snapshot is invalid';
      end;
    end loop;

    insert into public.order_items (
      order_id,
      product_id,
      quantity,
      price,
      creator_id,
      kind,
      selected_options,
      selected_option_ids
    ) values (
      v_order_id,
      v_id,
      v_quantity,
      v_unit_amount_cents::numeric / 100,
      null,
      'ios_physical_basket',
      v_item -> 'selected_options',
      v_selected_option_ids
    );
    v_snapshot_total := v_snapshot_total + (v_unit_amount_cents * v_quantity);
  end loop;

  if v_snapshot_total <> v_checkout.amount_cents then
    raise exception 'Physical basket trusted total is inconsistent';
  end if;

  v_metadata := jsonb_set(v_metadata, '{inventory_state}', '"reserved"'::jsonb, true);
  v_metadata := jsonb_set(v_metadata, '{inventory_reserved_at}', to_jsonb(now()), true);
  v_metadata := jsonb_set(v_metadata, '{order_id}', to_jsonb(v_order_id::text), true);
  update public.external_checkout_sessions
  set provider_metadata = v_metadata, updated_at = now()
  where id = v_checkout.id;

  return jsonb_build_object(
    'inventory_state', 'reserved',
    'order_id', v_order_id
  );
end;
$$;

create or replace function public.release_ios_physical_basket_inventory(
  p_checkout_id uuid,
  p_checkout_status text,
  p_order_status text,
  p_refunded_amount_cents bigint default null,
  p_refund_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_checkout public.external_checkout_sessions%rowtype;
  v_metadata jsonb;
  v_reservation jsonb;
  v_item jsonb;
  v_state text;
  v_id uuid;
  v_order_id uuid;
  v_quantity integer;
  v_stock integer;
  v_rows integer;
begin
  if p_checkout_status not in ('failed', 'expired', 'cancelled', 'refunded')
    or p_order_status not in ('cancelled', 'refunded')
    or (p_checkout_status = 'refunded' and p_order_status <> 'refunded')
    or (p_checkout_status <> 'refunded' and p_order_status <> 'cancelled')
  then
    raise exception 'Unsupported physical basket release transition';
  end if;

  select *
  into v_checkout
  from public.external_checkout_sessions
  where id = p_checkout_id
  for update;
  if not found
    or v_checkout.purchase_kind <> 'physical_merch'
    or coalesce((v_checkout.provider_metadata ->> 'ios_physical_basket')::boolean, false) is not true
  then
    raise exception 'Trusted iOS physical basket checkout was not found';
  end if;

  v_metadata := coalesce(v_checkout.provider_metadata, '{}'::jsonb);
  v_state := coalesce(v_metadata ->> 'inventory_state', 'planned');
  if v_checkout.status = 'refunded' and p_checkout_status <> 'refunded' then
    return jsonb_build_object('inventory_state', v_state, 'status', v_checkout.status);
  end if;
  if v_state not in ('planned', 'reserved', 'consumed', 'released') then
    raise exception 'Physical basket inventory requires manual reconciliation';
  end if;

  if v_state in ('reserved', 'consumed') then
    v_reservation := v_metadata -> 'reservation';
    if jsonb_typeof(v_reservation) <> 'object'
      or jsonb_typeof(v_reservation -> 'products') <> 'array'
      or jsonb_typeof(v_reservation -> 'options') <> 'array'
    then
      raise exception 'Physical basket reservation is invalid';
    end if;

    for v_item in
      select value
      from jsonb_array_elements(v_reservation -> 'products')
      order by value ->> 'id'
    loop
      begin
        v_id := (v_item ->> 'id')::uuid;
        v_quantity := (v_item ->> 'quantity')::integer;
      exception when others then
        raise exception 'Physical basket product reservation is invalid';
      end;
      if v_quantity < 1 or v_quantity > 80 then
        raise exception 'Physical basket product reservation is invalid';
      end if;
      select stock_quantity into v_stock
      from public.store_products where id = v_id for update;
      if not found or v_stock is null then
        raise exception 'Reserved physical product is unavailable';
      end if;
      update public.store_products
      set stock_quantity = v_stock + v_quantity
      where id = v_id;
    end loop;

    for v_item in
      select value
      from jsonb_array_elements(v_reservation -> 'options')
      order by value ->> 'id'
    loop
      begin
        v_id := (v_item ->> 'id')::uuid;
        v_quantity := (v_item ->> 'quantity')::integer;
      exception when others then
        raise exception 'Physical basket option reservation is invalid';
      end;
      if v_quantity < 1 or v_quantity > 80 then
        raise exception 'Physical basket option reservation is invalid';
      end if;
      select stock_quantity into v_stock
      from public.product_options where id = v_id for update;
      if not found or v_stock is null then
        raise exception 'Reserved physical option is unavailable';
      end if;
      update public.product_options
      set stock_quantity = v_stock + v_quantity
      where id = v_id;
    end loop;
  end if;

  if nullif(v_metadata ->> 'order_id', '') is not null then
    begin
      v_order_id := (v_metadata ->> 'order_id')::uuid;
    exception when others then
      raise exception 'Physical basket order link is invalid';
    end;
    update public.orders
    set status = p_order_status, updated_at = now()
    where id = v_order_id and user_id = v_checkout.user_id;
    get diagnostics v_rows = row_count;
    if v_rows <> 1 then
      raise exception 'Physical basket order could not be reconciled';
    end if;
  end if;

  v_metadata := jsonb_set(v_metadata, '{inventory_state}', '"released"'::jsonb, true);
  v_metadata := jsonb_set(v_metadata, '{inventory_released_at}', to_jsonb(now()), true);
  update public.external_checkout_sessions
  set
    status = p_checkout_status,
    provider_metadata = v_metadata,
    refunded_amount_cents = case
      when p_checkout_status = 'refunded' then least(
        amount_cents,
        greatest(coalesce(p_refunded_amount_cents, amount_cents), 0)
      )
      else refunded_amount_cents
    end,
    refund_reason = case
      when p_checkout_status = 'refunded' then coalesce(p_refund_reason, 'refund')
      else refund_reason
    end,
    refunded_at = case
      when p_checkout_status = 'refunded' then coalesce(refunded_at, now())
      else refunded_at
    end,
    updated_at = now()
  where id = v_checkout.id;

  return jsonb_build_object(
    'inventory_state', 'released',
    'status', p_checkout_status,
    'order_id', v_order_id
  );
end;
$$;

create or replace function public.complete_ios_physical_basket_checkout(
  p_checkout_id uuid,
  p_session_id text,
  p_payment_intent_id text,
  p_paid_total_cents bigint,
  p_shipping_address jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_checkout public.external_checkout_sessions%rowtype;
  v_metadata jsonb;
  v_state text;
  v_order_id uuid;
  v_rows integer;
begin
  if nullif(p_session_id, '') is null
    or nullif(p_payment_intent_id, '') is null
    or p_paid_total_cents < 1
    or jsonb_typeof(p_shipping_address) <> 'object'
    or jsonb_typeof(p_shipping_address -> 'address') <> 'object'
  then
    raise exception 'Physical basket completion payload is invalid';
  end if;

  select *
  into v_checkout
  from public.external_checkout_sessions
  where id = p_checkout_id
  for update;
  if not found
    or v_checkout.purchase_kind <> 'physical_merch'
    or coalesce((v_checkout.provider_metadata ->> 'ios_physical_basket')::boolean, false) is not true
  then
    raise exception 'Trusted iOS physical basket checkout was not found';
  end if;
  if v_checkout.stripe_checkout_session_id is not null
    and v_checkout.stripe_checkout_session_id <> p_session_id
  then
    raise exception 'Physical basket provider session does not match';
  end if;
  if v_checkout.status = 'completed'
    and v_checkout.stripe_payment_intent_id = p_payment_intent_id
  then
    return jsonb_build_object('status', 'completed');
  end if;
  if v_checkout.status in ('partially_refunded', 'refunded', 'disputed') then
    raise exception 'Reversed physical basket cannot be completed';
  end if;
  if v_checkout.status not in ('created', 'open') then
    raise exception 'Physical basket is not eligible for completion';
  end if;

  v_metadata := coalesce(v_checkout.provider_metadata, '{}'::jsonb);
  v_state := coalesce(v_metadata ->> 'inventory_state', 'planned');
  if v_state <> 'reserved' or nullif(v_metadata ->> 'order_id', '') is null then
    raise exception 'Physical basket inventory is not reserved';
  end if;
  if p_paid_total_cents < v_checkout.amount_cents then
    raise exception 'Physical basket provider total is invalid';
  end if;
  begin
    v_order_id := (v_metadata ->> 'order_id')::uuid;
  exception when others then
    raise exception 'Physical basket order link is invalid';
  end;

  update public.orders
  set
    status = 'completed',
    total_amount = p_paid_total_cents::numeric / 100,
    paid_at = now(),
    payment_id = p_session_id,
    stripe_session_id = p_session_id,
    shipping_address = p_shipping_address,
    updated_at = now()
  where id = v_order_id and user_id = v_checkout.user_id;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'Physical basket order was not finalized';
  end if;

  v_metadata := jsonb_set(v_metadata, '{inventory_state}', '"consumed"'::jsonb, true);
  v_metadata := jsonb_set(v_metadata, '{inventory_consumed_at}', to_jsonb(now()), true);
  v_metadata := jsonb_set(v_metadata, '{paid_total_cents}', to_jsonb(p_paid_total_cents), true);
  update public.external_checkout_sessions
  set
    status = 'completed',
    stripe_checkout_session_id = p_session_id,
    stripe_payment_intent_id = p_payment_intent_id,
    completed_at = coalesce(completed_at, now()),
    provider_metadata = v_metadata,
    updated_at = now()
  where id = v_checkout.id;

  return jsonb_build_object('status', 'completed', 'order_id', v_order_id);
end;
$$;

revoke all on function public.prepare_ios_physical_basket_checkout(uuid)
  from public, anon, authenticated;
revoke all on function public.release_ios_physical_basket_inventory(uuid, text, text, bigint, text)
  from public, anon, authenticated;
revoke all on function public.complete_ios_physical_basket_checkout(uuid, text, text, bigint, jsonb)
  from public, anon, authenticated;

grant execute on function public.prepare_ios_physical_basket_checkout(uuid)
  to service_role;
grant execute on function public.release_ios_physical_basket_inventory(uuid, text, text, bigint, text)
  to service_role;
grant execute on function public.complete_ios_physical_basket_checkout(uuid, text, text, bigint, jsonb)
  to service_role;

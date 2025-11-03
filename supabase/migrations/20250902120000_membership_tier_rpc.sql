-- Migrations for membership tier RPC functions wiring stripe sync queue
set search_path = public;

create or replace function public.create_membership_tier(p_input jsonb)
returns membership_tiers
language plpgsql
security definer
as $$
declare
  v_actor uuid := auth.uid();
  v_owner_type text := coalesce(p_input->>'owner_type', '');
  v_owner_id uuid := nullif(p_input->>'owner_id', '')::uuid;
  v_name text := coalesce(trim(p_input->>'name'), '');
  v_description text := nullif(trim(p_input->>'description'), '');
  v_slug text := coalesce(trim(p_input->>'slug'), '');
  v_currency text := upper(coalesce(p_input->>'currency', 'USD'));
  v_status text := coalesce(p_input->>'status', 'draft');
  v_order integer := coalesce((p_input->>'tier_order')::integer, 0);
  v_price_monthly integer := case when p_input ? 'price_monthly' then (p_input->>'price_monthly')::integer else null end;
  v_price_yearly integer := case when p_input ? 'price_yearly' then (p_input->>'price_yearly')::integer else null end;
  v_price_lifetime integer := case when p_input ? 'price_lifetime' then (p_input->>'price_lifetime')::integer else null end;
  v_max_members integer := case when p_input ? 'max_members' then (p_input->>'max_members')::integer else null end;
  v_color text := nullif(trim(p_input->>'color'), '');
  v_emoji text := nullif(trim(p_input->>'emoji'), '');
  v_image_url text := nullif(trim(p_input->>'image_url'), '');
  v_features jsonb := coalesce(p_input->'features', '[]'::jsonb);
  v_inserted membership_tiers;
  v_payload jsonb;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using detail = json_build_object('code', 'not_authenticated')::text;
  end if;

  if v_owner_type not in ('profile', 'label') then
    raise exception 'invalid_owner_type' using detail = json_build_object('code', 'invalid_owner_type')::text;
  end if;

  if v_owner_id is null then
    raise exception 'invalid_owner_id' using detail = json_build_object('code', 'invalid_owner_id')::text;
  end if;

  if v_name = '' then
    raise exception 'name_required' using detail = json_build_object('code', 'name_required')::text;
  end if;


  if jsonb_typeof(v_features) <> 'array' then
    v_features := '[]'::jsonb;
  else
    v_features := (
      select coalesce(jsonb_agg(trim(value)) filter (where trim(value) <> ''), '[]'::jsonb)
      from jsonb_array_elements_text(v_features)
    );
  end if;

  if coalesce(v_price_monthly, 0) < 0 or coalesce(v_price_yearly, 0) < 0 or coalesce(v_price_lifetime, 0) < 0 then
    raise exception 'invalid_price_format' using detail = json_build_object('code', 'invalid_price_format')::text;
  end if;
  if exists (
    select 1
    from membership_tiers mt
    where mt.owner_type = v_owner_type
      and mt.owner_id = v_owner_id
      and mt.slug = v_slug
  ) then
    raise exception 'duplicate_slug'
      using detail = json_build_object('code', 'duplicate_slug', 'slug', v_slug)::text;
  end if;

  insert into membership_tiers (
    owner_type,
    owner_id,
    name,
    slug,
    description,
    tier_order,
    price_monthly,
    price_yearly,
    price_lifetime,
    currency,
    status,
    max_members,
    color,
    emoji,
    image_url,
    features,
    stripe_sync_status
  )
  values (
    v_owner_type,
    v_owner_id,
    v_name,
    v_slug,
    v_description,
    v_order,
    v_price_monthly,
    v_price_yearly,
    v_price_lifetime,
    v_currency,
    v_status,
    v_max_members,
    v_color,
    v_emoji,
    v_image_url,
    v_features,
    'pending'
  )
  returning * into v_inserted;

  v_payload := jsonb_build_object(
    'tier', to_jsonb(v_inserted),
    'actor_id', v_actor
  );

  insert into membership_tier_sync_queue (
    tier_id,
    action,
    payload,
    status,
    actor_id,
    scheduled_at
  )
  values (
    v_inserted.id,
    'create',
    v_payload,
    'pending',
    v_actor,
    now()
  );

  return v_inserted;
end;
$$;

grant execute on function public.create_membership_tier(jsonb) to authenticated;

grant execute on function public.create_membership_tier(jsonb) to service_role;


create or replace function public.update_membership_tier(p_tier_id uuid, p_input jsonb)
returns membership_tiers
language plpgsql
security definer
as $$
declare
  v_actor uuid := auth.uid();
  v_existing membership_tiers;
  v_updated membership_tiers;
  v_name text := coalesce(trim(p_input->>'name'), '');
  v_description text := nullif(trim(p_input->>'description'), '');
  v_currency text := upper(coalesce(p_input->>'currency', 'USD'));
  v_status text := coalesce(p_input->>'status', 'draft');
  v_order integer := coalesce((p_input->>'tier_order')::integer, 0);
  v_price_monthly integer := case when p_input ? 'price_monthly' then (p_input->>'price_monthly')::integer else null end;
  v_price_yearly integer := case when p_input ? 'price_yearly' then (p_input->>'price_yearly')::integer else null end;
  v_price_lifetime integer := case when p_input ? 'price_lifetime' then (p_input->>'price_lifetime')::integer else null end;
  v_max_members integer := case when p_input ? 'max_members' then (p_input->>'max_members')::integer else null end;
  v_color text := nullif(trim(p_input->>'color'), '');
  v_emoji text := nullif(trim(p_input->>'emoji'), '');
  v_image_url text := nullif(trim(p_input->>'image_url'), '');
  v_features jsonb := coalesce(p_input->'features', '[]'::jsonb);
  v_payload jsonb;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using detail = json_build_object('code', 'not_authenticated')::text;
  end if;

  select * into v_existing
  from membership_tiers
  where id = p_tier_id
  for update;

  if not found then
    raise exception 'tier_not_found' using detail = json_build_object('code', 'tier_not_found')::text;
  end if;

  if v_name = '' then
    raise exception 'name_required' using detail = json_build_object('code', 'name_required')::text;
  end if;


  if jsonb_typeof(v_features) <> 'array' then
    v_features := '[]'::jsonb;
  else
    v_features := (
      select coalesce(jsonb_agg(trim(value)) filter (where trim(value) <> ''), '[]'::jsonb)
      from jsonb_array_elements_text(v_features)
    );
  end if;

  if coalesce(v_price_monthly, 0) < 0 or coalesce(v_price_yearly, 0) < 0 or coalesce(v_price_lifetime, 0) < 0 then
    raise exception 'invalid_price_format' using detail = json_build_object('code', 'invalid_price_format')::text;
  end if;
  update membership_tiers
  set
    name = v_name,
    description = v_description,
    price_monthly = v_price_monthly,
    price_yearly = v_price_yearly,
    price_lifetime = v_price_lifetime,
    currency = v_currency,
    status = v_status,
    tier_order = v_order,
    max_members = v_max_members,
    color = v_color,
    emoji = v_emoji,
    image_url = v_image_url,
    features = v_features,
    updated_at = now(),
    stripe_sync_status = 'pending',
    stripe_sync_error = null
  where id = p_tier_id
  returning * into v_updated;

  v_payload := jsonb_build_object(
    'tier', to_jsonb(v_updated),
    'actor_id', v_actor,
    'previous', jsonb_build_object(
      'stripe_product_id', v_existing.stripe_product_id,
      'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
      'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
      'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
    )
  );

  insert into membership_tier_sync_queue (
    tier_id,
    action,
    payload,
    status,
    actor_id,
    scheduled_at
  )
  values (
    v_updated.id,
    'update',
    v_payload,
    'pending',
    v_actor,
    now()
  );

  return v_updated;
end;
$$;

grant execute on function public.update_membership_tier(uuid, jsonb) to authenticated;

grant execute on function public.update_membership_tier(uuid, jsonb) to service_role;

create or replace function public.delete_membership_tier(p_tier_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_actor uuid := auth.uid();
  v_existing membership_tiers;
  v_payload jsonb;
begin
  if v_actor is null then
    raise exception 'not_authenticated' using detail = json_build_object('code', 'not_authenticated')::text;
  end if;

  select * into v_existing
  from membership_tiers
  where id = p_tier_id
  for update;

  if not found then
    raise exception 'tier_not_found' using detail = json_build_object('code', 'tier_not_found')::text;
  end if;

  delete from membership_tiers where id = p_tier_id;

  v_payload := jsonb_build_object(
    'tier', to_jsonb(v_existing),
    'actor_id', v_actor,
    'previous', jsonb_build_object(
      'stripe_product_id', v_existing.stripe_product_id,
      'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
      'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
      'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
    )
  );

  insert into membership_tier_sync_queue (
    tier_id,
    action,
    payload,
    status,
    actor_id,
    scheduled_at
  )
  values (
    v_existing.id,
    'delete',
    v_payload,
    'pending',
    v_actor,
    now()
  );
end;
$$;

grant execute on function public.delete_membership_tier(uuid) to authenticated;

grant execute on function public.delete_membership_tier(uuid) to service_role;

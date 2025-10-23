-- Membership tier Stripe sync queue and CRUD RPCs
-- Aligns database with PLUGGD_SCHEMA_2110 membership infrastructure

set check_function_bodies = off;

-- Queue table for Stripe sync jobs -------------------------------------------------
create table if not exists public.membership_tier_sync_queue (
  id uuid primary key default gen_random_uuid(),
  tier_id uuid references public.membership_tiers(id) on delete set null,
  action text not null check (action in ('create','update','delete')),
  payload jsonb not null,
  previous jsonb,
  status text not null default 'pending' check (status in ('pending','processing','completed','failed','error')),
  attempts integer not null default 0,
  scheduled_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  actor_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_membership_tier_sync_queue_status
  on public.membership_tier_sync_queue (status, scheduled_at);

create index if not exists idx_membership_tier_sync_queue_tier
  on public.membership_tier_sync_queue (tier_id);

-- Trigger to maintain updated_at ---------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where t.tgname = 'membership_tier_sync_queue_set_updated_at'
      and n.nspname = 'public'
  ) then
    execute '
      create trigger membership_tier_sync_queue_set_updated_at
        before update on public.membership_tier_sync_queue
        for each row execute function public.update_updated_at_column()
    ';
  end if;
end;
$$;

-- Helper function to enqueue sync jobs ---------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'enqueue_membership_tier_sync'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, text, jsonb, jsonb, uuid, timestamp with time zone'
  ) then
    execute $func$
      create function public.enqueue_membership_tier_sync(
        p_tier_id uuid,
        p_action text,
        p_payload jsonb,
        p_previous jsonb default null,
        p_actor uuid default auth.uid(),
        p_schedule timestamptz default now()
      ) returns uuid
      language plpgsql
      security definer
      set search_path = public, extensions
      as $$
      declare
        v_action text := lower(trim(p_action));
        v_id uuid;
      begin
        if p_payload is null then
          raise exception 'payload is required';
        end if;

        if v_action not in ('create','update','delete') then
          raise exception 'Unsupported membership tier sync action %', p_action;
        end if;

        insert into public.membership_tier_sync_queue (
          tier_id,
          action,
          payload,
          previous,
          status,
          actor_id,
          scheduled_at
        )
        values (
          p_tier_id,
          v_action,
          coalesce(p_payload, '{}'::jsonb),
          p_previous,
          'pending',
          coalesce(p_actor, auth.uid()),
          coalesce(p_schedule, now())
        )
        returning id into v_id;

        return v_id;
      end;
      $$;
    $func$;
  end if;
end;
$$;

revoke all on function public.enqueue_membership_tier_sync(uuid, text, jsonb, jsonb, uuid, timestamptz) from public;
grant execute on function public.enqueue_membership_tier_sync(uuid, text, jsonb, jsonb, uuid, timestamptz) to service_role;

-- Permission helper ---------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'assert_membership_tier_owner'
      and pg_get_function_identity_arguments(p.oid) = 'text, uuid'
  ) then
    execute $func$
      create function public.assert_membership_tier_owner(
        p_owner_type text,
        p_owner_id uuid
      ) returns void
      language plpgsql
      security definer
      set search_path = public, extensions
      as $$
      declare
        v_actor uuid := auth.uid();
        v_profile_id uuid;
        v_allowed boolean := false;
      begin
        if v_actor is null then
          raise exception 'Authentication required';
        end if;

        if p_owner_type = 'profile' then
          select id into v_profile_id
          from public.profiles
          where user_id = v_actor
          limit 1;

          if p_owner_id = v_actor then
            v_allowed := true;
          elsif v_profile_id is not null and p_owner_id = v_profile_id then
            v_allowed := true;
          end if;
        elsif p_owner_type = 'label' then
          select true into v_allowed
          from public.label_members lm
          where lm.label_id = p_owner_id
            and lm.user_id = v_actor
            and lm.role in ('owner','admin')
          limit 1;
        else
          raise exception 'Invalid owner_type %', p_owner_type;
        end if;

        if not coalesce(v_allowed, false) then
          raise exception 'You do not have permission to manage tiers for this owner';
        end if;
      end;
      $$;
    $func$;
  end if;
end;
$$;

revoke all on function public.assert_membership_tier_owner(text, uuid) from public;

-- Shared utility to normalise feature arrays --------------------------------------
create or replace function public.normalise_membership_features(p_features jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_features jsonb := coalesce(p_features, '[]'::jsonb);
  v_item jsonb;
  v_result jsonb := '[]'::jsonb;
  v_text text;
begin
  if jsonb_typeof(v_features) <> 'array' then
    return '[]'::jsonb;
  end if;

  for v_item in select * from jsonb_array_elements(v_features) loop
    if jsonb_typeof(v_item) = 'string' then
      v_text := trim(both from trim(both chr(34) from v_item::text));
      if v_text <> '' then
        v_result := v_result || to_jsonb(v_text);
      end if;
    end if;
  end loop;

  return v_result;
end;
$$;

-- Create tier RPC -----------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'create_membership_tier'
      and pg_get_function_identity_arguments(p.oid) = 'jsonb'
  ) then
    execute $func$
      create function public.create_membership_tier(
        p_input jsonb
      ) returns public.membership_tiers
      language plpgsql
      security definer
      set search_path = public, extensions
      as $$
      declare
        v_actor uuid := auth.uid();
        v_owner_type text;
        v_owner_id uuid;
        v_new_row public.membership_tiers;
        v_features jsonb;
        v_currency text;
        v_status text;
        v_tier_order integer;
        v_name text;
        v_slug text;
      begin
        if v_actor is null then
          raise exception 'Authentication required';
        end if;

        if p_input is null then
          raise exception 'Input payload is required';
        end if;

        v_owner_type := lower(p_input->>'owner_type');
        if v_owner_type is null then
          v_owner_type := 'profile';
        end if;

        v_owner_id := coalesce((p_input->>'owner_id')::uuid, v_actor);

        perform public.assert_membership_tier_owner(v_owner_type, v_owner_id);

        v_name := trim(both from coalesce(p_input->>'name', ''));
        if v_name is null or v_name = '' then
          raise exception 'Tier name is required';
        end if;

        v_slug := trim(both '-' from coalesce(p_input->>'slug', ''));
        if v_slug is null or v_slug = '' then
          v_slug := lower(regexp_replace(v_name, '[^a-z0-9]+', '-', 'gi'));
        end if;
        if v_slug = '' then
          v_slug := 'tier';
        end if;

        v_features := public.normalise_membership_features(p_input->'features');
        v_currency := upper(coalesce(p_input->>'currency', 'USD'));
        v_status := coalesce(p_input->>'status', 'draft');
        v_tier_order := coalesce((p_input->>'tier_order')::int, 0);

        insert into public.membership_tiers (
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
          stripe_sync_status,
          stripe_sync_error
        )
        values (
          v_owner_type,
          v_owner_id,
          v_name,
          v_slug,
          nullif(trim(both from p_input->>'description'), ''),
          v_tier_order,
          (p_input->>'price_monthly')::int,
          (p_input->>'price_yearly')::int,
          (p_input->>'price_lifetime')::int,
          v_currency,
          v_status::public.tier_status,
          (p_input->>'max_members')::int,
          nullif(trim(both from p_input->>'color'), ''),
          nullif(trim(both from p_input->>'emoji'), ''),
          nullif(trim(both from p_input->>'image_url'), ''),
          v_features,
          'pending',
          null
        )
        returning * into v_new_row;

        perform public.enqueue_membership_tier_sync(
          v_new_row.id,
          'create',
          jsonb_build_object(
            'tier', to_jsonb(v_new_row),
            'actor_id', v_actor
          ),
          null,
          v_actor
        );

        return v_new_row;
      end;
      $$;
    $func$;
  end if;
end;
$$;

revoke all on function public.create_membership_tier(jsonb) from public;
grant execute on function public.create_membership_tier(jsonb) to authenticated;
grant execute on function public.create_membership_tier(jsonb) to service_role;

-- Update tier RPC -----------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'update_membership_tier'
      and pg_get_function_identity_arguments(p.oid) = 'uuid, jsonb'
  ) then
    execute $func$
      create function public.update_membership_tier(
        p_tier_id uuid,
        p_input jsonb
      ) returns public.membership_tiers
      language plpgsql
      security definer
      set search_path = public, extensions
      as $$
      declare
        v_actor uuid := auth.uid();
        v_existing public.membership_tiers;
        v_updated public.membership_tiers;
        v_features jsonb;
        v_currency text;
        v_status text;
        v_tier_order integer;
        v_name text;
        v_description text;
      begin
        if v_actor is null then
          raise exception 'Authentication required';
        end if;

        if p_tier_id is null then
          raise exception 'Tier id is required';
        end if;

        select * into v_existing
        from public.membership_tiers
        where id = p_tier_id;

        if not found then
          raise exception 'Membership tier not found';
        end if;

        perform public.assert_membership_tier_owner(v_existing.owner_type, v_existing.owner_id);

        v_features := public.normalise_membership_features(p_input->'features');
        v_currency := upper(coalesce(p_input->>'currency', v_existing.currency));
        v_status := coalesce(p_input->>'status', v_existing.status::text);
        v_tier_order := coalesce((p_input->>'tier_order')::int, v_existing.tier_order);
        v_name := trim(both from coalesce(p_input->>'name', v_existing.name));
        v_description := nullif(trim(both from coalesce(p_input->>'description', v_existing.description)), '');

        update public.membership_tiers
        set
          name = v_name,
          description = v_description,
          tier_order = v_tier_order,
          price_monthly = case when p_input ? 'price_monthly' then (p_input->>'price_monthly')::int else v_existing.price_monthly end,
          price_yearly = case when p_input ? 'price_yearly' then (p_input->>'price_yearly')::int else v_existing.price_yearly end,
          price_lifetime = case when p_input ? 'price_lifetime' then (p_input->>'price_lifetime')::int else v_existing.price_lifetime end,
          currency = v_currency,
          status = v_status::public.tier_status,
          max_members = case when p_input ? 'max_members' then (p_input->>'max_members')::int else v_existing.max_members end,
          color = case when p_input ? 'color' then nullif(trim(both from p_input->>'color'), '') else v_existing.color end,
          emoji = case when p_input ? 'emoji' then nullif(trim(both from p_input->>'emoji'), '') else v_existing.emoji end,
          image_url = case when p_input ? 'image_url' then nullif(trim(both from p_input->>'image_url'), '') else v_existing.image_url end,
          features = case when p_input ? 'features' then v_features else v_existing.features end,
          stripe_synced_at = null,
          stripe_sync_status = 'pending',
          stripe_sync_error = null
        where id = p_tier_id
        returning * into v_updated;

        perform public.enqueue_membership_tier_sync(
          v_updated.id,
          'update',
          jsonb_build_object(
            'tier', to_jsonb(v_updated),
            'actor_id', v_actor
          ),
          jsonb_build_object(
            'stripe_product_id', v_existing.stripe_product_id,
            'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
            'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
            'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
          ),
          v_actor
        );

        return v_updated;
      end;
      $$;
    $func$;
  end if;
end;
$$;

revoke all on function public.update_membership_tier(uuid, jsonb) from public;
grant execute on function public.update_membership_tier(uuid, jsonb) to authenticated;
grant execute on function public.update_membership_tier(uuid, jsonb) to service_role;

-- Delete tier RPC -----------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'delete_membership_tier'
      and pg_get_function_identity_arguments(p.oid) = 'uuid'
  ) then
    execute $func$
      create function public.delete_membership_tier(
        p_tier_id uuid
      ) returns boolean
      language plpgsql
      security definer
      set search_path = public, extensions
      as $$
      declare
        v_actor uuid := auth.uid();
        v_existing public.membership_tiers;
      begin
        if v_actor is null then
          raise exception 'Authentication required';
        end if;

        if p_tier_id is null then
          raise exception 'Tier id is required';
        end if;

        select * into v_existing
        from public.membership_tiers
        where id = p_tier_id;

        if not found then
          return false;
        end if;

        perform public.assert_membership_tier_owner(v_existing.owner_type, v_existing.owner_id);

        delete from public.membership_tiers
        where id = p_tier_id;

        perform public.enqueue_membership_tier_sync(
          v_existing.id,
          'delete',
          jsonb_build_object(
            'tier', to_jsonb(v_existing),
            'actor_id', v_actor
          ),
          jsonb_build_object(
            'stripe_product_id', v_existing.stripe_product_id,
            'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
            'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
            'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
          ),
          v_actor
        );

        return true;
      end;
      $$;
    $func$;
  end if;
end;
$$;

revoke all on function public.delete_membership_tier(uuid) from public;
grant execute on function public.delete_membership_tier(uuid) to authenticated;
grant execute on function public.delete_membership_tier(uuid) to service_role;

-- Ensure queue table accessible to service role -----------------------------------
grant select, insert, update, delete on public.membership_tier_sync_queue to service_role;


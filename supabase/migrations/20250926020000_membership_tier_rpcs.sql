-- Ensure pg_net is available for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Add Stripe columns if missing
ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_monthly_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_yearly_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_lifetime_id text;

-- Helper function to normalise tier features input
CREATE OR REPLACE FUNCTION public.normalise_tier_features(p_features jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_features jsonb := COALESCE(p_features, '[]'::jsonb);
BEGIN
  IF jsonb_typeof(v_features) = 'array' THEN
    RETURN (
      SELECT jsonb_agg(value)
      FROM jsonb_array_elements_text(v_features) AS value
      WHERE length(trim(value)) > 0
    );
  ELSIF jsonb_typeof(v_features) = 'string' THEN
    BEGIN
      RETURN public.normalise_tier_features(to_jsonb(string_to_array(trim(both '"' FROM v_features::text), ',')));
    EXCEPTION WHEN others THEN
      RETURN '[]'::jsonb;
    END;
  END IF;
  RETURN '[]'::jsonb;
END;
$$;

CREATE OR REPLACE FUNCTION public.assert_membership_tier_access(p_owner_type text, p_owner_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated to manage membership tiers' USING ERRCODE = '42501';
  END IF;

  IF p_owner_type = 'profile' THEN
    IF p_owner_id <> v_user THEN
      RAISE EXCEPTION 'You do not have permission to manage this creator tier' USING ERRCODE = '42501';
    END IF;
  ELSIF p_owner_type = 'label' THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.label_members lm
      WHERE lm.label_id = p_owner_id
        AND lm.user_id = v_user
        AND lm.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'You do not have permission to manage this label tier' USING ERRCODE = '42501';
    END IF;
  ELSE
    RAISE EXCEPTION 'Unsupported owner type %', p_owner_type USING ERRCODE = '22023';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_membership_tier_sync_headers()
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_headers jsonb := jsonb_build_object('Content-Type', 'application/json');
  v_service_token text;
BEGIN
  BEGIN
    v_service_token := current_setting('app.settings.service_role_key', true);
  EXCEPTION WHEN others THEN
    v_service_token := NULL;
  END;

  IF v_service_token IS NOT NULL AND v_service_token <> '' THEN
    v_headers := v_headers || jsonb_build_object('Authorization', 'Bearer ' || v_service_token);
  END IF;
  RETURN v_headers;
END;
$$;

CREATE OR REPLACE FUNCTION public.resolve_membership_tier_sync_url()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_url text;
BEGIN
  BEGIN
    v_url := current_setting('app.settings.membership_tier_sync_url', true);
  EXCEPTION WHEN others THEN
    v_url := NULL;
  END;

  IF v_url IS NULL OR v_url = '' THEN
    v_url := 'https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/membership-tier-stripe';
  END IF;
  RETURN v_url;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_membership_tier_stripe_response(
  p_tier_id uuid,
  p_response jsonb
)
RETURNS public.membership_tiers
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated public.membership_tiers;
BEGIN
  UPDATE public.membership_tiers
  SET
    stripe_product_id = COALESCE(p_response->>'stripe_product_id', stripe_product_id),
    stripe_price_monthly_id = COALESCE(p_response->'stripe_price_ids'->>'monthly', stripe_price_monthly_id),
    stripe_price_yearly_id = COALESCE(p_response->'stripe_price_ids'->>'yearly', stripe_price_yearly_id),
    stripe_price_lifetime_id = COALESCE(p_response->'stripe_price_ids'->>'lifetime', stripe_price_lifetime_id),
    updated_at = now()
  WHERE id = p_tier_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_fake_stripe_ids(
  p_tier public.membership_tiers
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_payload jsonb := jsonb_build_object(
    'stripe_product_id', COALESCE(p_tier.stripe_product_id, 'prod_' || replace(gen_random_uuid()::text, '-', '')),
    'stripe_price_ids', jsonb_build_object(
      'monthly', CASE WHEN p_tier.price_monthly IS NOT NULL THEN COALESCE(p_tier.stripe_price_monthly_id, 'price_monthly_' || replace(gen_random_uuid()::text, '-', '')) ELSE NULL END,
      'yearly', CASE WHEN p_tier.price_yearly IS NOT NULL THEN COALESCE(p_tier.stripe_price_yearly_id, 'price_yearly_' || replace(gen_random_uuid()::text, '-', '')) ELSE NULL END,
      'lifetime', CASE WHEN p_tier.price_lifetime IS NOT NULL THEN COALESCE(p_tier.stripe_price_lifetime_id, 'price_lifetime_' || replace(gen_random_uuid()::text, '-', '')) ELSE NULL END
    )
  );
BEGIN
  RETURN v_payload;
END;
$$;

DROP FUNCTION IF EXISTS public.create_membership_tier(jsonb);
CREATE OR REPLACE FUNCTION public.create_membership_tier(p_input jsonb)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_owner_type text := lower(trim((p_input->>'owner_type')::text));
  v_owner_id uuid := (p_input->>'owner_id')::uuid;
  v_name text := trim(p_input->>'name');
  v_slug text := COALESCE(NULLIF(trim(p_input->>'slug'), ''), lower(replace(regexp_replace(v_name, '[^a-zA-Z0-9]+', '-', 'g'), '--', '-')));
  v_description text := NULLIF(p_input->>'description', '');
  v_tier public.membership_tiers;
  v_http_status int;
  v_http_body text;
  v_http_response jsonb;
  v_should_fake boolean := false;
  v_should_skip boolean := false;
  v_currency text := COALESCE(NULLIF(upper(p_input->>'currency'), ''), 'USD');
  v_status public.tier_status := COALESCE((p_input->>'status')::public.tier_status, 'draft');
  v_features jsonb := public.normalise_tier_features(p_input->'features');
  v_max_members integer := CASE WHEN p_input ? 'max_members' THEN (p_input->>'max_members')::integer ELSE NULL END;
  v_image_url text := NULLIF(p_input->>'image_url', '');
  v_color text := NULLIF(p_input->>'color', '');
  v_emoji text := NULLIF(p_input->>'emoji', '');
  v_order integer := COALESCE((p_input->>'tier_order')::integer, 0);
  v_price_monthly integer := CASE WHEN p_input ? 'price_monthly' THEN (p_input->>'price_monthly')::integer ELSE NULL END;
  v_price_yearly integer := CASE WHEN p_input ? 'price_yearly' THEN (p_input->>'price_yearly')::integer ELSE NULL END;
  v_price_lifetime integer := CASE WHEN p_input ? 'price_lifetime' THEN (p_input->>'price_lifetime')::integer ELSE NULL END;
  v_sync_url text;
  v_headers jsonb;
  v_body jsonb;
BEGIN
  PERFORM public.assert_membership_tier_access(v_owner_type, v_owner_id);

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'Tier name is required' USING ERRCODE = '23502';
  END IF;

  INSERT INTO public.membership_tiers (
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
    features,
    color,
    emoji,
    max_members,
    image_url
  )
  VALUES (
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
    v_features,
    v_color,
    v_emoji,
    v_max_members,
    v_image_url
  )
  RETURNING * INTO v_tier;

  BEGIN
    v_should_fake := lower(current_setting('app.settings.membership_tier_fake_stripe', true)) IN ('1', 'true', 'on');
  EXCEPTION WHEN others THEN
    v_should_fake := false;
  END;

  BEGIN
    v_should_skip := lower(current_setting('app.settings.membership_tier_disable_sync', true)) IN ('1', 'true', 'on');
  EXCEPTION WHEN others THEN
    v_should_skip := false;
  END;

  IF v_should_fake THEN
    v_http_response := public.generate_fake_stripe_ids(v_tier);
    v_tier := public.apply_membership_tier_stripe_response(v_tier.id, v_http_response);
    RETURN v_tier;
  END IF;

  IF v_should_skip THEN
    RETURN v_tier;
  END IF;

  v_sync_url := public.resolve_membership_tier_sync_url();
  v_headers := public.resolve_membership_tier_sync_headers();
  v_body := jsonb_build_object(
    'action', 'create',
    'payload', jsonb_build_object(
      'tier', to_jsonb(v_tier),
      'actor_id', auth.uid()
    )
  );

  SELECT status, body
  INTO v_http_status, v_http_body
  FROM net.http_post(
    url := v_sync_url,
    headers := v_headers,
    body := v_body
  ) AS http_response(status int, headers jsonb, body text);

  IF v_http_status < 200 OR v_http_status >= 300 THEN
    RAISE EXCEPTION 'Failed to sync membership tier with Stripe (status %): %', v_http_status, v_http_body
      USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    v_http_response := COALESCE(v_http_body::jsonb, '{}'::jsonb);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Stripe sync returned invalid payload: %', v_http_body;
  END;

  v_tier := public.apply_membership_tier_stripe_response(v_tier.id, v_http_response);
  RETURN v_tier;
END;
$$;

DROP FUNCTION IF EXISTS public.update_membership_tier(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.update_membership_tier(
  p_tier_id uuid,
  p_input jsonb
)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing public.membership_tiers;
  v_updated public.membership_tiers;
  v_should_fake boolean := false;
  v_should_skip boolean := false;
  v_sync_url text;
  v_headers jsonb;
  v_http_status int;
  v_http_body text;
  v_http_response jsonb;
  v_previous jsonb;
  v_update_features jsonb;
BEGIN
  SELECT * INTO v_existing FROM public.membership_tiers WHERE id = p_tier_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership tier not found';
  END IF;

  PERFORM public.assert_membership_tier_access(v_existing.owner_type, v_existing.owner_id);

  v_update_features := CASE WHEN p_input ? 'features' THEN public.normalise_tier_features(p_input->'features') ELSE v_existing.features END;

  UPDATE public.membership_tiers
  SET
    name = COALESCE(NULLIF(trim(p_input->>'name'), ''), v_existing.name),
    description = COALESCE(NULLIF(p_input->>'description', ''), v_existing.description),
    tier_order = COALESCE((p_input->>'tier_order')::integer, v_existing.tier_order),
    price_monthly = CASE WHEN p_input ? 'price_monthly' THEN (p_input->>'price_monthly')::integer ELSE v_existing.price_monthly END,
    price_yearly = CASE WHEN p_input ? 'price_yearly' THEN (p_input->>'price_yearly')::integer ELSE v_existing.price_yearly END,
    price_lifetime = CASE WHEN p_input ? 'price_lifetime' THEN (p_input->>'price_lifetime')::integer ELSE v_existing.price_lifetime END,
    currency = COALESCE(NULLIF(upper(p_input->>'currency'), ''), v_existing.currency),
    status = COALESCE((p_input->>'status')::public.tier_status, v_existing.status),
    features = v_update_features,
    color = COALESCE(NULLIF(p_input->>'color', ''), v_existing.color),
    emoji = COALESCE(NULLIF(p_input->>'emoji', ''), v_existing.emoji),
    max_members = CASE WHEN p_input ? 'max_members' THEN (p_input->>'max_members')::integer ELSE v_existing.max_members END,
    image_url = COALESCE(NULLIF(p_input->>'image_url', ''), v_existing.image_url),
    updated_at = now()
  WHERE id = p_tier_id
  RETURNING * INTO v_updated;

  BEGIN
    v_should_fake := lower(current_setting('app.settings.membership_tier_fake_stripe', true)) IN ('1', 'true', 'on');
  EXCEPTION WHEN others THEN
    v_should_fake := false;
  END;

  BEGIN
    v_should_skip := lower(current_setting('app.settings.membership_tier_disable_sync', true)) IN ('1', 'true', 'on');
  EXCEPTION WHEN others THEN
    v_should_skip := false;
  END;

  v_previous := jsonb_build_object(
    'stripe_product_id', v_existing.stripe_product_id,
    'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
    'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
    'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
  );

  IF v_should_fake THEN
    v_http_response := public.generate_fake_stripe_ids(v_updated);
    v_updated := public.apply_membership_tier_stripe_response(v_updated.id, v_http_response);
    RETURN v_updated;
  END IF;

  IF v_should_skip THEN
    RETURN v_updated;
  END IF;

  v_sync_url := public.resolve_membership_tier_sync_url();
  v_headers := public.resolve_membership_tier_sync_headers();

  SELECT status, body
  INTO v_http_status, v_http_body
  FROM net.http_post(
    url := v_sync_url,
    headers := v_headers,
    body := jsonb_build_object(
      'action', 'update',
      'payload', jsonb_build_object(
        'tier', to_jsonb(v_updated),
        'actor_id', auth.uid(),
        'previous', v_previous
      )
    )
  ) AS http_response(status int, headers jsonb, body text);

  IF v_http_status < 200 OR v_http_status >= 300 THEN
    RAISE EXCEPTION 'Failed to sync membership tier with Stripe (status %): %', v_http_status, v_http_body
      USING ERRCODE = 'P0001';
  END IF;

  BEGIN
    v_http_response := COALESCE(v_http_body::jsonb, '{}'::jsonb);
  EXCEPTION WHEN others THEN
    RAISE EXCEPTION 'Stripe sync returned invalid payload: %', v_http_body;
  END;

  v_updated := public.apply_membership_tier_stripe_response(v_updated.id, v_http_response);
  RETURN v_updated;
END;
$$;

DROP FUNCTION IF EXISTS public.delete_membership_tier(uuid);
CREATE OR REPLACE FUNCTION public.delete_membership_tier(p_tier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing public.membership_tiers;
  v_should_fake boolean := false;
  v_should_skip boolean := false;
  v_sync_url text;
  v_headers jsonb;
  v_http_status int;
  v_http_body text;
  v_payload jsonb;
BEGIN
  SELECT * INTO v_existing FROM public.membership_tiers WHERE id = p_tier_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM public.assert_membership_tier_access(v_existing.owner_type, v_existing.owner_id);

  IF EXISTS (SELECT 1 FROM public.memberships WHERE tier_id = p_tier_id AND status = 'active') THEN
    RAISE EXCEPTION 'Cannot delete a tier with active memberships';
  END IF;

  BEGIN
    v_should_fake := lower(current_setting('app.settings.membership_tier_fake_stripe', true)) IN ('1', 'true', 'on');
  EXCEPTION WHEN others THEN
    v_should_fake := false;
  END;

  BEGIN
    v_should_skip := lower(current_setting('app.settings.membership_tier_disable_sync', true)) IN ('1', 'true', 'on');
  EXCEPTION WHEN others THEN
    v_should_skip := false;
  END;

  IF NOT v_should_fake AND NOT v_should_skip THEN
    v_sync_url := public.resolve_membership_tier_sync_url();
    v_headers := public.resolve_membership_tier_sync_headers();
    v_payload := jsonb_build_object(
      'action', 'delete',
      'payload', jsonb_build_object(
        'tier', to_jsonb(v_existing),
        'actor_id', auth.uid()
      )
    );

    SELECT status, body
    INTO v_http_status, v_http_body
    FROM net.http_post(
      url := v_sync_url,
      headers := v_headers,
      body := v_payload
    ) AS http_response(status int, headers jsonb, body text);

    IF v_http_status < 200 OR v_http_status >= 300 THEN
      RAISE EXCEPTION 'Failed to disable Stripe resources for tier (status %): %', v_http_status, v_http_body
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  DELETE FROM public.membership_tiers WHERE id = p_tier_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_membership_tier(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_membership_tier(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_membership_tier(uuid) TO authenticated;

-- Add Stripe metadata columns to membership_tiers
ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_monthly_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_yearly_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_lifetime_id text;

-- Helper to ensure the current user controls the provided owner
CREATE OR REPLACE FUNCTION public.assert_membership_tier_owner(
  p_owner_type text,
  p_owner_id uuid
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING
      ERRCODE = '28000',
      MESSAGE = 'You must be signed in to manage membership tiers.';
  END IF;

  IF p_owner_type = 'profile' THEN
    PERFORM 1
    FROM public.profiles
    WHERE id = p_owner_id AND user_id = auth.uid();

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'You do not have access to this profile tier.';
    END IF;
  ELSIF p_owner_type = 'label' THEN
    PERFORM 1
    FROM public.label_members
    WHERE label_id = p_owner_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin');

    IF NOT FOUND THEN
      RAISE EXCEPTION USING
        ERRCODE = '42501',
        MESSAGE = 'You do not have access to this label tier.';
    END IF;
  ELSE
    RAISE EXCEPTION USING
      ERRCODE = '22023',
      MESSAGE = 'Invalid owner type supplied.';
  END IF;
END;
$$;

-- Normalises features array input
CREATE OR REPLACE FUNCTION public.normalise_membership_features(p_features jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_value jsonb := COALESCE(p_features, '[]'::jsonb);
BEGIN
  IF jsonb_typeof(v_value) <> 'array' THEN
    RETURN '[]'::jsonb;
  END IF;
  RETURN (
    SELECT jsonb_agg(value)
    FROM jsonb_array_elements_text(v_value) AS e(value)
    WHERE btrim(value) <> ''
  );
END;
$$;

-- Calls the Edge Function responsible for syncing Stripe metadata
CREATE OR REPLACE FUNCTION public.sync_membership_tier_with_stripe(
  p_action text,
  p_payload jsonb
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_response record;
  v_body jsonb;
BEGIN
  SELECT *
  INTO v_response
  FROM net.http_post(
    url := 'https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/membership-tier-stripe',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('action', p_action, 'payload', p_payload)
  );

  v_body := COALESCE(v_response.body, '{}'::jsonb);

  IF v_response.status >= 400 THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = COALESCE(v_body->>'error', 'Unable to sync tier with Stripe.');
  END IF;

  RETURN v_body;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_membership_tier(p_input jsonb)
RETURNS public.membership_tiers
LANGUAGE plpgsql
AS $$
DECLARE
  v_owner_type text := p_input->>'owner_type';
  v_owner_id uuid := (p_input->>'owner_id')::uuid;
  v_features jsonb := public.normalise_membership_features(p_input->'features');
  v_tier public.membership_tiers;
  v_sync_payload jsonb;
  v_sync_response jsonb;
BEGIN
  PERFORM public.assert_membership_tier_owner(v_owner_type, v_owner_id);

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
    p_input->>'name',
    p_input->>'slug',
    NULLIF(p_input->>'description', ''),
    COALESCE((p_input->>'tier_order')::integer, 0),
    (p_input->>'price_monthly')::integer,
    (p_input->>'price_yearly')::integer,
    (p_input->>'price_lifetime')::integer,
    COALESCE(p_input->>'currency', 'USD'),
    COALESCE((p_input->>'status')::public.tier_status, 'draft'),
    COALESCE(v_features, '[]'::jsonb),
    NULLIF(p_input->>'color', ''),
    NULLIF(p_input->>'emoji', ''),
    (p_input->>'max_members')::integer,
    NULLIF(p_input->>'image_url', '')
  )
  RETURNING * INTO v_tier;

  v_sync_payload := jsonb_build_object(
    'tier', to_jsonb(v_tier),
    'actor_id', auth.uid()
  );

  v_sync_response := public.sync_membership_tier_with_stripe('create', v_sync_payload);

  UPDATE public.membership_tiers
  SET
    stripe_product_id = v_sync_response->>'stripe_product_id',
    stripe_price_monthly_id = (v_sync_response->'stripe_price_ids')->>'monthly',
    stripe_price_yearly_id = (v_sync_response->'stripe_price_ids')->>'yearly',
    stripe_price_lifetime_id = (v_sync_response->'stripe_price_ids')->>'lifetime'
  WHERE id = v_tier.id
  RETURNING * INTO v_tier;

  RETURN v_tier;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_membership_tier(
  p_tier_id uuid,
  p_input jsonb
) RETURNS public.membership_tiers
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.membership_tiers;
  v_features jsonb := public.normalise_membership_features(p_input->'features');
  v_updated public.membership_tiers;
  v_sync_payload jsonb;
  v_sync_response jsonb;
BEGIN
  SELECT * INTO v_existing FROM public.membership_tiers WHERE id = p_tier_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'Membership tier not found.';
  END IF;

  PERFORM public.assert_membership_tier_owner(v_existing.owner_type, v_existing.owner_id);

  UPDATE public.membership_tiers
  SET
    name = COALESCE(NULLIF(p_input->>'name', ''), v_existing.name),
    description = CASE
      WHEN p_input ? 'description' THEN NULLIF(p_input->>'description', '')
      ELSE v_existing.description
    END,
    price_monthly = CASE
      WHEN p_input ? 'price_monthly' THEN (p_input->>'price_monthly')::integer
      ELSE v_existing.price_monthly
    END,
    price_yearly = CASE
      WHEN p_input ? 'price_yearly' THEN (p_input->>'price_yearly')::integer
      ELSE v_existing.price_yearly
    END,
    price_lifetime = CASE
      WHEN p_input ? 'price_lifetime' THEN (p_input->>'price_lifetime')::integer
      ELSE v_existing.price_lifetime
    END,
    currency = COALESCE(p_input->>'currency', v_existing.currency),
    status = COALESCE((p_input->>'status')::public.tier_status, v_existing.status),
    features = CASE
      WHEN p_input ? 'features' THEN COALESCE(v_features, '[]'::jsonb)
      ELSE v_existing.features
    END,
    color = CASE WHEN p_input ? 'color' THEN NULLIF(p_input->>'color', '') ELSE v_existing.color END,
    emoji = CASE WHEN p_input ? 'emoji' THEN NULLIF(p_input->>'emoji', '') ELSE v_existing.emoji END,
    max_members = CASE WHEN p_input ? 'max_members' THEN (p_input->>'max_members')::integer ELSE v_existing.max_members END,
    image_url = CASE WHEN p_input ? 'image_url' THEN NULLIF(p_input->>'image_url', '') ELSE v_existing.image_url END,
    tier_order = CASE
      WHEN p_input ? 'tier_order' THEN (p_input->>'tier_order')::integer
      ELSE v_existing.tier_order
    END
  WHERE id = p_tier_id
  RETURNING * INTO v_updated;

  v_sync_payload := jsonb_build_object(
    'tier', to_jsonb(v_updated),
    'actor_id', auth.uid(),
    'previous', jsonb_build_object(
      'stripe_product_id', v_existing.stripe_product_id,
      'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
      'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
      'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
    )
  );

  v_sync_response := public.sync_membership_tier_with_stripe('update', v_sync_payload);

  UPDATE public.membership_tiers
  SET
    stripe_product_id = CASE
      WHEN v_sync_response ? 'stripe_product_id' THEN v_sync_response->>'stripe_product_id'
      ELSE stripe_product_id
    END,
    stripe_price_monthly_id = CASE
      WHEN COALESCE(v_sync_response->'stripe_price_ids', '{}'::jsonb) ? 'monthly'
        THEN (v_sync_response->'stripe_price_ids')->>'monthly'
      ELSE stripe_price_monthly_id
    END,
    stripe_price_yearly_id = CASE
      WHEN COALESCE(v_sync_response->'stripe_price_ids', '{}'::jsonb) ? 'yearly'
        THEN (v_sync_response->'stripe_price_ids')->>'yearly'
      ELSE stripe_price_yearly_id
    END,
    stripe_price_lifetime_id = CASE
      WHEN COALESCE(v_sync_response->'stripe_price_ids', '{}'::jsonb) ? 'lifetime'
        THEN (v_sync_response->'stripe_price_ids')->>'lifetime'
      ELSE stripe_price_lifetime_id
    END
  WHERE id = p_tier_id
  RETURNING * INTO v_updated;

  RETURN v_updated;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_membership_tier(p_tier_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.membership_tiers;
  v_payload jsonb;
BEGIN
  SELECT * INTO v_existing FROM public.membership_tiers WHERE id = p_tier_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING MESSAGE = 'Membership tier not found.';
  END IF;

  PERFORM public.assert_membership_tier_owner(v_existing.owner_type, v_existing.owner_id);

  v_payload := jsonb_build_object(
    'tier', to_jsonb(v_existing),
    'actor_id', auth.uid()
  );

  PERFORM public.sync_membership_tier_with_stripe('delete', v_payload);

  DELETE FROM public.membership_tiers WHERE id = p_tier_id;
END;
$$;

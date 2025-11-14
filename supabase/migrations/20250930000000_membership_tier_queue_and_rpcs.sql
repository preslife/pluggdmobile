-- Membership tier Stripe sync metadata --------------------------------------
ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_monthly_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_yearly_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_lifetime_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stripe_sync_status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_sync_error TEXT;

UPDATE public.membership_tiers
SET stripe_sync_status = COALESCE(stripe_sync_status, 'pending')
WHERE stripe_sync_status IS NULL;

CREATE INDEX IF NOT EXISTS idx_membership_tiers_sync_status
  ON public.membership_tiers(stripe_sync_status);

-- Membership tier sync queue -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.membership_tier_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id UUID REFERENCES public.membership_tiers(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_tier_sync_queue_status
  ON public.membership_tier_sync_queue(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_membership_tier_sync_queue_tier
  ON public.membership_tier_sync_queue(tier_id);

CREATE TRIGGER trg_membership_tier_sync_queue_updated_at
  BEFORE UPDATE ON public.membership_tier_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: permission guard ---------------------------------------------------
CREATE OR REPLACE FUNCTION public.assert_can_manage_membership_owner(
  p_owner_type TEXT,
  p_owner_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_allowed BOOLEAN;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'You must be signed in to manage membership tiers.';
  END IF;

  IF p_owner_type = 'profile' THEN
    SELECT TRUE
    INTO v_allowed
    FROM public.profiles
    WHERE id = p_owner_id
      AND user_id = v_actor;
  ELSIF p_owner_type = 'label' THEN
    SELECT TRUE
    INTO v_allowed
    FROM public.label_members
    WHERE label_id = p_owner_id
      AND user_id = v_actor
      AND role IN ('owner', 'admin');
  ELSE
    RAISE EXCEPTION 'Unsupported owner type %', p_owner_type;
  END IF;

  IF NOT COALESCE(v_allowed, FALSE) THEN
    RAISE EXCEPTION 'You do not have permission to manage this membership owner.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_can_manage_membership_owner(TEXT, UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.enqueue_membership_tier_sync(UUID, TEXT, JSONB, JSONB, UUID, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.enqueue_membership_tier_sync(
  p_tier_id UUID,
  p_action TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_previous JSONB DEFAULT NULL,
  p_actor UUID DEFAULT auth.uid(),
  p_schedule_at TIMESTAMPTZ DEFAULT now()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := COALESCE(p_actor, auth.uid());
  v_job_id UUID;
BEGIN
  IF p_action NOT IN ('create', 'update', 'delete') THEN
    RAISE EXCEPTION 'Unsupported sync action: %', p_action;
  END IF;

  INSERT INTO public.membership_tier_sync_queue (
    tier_id,
    action,
    payload,
    previous,
    actor_id,
    status,
    scheduled_at
  )
  VALUES (
    p_tier_id,
    p_action,
    COALESCE(p_payload, '{}'::jsonb),
    p_previous,
    v_actor,
    'pending',
    COALESCE(p_schedule_at, now())
  )
  RETURNING id INTO v_job_id;

  IF p_tier_id IS NOT NULL AND p_action <> 'delete' THEN
    UPDATE public.membership_tiers
    SET
      stripe_sync_status = 'pending',
      stripe_sync_error = NULL,
      stripe_synced_at = NULL
    WHERE id = p_tier_id;
  END IF;

  RETURN v_job_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_membership_tier_sync(UUID, TEXT, JSONB, JSONB, UUID, TIMESTAMPTZ) TO authenticated;

-- Utility: slug builder ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.slugify_membership_identifier(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  v_slug := regexp_replace(lower(COALESCE(NULLIF(p_value, ''), 'tier')), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(BOTH '-' FROM v_slug);
  IF v_slug IS NULL OR v_slug = '' THEN
    v_slug := 'tier-' || substring(encode(gen_random_bytes(3), 'hex') FROM 1 FOR 6);
  END IF;
  RETURN v_slug;
END;
$$;

-- RPC: create membership tier ------------------------------------------------
DROP FUNCTION IF EXISTS public.create_membership_tier(JSONB);

CREATE OR REPLACE FUNCTION public.create_membership_tier(p_input JSONB)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_owner_type TEXT := COALESCE(NULLIF(p_input->>'owner_type', ''), 'profile');
  v_owner_id UUID := COALESCE(
    (p_input->>'owner_id')::UUID,
    (
      SELECT id FROM public.profiles
      WHERE user_id = v_actor
      ORDER BY created_at ASC
      LIMIT 1
    )
  );
  v_name TEXT := NULLIF(p_input->>'name', '');
  v_description TEXT := NULLIF(p_input->>'description', '');
  v_slug TEXT := NULLIF(p_input->>'slug', '');
  v_currency TEXT := upper(COALESCE(NULLIF(p_input->>'currency', ''), 'USD'));
  v_status TEXT := COALESCE(NULLIF(p_input->>'status', ''), 'active');
  v_features JSONB := '[]'::jsonb;
  v_order INTEGER;
  v_tier public.membership_tiers%ROWTYPE;
  v_base_slug TEXT;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'owner_id is required';
  END IF;

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'Tier name is required';
  END IF;

  PERFORM public.assert_can_manage_membership_owner(v_owner_type, v_owner_id);

  v_base_slug := public.slugify_membership_identifier(COALESCE(v_slug, v_name));
  v_slug := v_base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.membership_tiers
    WHERE owner_type = v_owner_type
      AND owner_id = v_owner_id
      AND slug = v_slug
  ) LOOP
    v_slug := v_base_slug || '-' || substring(encode(gen_random_bytes(2), 'hex') FROM 1 FOR 4);
  END LOOP;

  IF jsonb_typeof(p_input->'features') = 'array' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(trim(value))), '[]'::jsonb)
    INTO v_features
    FROM (
      SELECT value
      FROM jsonb_array_elements_text(p_input->'features') AS t(value)
      WHERE trim(value) <> ''
    ) cleaned;
  END IF;

  SELECT COALESCE(
    (SELECT MAX(tier_order) + 1 FROM public.membership_tiers WHERE owner_type = v_owner_type AND owner_id = v_owner_id),
    0
  )
  INTO v_order;

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
    image_url,
    stripe_sync_status
  )
  VALUES (
    v_owner_type,
    v_owner_id,
    v_name,
    v_slug,
    v_description,
    COALESCE((p_input->>'tier_order')::INT, v_order),
    NULLIF(p_input->>'price_monthly', '')::INT,
    NULLIF(p_input->>'price_yearly', '')::INT,
    NULLIF(p_input->>'price_lifetime', '')::INT,
    v_currency,
    v_status::public.tier_status,
    v_features,
    NULLIF(p_input->>'color', ''),
    NULLIF(p_input->>'emoji', ''),
    NULLIF(p_input->>'max_members', '')::INT,
    NULLIF(p_input->>'image_url', ''),
    'pending'
  )
  RETURNING * INTO v_tier;

  PERFORM public.enqueue_membership_tier_sync(
    v_tier.id,
    'create',
    jsonb_build_object('tier', to_jsonb(v_tier), 'actor_id', v_actor),
    NULL,
    v_actor
  );

  RETURN v_tier;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_membership_tier(JSONB) TO authenticated;

-- RPC: update membership tier ------------------------------------------------
DROP FUNCTION IF EXISTS public.update_membership_tier(UUID, JSONB);

CREATE OR REPLACE FUNCTION public.update_membership_tier(p_tier_id UUID, p_input JSONB)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_existing public.membership_tiers%ROWTYPE;
  v_updated public.membership_tiers%ROWTYPE;
  v_slug TEXT := NULLIF(p_input->>'slug', '');
  v_features JSONB := '[]'::jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.membership_tiers
  WHERE id = p_tier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership tier not found';
  END IF;

  PERFORM public.assert_can_manage_membership_owner(v_existing.owner_type, v_existing.owner_id);

  IF v_slug IS NOT NULL THEN
    v_slug := public.slugify_membership_identifier(v_slug);
    WHILE EXISTS (
      SELECT 1 FROM public.membership_tiers
      WHERE owner_type = v_existing.owner_type
        AND owner_id = v_existing.owner_id
        AND slug = v_slug
        AND id <> p_tier_id
    ) LOOP
      v_slug := v_slug || '-' || substring(encode(gen_random_bytes(2), 'hex') FROM 1 FOR 4);
    END LOOP;
  END IF;

  IF jsonb_typeof(p_input->'features') = 'array' THEN
    SELECT COALESCE(jsonb_agg(to_jsonb(trim(value))), '[]'::jsonb)
    INTO v_features
    FROM (
      SELECT value
      FROM jsonb_array_elements_text(p_input->'features') AS t(value)
      WHERE trim(value) <> ''
    ) cleaned;
  ELSE
    v_features := v_existing.features;
  END IF;

  UPDATE public.membership_tiers
  SET
    name = COALESCE(NULLIF(p_input->>'name', ''), v_existing.name),
    description = COALESCE(NULLIF(p_input->>'description', ''), v_existing.description),
    price_monthly = COALESCE(NULLIF(p_input->>'price_monthly', '')::INT, v_existing.price_monthly),
    price_yearly = COALESCE(NULLIF(p_input->>'price_yearly', '')::INT, v_existing.price_yearly),
    price_lifetime = COALESCE(NULLIF(p_input->>'price_lifetime', '')::INT, v_existing.price_lifetime),
    currency = upper(COALESCE(NULLIF(p_input->>'currency', ''), v_existing.currency)),
    status = COALESCE((p_input->>'status')::public.tier_status, v_existing.status),
    tier_order = COALESCE((p_input->>'tier_order')::INT, v_existing.tier_order),
    features = v_features,
    color = COALESCE(NULLIF(p_input->>'color', ''), v_existing.color),
    emoji = COALESCE(NULLIF(p_input->>'emoji', ''), v_existing.emoji),
    max_members = COALESCE(NULLIF(p_input->>'max_members', '')::INT, v_existing.max_members),
    image_url = COALESCE(NULLIF(p_input->>'image_url', ''), v_existing.image_url),
    slug = COALESCE(v_slug, v_existing.slug),
    stripe_sync_status = 'pending',
    stripe_sync_error = NULL,
    stripe_synced_at = NULL
  WHERE id = p_tier_id
  RETURNING * INTO v_updated;

  PERFORM public.enqueue_membership_tier_sync(
    v_updated.id,
    'update',
    jsonb_build_object('tier', to_jsonb(v_updated), 'actor_id', v_actor),
    jsonb_build_object(
      'stripe_product_id', v_existing.stripe_product_id,
      'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
      'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
      'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
    ),
    v_actor
  );

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_membership_tier(UUID, JSONB) TO authenticated;

-- RPC: delete membership tier ------------------------------------------------
DROP FUNCTION IF EXISTS public.delete_membership_tier(UUID);

CREATE OR REPLACE FUNCTION public.delete_membership_tier(p_tier_id UUID)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_existing public.membership_tiers%ROWTYPE;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.membership_tiers
  WHERE id = p_tier_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership tier not found';
  END IF;

  PERFORM public.assert_can_manage_membership_owner(v_existing.owner_type, v_existing.owner_id);

  IF EXISTS (
    SELECT 1 FROM public.memberships
    WHERE tier_id = p_tier_id
      AND status IN ('active', 'past_due')
  ) THEN
    RAISE EXCEPTION 'Cannot delete a tier with active memberships. Archive it instead.';
  END IF;

  DELETE FROM public.membership_tiers
  WHERE id = p_tier_id
  RETURNING * INTO v_existing;

  PERFORM public.enqueue_membership_tier_sync(
    v_existing.id,
    'delete',
    jsonb_build_object('tier', to_jsonb(v_existing), 'actor_id', v_actor),
    jsonb_build_object(
      'stripe_product_id', v_existing.stripe_product_id,
      'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
      'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
      'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
    ),
    v_actor
  );

  RETURN v_existing;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_membership_tier(UUID) TO authenticated;

-- Fan subscription metadata --------------------------------------------------
ALTER TABLE public.fan_subscriptions
  ADD COLUMN IF NOT EXISTS tier_id UUID REFERENCES public.membership_tiers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_payment_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_fan_subscriptions_tier
  ON public.fan_subscriptions(tier_id);

CREATE INDEX IF NOT EXISTS idx_fan_subscriptions_subscription
  ON public.fan_subscriptions(stripe_subscription_id);

WITH duplicates AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY fan_id, creator_id ORDER BY updated_at DESC) AS rn
  FROM public.fan_subscriptions
)
DELETE FROM public.fan_subscriptions
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fan_subscriptions_fan_creator_key'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'uq_fan_creator'
    ) THEN
      ALTER TABLE public.fan_subscriptions
        RENAME CONSTRAINT uq_fan_creator TO fan_subscriptions_fan_creator_key;
    ELSE
      ALTER TABLE public.fan_subscriptions
        ADD CONSTRAINT fan_subscriptions_fan_creator_key UNIQUE (fan_id, creator_id);
    END IF;
  END IF;
END;
$$;

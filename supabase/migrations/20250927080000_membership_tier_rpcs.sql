-- Membership tier RPCs and Stripe sync queue

-- Ensure Stripe metadata columns exist on membership_tiers
ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_monthly_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_yearly_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_lifetime_id text,
  ADD COLUMN IF NOT EXISTS stripe_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_sync_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_sync_error text;

UPDATE public.membership_tiers
SET stripe_sync_status = coalesce(stripe_sync_status, 'pending')
WHERE stripe_sync_status IS NULL;

-- Ensure queue table exists for asynchronous Stripe sync jobs
CREATE TABLE IF NOT EXISTS public.membership_tier_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid REFERENCES public.membership_tiers(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  payload jsonb NOT NULL,
  previous jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'error')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  actor_id uuid,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membership_tier_sync_queue_status_scheduled_idx
  ON public.membership_tier_sync_queue (status, scheduled_at, created_at);

CREATE INDEX IF NOT EXISTS membership_tier_sync_queue_tier_idx
  ON public.membership_tier_sync_queue (tier_id);

CREATE OR REPLACE FUNCTION public.update_membership_tier_sync_queue_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_membership_tier_sync_queue_updated_at ON public.membership_tier_sync_queue;
CREATE TRIGGER update_membership_tier_sync_queue_updated_at
  BEFORE UPDATE ON public.membership_tier_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_membership_tier_sync_queue_updated_at();

-- Helper: assert the current user controls the tier owner and return the actor id
CREATE OR REPLACE FUNCTION public.assert_membership_tier_actor(p_owner_type text, p_owner_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_has_access boolean := false;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'not_authenticated')::text;
  END IF;

  IF p_owner_type = 'profile' THEN
    SELECT true INTO v_has_access
    FROM public.profiles
    WHERE id = p_owner_id AND user_id = v_actor;
  ELSIF p_owner_type = 'label' THEN
    SELECT true INTO v_has_access
    FROM public.label_members
    WHERE label_id = p_owner_id AND user_id = v_actor AND role IN ('owner', 'admin');
  END IF;

  IF NOT coalesce(v_has_access, false) THEN
    RAISE EXCEPTION 'not_authorised'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'not_authorised')::text;
  END IF;

  RETURN v_actor;
END;
$$;

GRANT EXECUTE ON FUNCTION public.assert_membership_tier_actor(text, uuid) TO authenticated;

-- Helper: enqueue a sync job for Stripe reconciliation
CREATE OR REPLACE FUNCTION public.enqueue_membership_tier_sync(
  p_action text,
  p_tier_id uuid,
  p_payload jsonb,
  p_actor_id uuid,
  p_previous jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_correlation_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.membership_tier_sync_queue(action, tier_id, payload, previous, actor_id)
  VALUES (
    p_action,
    p_tier_id,
    jsonb_build_object(
      'tier', coalesce(p_payload, '{}'::jsonb),
      'actor_id', p_actor_id,
      'attempt', 1,
      'correlation_id', v_correlation_id
    ),
    p_previous,
    p_actor_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.enqueue_membership_tier_sync(text, uuid, jsonb, uuid, jsonb) TO authenticated;

-- Create membership tier RPC
CREATE OR REPLACE FUNCTION public.create_membership_tier(p_input jsonb)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_owner_type text := lower(trim(both from v_input->>'owner_type'));
  v_owner_id uuid;
  v_name text := trim(both from v_input->>'name');
  v_slug text := trim(both from lower(v_input->>'slug'));
  v_description text := nullif(trim(both from v_input->>'description'), '');
  v_tier_order integer := 0;
  v_price_monthly integer := NULL;
  v_price_yearly integer := NULL;
  v_price_lifetime integer := NULL;
  v_currency text := upper(trim(both from coalesce(v_input->>'currency', 'USD')));
  v_status text := coalesce(v_input->>'status', 'active');
  v_features jsonb := '[]'::jsonb;
  v_color text := nullif(trim(both from v_input->>'color'), '');
  v_emoji text := nullif(trim(both from v_input->>'emoji'), '');
  v_max_members integer := NULL;
  v_image_url text := nullif(trim(both from v_input->>'image_url'), '');
  v_actor uuid;
  v_new_row public.membership_tiers;
BEGIN
  BEGIN
    v_owner_id := (v_input->>'owner_id')::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid_owner_id'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_owner_id')::text;
  END;

  IF v_owner_type NOT IN ('profile', 'label') THEN
    RAISE EXCEPTION 'invalid_owner_type'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_owner_type')::text;
  END IF;

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'invalid_owner_id'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_owner_id')::text;
  END IF;

  BEGIN
    IF v_input ? 'tier_order' THEN
      v_tier_order := nullif(v_input->>'tier_order', '')::int;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid_tier_order'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_tier_order')::text;
  END;

  IF v_name IS NULL OR v_name = '' THEN
    RAISE EXCEPTION 'name_required'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'name_required')::text;
  END IF;

  IF v_slug IS NULL OR v_slug = '' THEN
    v_slug := lower(regexp_replace(v_name, '[^a-z0-9]+', '-', 'g'));
  END IF;

  v_slug := regexp_replace(v_slug, '-{2,}', '-', 'g');
  v_slug := trim(both '-' from v_slug);

  IF v_slug = '' THEN
    RAISE EXCEPTION 'invalid_slug'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_slug')::text;
  END IF;

  BEGIN
    IF v_input ? 'price_monthly' THEN
      v_price_monthly := nullif(v_input->>'price_monthly', '')::int;
    END IF;
    IF v_input ? 'price_yearly' THEN
      v_price_yearly := nullif(v_input->>'price_yearly', '')::int;
    END IF;
    IF v_input ? 'price_lifetime' THEN
      v_price_lifetime := nullif(v_input->>'price_lifetime', '')::int;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid_price_format'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_price_format')::text;
  END;

  IF v_price_monthly IS NOT NULL AND v_price_monthly < 0 THEN
    RAISE EXCEPTION 'invalid_price_monthly'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_price_monthly')::text;
  END IF;
  IF v_price_yearly IS NOT NULL AND v_price_yearly < 0 THEN
    RAISE EXCEPTION 'invalid_price_yearly'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_price_yearly')::text;
  END IF;
  IF v_price_lifetime IS NOT NULL AND v_price_lifetime < 0 THEN
    RAISE EXCEPTION 'invalid_price_lifetime'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_price_lifetime')::text;
  END IF;

  IF v_currency IS NULL OR length(v_currency) <> 3 THEN
    RAISE EXCEPTION 'invalid_currency'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_currency')::text;
  END IF;

  IF v_status NOT IN ('draft', 'active', 'paused', 'archived') THEN
    RAISE EXCEPTION 'invalid_status'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_status')::text;
  END IF;

  IF v_input ? 'features' THEN
    IF jsonb_typeof(v_input->'features') <> 'array' THEN
      RAISE EXCEPTION 'invalid_features'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_features')::text;
    END IF;
    v_features := v_input->'features';
  END IF;

  IF v_input ? 'max_members' THEN
    BEGIN
      v_max_members := nullif(v_input->>'max_members', '')::int;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid_max_members'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_max_members')::text;
    END;
    IF v_max_members IS NOT NULL AND v_max_members < 0 THEN
      RAISE EXCEPTION 'invalid_max_members'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_max_members')::text;
    END IF;
  END IF;

  v_actor := public.assert_membership_tier_actor(v_owner_type, v_owner_id);

  IF EXISTS (
    SELECT 1 FROM public.membership_tiers
    WHERE owner_type = v_owner_type AND owner_id = v_owner_id AND slug = v_slug
  ) THEN
    RAISE EXCEPTION 'duplicate_slug'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'duplicate_slug', 'slug', v_slug)::text;
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
    image_url,
    stripe_sync_status,
    stripe_sync_error
  )
  VALUES (
    v_owner_type,
    v_owner_id,
    v_name,
    v_slug,
    v_description,
    v_tier_order,
    v_price_monthly,
    v_price_yearly,
    v_price_lifetime,
    v_currency,
    v_status,
    coalesce(v_features, '[]'::jsonb),
    v_color,
    v_emoji,
    v_max_members,
    v_image_url,
    'pending',
    NULL
  )
  RETURNING * INTO v_new_row;

  PERFORM public.enqueue_membership_tier_sync('create', v_new_row.id, to_jsonb(v_new_row), v_actor, NULL);

  RETURN v_new_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_membership_tier(jsonb) TO authenticated;

-- Update membership tier RPC
CREATE OR REPLACE FUNCTION public.update_membership_tier(p_tier_id uuid, p_input jsonb)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_input jsonb := coalesce(p_input, '{}'::jsonb);
  v_existing public.membership_tiers;
  v_updated public.membership_tiers;
  v_owner_type text;
  v_owner_id uuid;
  v_actor uuid;
  v_slug text;
  v_previous jsonb;
  v_price_monthly integer;
  v_price_yearly integer;
  v_price_lifetime integer;
  v_max_members integer;
BEGIN
  SELECT * INTO v_existing
  FROM public.membership_tiers
  WHERE id = p_tier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tier_not_found'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'tier_not_found')::text;
  END IF;

  v_owner_type := v_existing.owner_type;
  v_owner_id := v_existing.owner_id;
  v_actor := public.assert_membership_tier_actor(v_owner_type, v_owner_id);

  v_previous := jsonb_build_object(
    'stripe_product_id', v_existing.stripe_product_id,
    'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
    'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
    'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
  );

  IF v_input ? 'name' THEN
    IF trim(both from v_input->>'name') = '' THEN
      RAISE EXCEPTION 'name_required'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'name_required')::text;
    END IF;
    v_existing.name := trim(both from v_input->>'name');
  END IF;

  IF v_input ? 'description' THEN
    v_existing.description := nullif(trim(both from v_input->>'description'), '');
  END IF;

  IF v_input ? 'slug' THEN
    v_slug := trim(both from lower(v_input->>'slug'));
    v_slug := regexp_replace(coalesce(v_slug, ''), '[^a-z0-9-]+', '-', 'g');
    v_slug := regexp_replace(v_slug, '-{2,}', '-', 'g');
    v_slug := trim(both '-' from v_slug);
    IF v_slug = '' THEN
      RAISE EXCEPTION 'invalid_slug'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_slug')::text;
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.membership_tiers
      WHERE owner_type = v_owner_type
        AND owner_id = v_owner_id
        AND slug = v_slug
        AND id <> p_tier_id
    ) THEN
      RAISE EXCEPTION 'duplicate_slug'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'duplicate_slug', 'slug', v_slug)::text;
    END IF;
    v_existing.slug := v_slug;
  END IF;

  IF v_input ? 'tier_order' THEN
    BEGIN
      v_existing.tier_order := nullif(v_input->>'tier_order', '')::int;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid_tier_order'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_tier_order')::text;
    END;
  END IF;

  BEGIN
    IF v_input ? 'price_monthly' THEN
      v_price_monthly := nullif(v_input->>'price_monthly', '')::int;
      IF v_price_monthly IS NOT NULL AND v_price_monthly < 0 THEN
        RAISE EXCEPTION 'invalid_price_monthly'
          USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_price_monthly')::text;
      END IF;
      v_existing.price_monthly := v_price_monthly;
    END IF;
    IF v_input ? 'price_yearly' THEN
      v_price_yearly := nullif(v_input->>'price_yearly', '')::int;
      IF v_price_yearly IS NOT NULL AND v_price_yearly < 0 THEN
        RAISE EXCEPTION 'invalid_price_yearly'
          USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_price_yearly')::text;
      END IF;
      v_existing.price_yearly := v_price_yearly;
    END IF;
    IF v_input ? 'price_lifetime' THEN
      v_price_lifetime := nullif(v_input->>'price_lifetime', '')::int;
      IF v_price_lifetime IS NOT NULL AND v_price_lifetime < 0 THEN
        RAISE EXCEPTION 'invalid_price_lifetime'
          USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_price_lifetime')::text;
      END IF;
      v_existing.price_lifetime := v_price_lifetime;
    END IF;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'invalid_price_format'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_price_format')::text;
  END;

  IF v_input ? 'currency' THEN
    v_existing.currency := upper(trim(both from coalesce(v_input->>'currency', '')));
    IF v_existing.currency IS NULL OR length(v_existing.currency) <> 3 THEN
      RAISE EXCEPTION 'invalid_currency'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_currency')::text;
    END IF;
  END IF;

  IF v_input ? 'status' THEN
    IF (v_input->>'status') NOT IN ('draft', 'active', 'paused', 'archived') THEN
      RAISE EXCEPTION 'invalid_status'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_status')::text;
    END IF;
    v_existing.status := v_input->>'status';
  END IF;

  IF v_input ? 'features' THEN
    IF jsonb_typeof(v_input->'features') <> 'array' THEN
      RAISE EXCEPTION 'invalid_features'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_features')::text;
    END IF;
    v_existing.features := v_input->'features';
  END IF;

  IF v_input ? 'color' THEN
    v_existing.color := nullif(trim(both from v_input->>'color'), '');
  END IF;
  IF v_input ? 'emoji' THEN
    v_existing.emoji := nullif(trim(both from v_input->>'emoji'), '');
  END IF;
  IF v_input ? 'image_url' THEN
    v_existing.image_url := nullif(trim(both from v_input->>'image_url'), '');
  END IF;

  IF v_input ? 'max_members' THEN
    BEGIN
      v_max_members := nullif(v_input->>'max_members', '')::int;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'invalid_max_members'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_max_members')::text;
    END;
    IF v_max_members IS NOT NULL AND v_max_members < 0 THEN
      RAISE EXCEPTION 'invalid_max_members'
        USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'invalid_max_members')::text;
    END IF;
    v_existing.max_members := v_max_members;
  END IF;

  UPDATE public.membership_tiers
  SET
    name = v_existing.name,
    description = v_existing.description,
    slug = v_existing.slug,
    tier_order = v_existing.tier_order,
    price_monthly = v_existing.price_monthly,
    price_yearly = v_existing.price_yearly,
    price_lifetime = v_existing.price_lifetime,
    currency = v_existing.currency,
    status = v_existing.status,
    features = v_existing.features,
    color = v_existing.color,
    emoji = v_existing.emoji,
    image_url = v_existing.image_url,
    max_members = v_existing.max_members,
    stripe_sync_status = 'pending',
    stripe_sync_error = NULL,
    updated_at = now()
  WHERE id = p_tier_id
  RETURNING * INTO v_updated;

  PERFORM public.enqueue_membership_tier_sync('update', v_updated.id, to_jsonb(v_updated), v_actor, v_previous);

  RETURN v_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_membership_tier(uuid, jsonb) TO authenticated;

-- Delete membership tier RPC
CREATE OR REPLACE FUNCTION public.delete_membership_tier(p_tier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_existing public.membership_tiers;
  v_actor uuid;
BEGIN
  SELECT * INTO v_existing
  FROM public.membership_tiers
  WHERE id = p_tier_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'tier_not_found'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'tier_not_found')::text;
  END IF;

  v_actor := public.assert_membership_tier_actor(v_existing.owner_type, v_existing.owner_id);

  IF EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE tier_id = p_tier_id AND status IN ('active', 'past_due')
  ) THEN
    RAISE EXCEPTION 'tier_has_members'
      USING ERRCODE = 'P0001', DETAIL = json_build_object('code', 'tier_has_members')::text;
  END IF;

  DELETE FROM public.membership_tiers
  WHERE id = p_tier_id;

  PERFORM public.enqueue_membership_tier_sync('delete', p_tier_id, to_jsonb(v_existing), v_actor, NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_membership_tier(uuid) TO authenticated;

-- Membership tier RPCs and Stripe sync automation

-- Add Stripe linkage columns if missing
ALTER TABLE public.membership_tiers
  ADD COLUMN IF NOT EXISTS stripe_product_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_monthly_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_yearly_id text,
  ADD COLUMN IF NOT EXISTS stripe_price_lifetime_id text,
  ADD COLUMN IF NOT EXISTS stripe_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_sync_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_sync_error text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'membership_tiers_sync_status_check'
      AND conrelid = 'public.membership_tiers'::regclass
  ) THEN
    ALTER TABLE public.membership_tiers
      ADD CONSTRAINT membership_tiers_sync_status_check
      CHECK (stripe_sync_status IN ('pending', 'processing', 'synced', 'error'));
  END IF;
END $$;

UPDATE public.membership_tiers
SET stripe_sync_status = CASE
      WHEN stripe_product_id IS NOT NULL THEN 'synced'
      ELSE 'pending'
    END,
    stripe_sync_error = NULL
WHERE stripe_sync_status IS NULL OR stripe_sync_status NOT IN ('pending', 'processing', 'synced', 'error');

-- Queue table for background Stripe sync jobs
CREATE TABLE IF NOT EXISTS public.membership_tier_sync_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid REFERENCES public.membership_tiers(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  payload jsonb NOT NULL,
  previous jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'error')),
  attempts integer NOT NULL DEFAULT 0,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  completed_at timestamptz,
  last_error text,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_membership_tier_sync_queue_status
  ON public.membership_tier_sync_queue(status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_membership_tier_sync_queue_tier
  ON public.membership_tier_sync_queue(tier_id);

CREATE TRIGGER membership_tier_sync_queue_set_updated_at
  BEFORE UPDATE ON public.membership_tier_sync_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to enqueue sync jobs and update tier sync metadata
CREATE OR REPLACE FUNCTION public.enqueue_membership_tier_sync(
  p_action text,
  p_tier jsonb,
  p_previous jsonb,
  p_actor uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier_id uuid := NULLIF(p_tier->>'id', '')::uuid;
BEGIN
  IF p_tier IS NULL THEN
    RAISE EXCEPTION 'tier payload required for sync';
  END IF;

  INSERT INTO public.membership_tier_sync_queue (tier_id, action, payload, previous, actor_id)
  VALUES (
    v_tier_id,
    p_action,
    jsonb_build_object('tier', p_tier, 'actor_id', p_actor),
    p_previous,
    p_actor
  );

  IF v_tier_id IS NOT NULL AND p_action <> 'delete' THEN
    UPDATE public.membership_tiers
    SET stripe_sync_status = 'pending',
        stripe_sync_error = NULL,
        stripe_synced_at = NULL
    WHERE id = v_tier_id;
  END IF;
END;
$$;

-- RPC: create membership tier
CREATE OR REPLACE FUNCTION public.create_membership_tier(p_input jsonb)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_owner_type text := NULLIF(p_input->>'owner_type', '');
  v_owner_id uuid := NULLIF(p_input->>'owner_id', '')::uuid;
  v_tier public.membership_tiers;
  v_description text;
  v_tier_order integer;
  v_price_monthly integer;
  v_price_yearly integer;
  v_price_lifetime integer;
  v_currency text;
  v_status public.tier_status;
  v_features jsonb;
  v_color text;
  v_emoji text;
  v_max_members integer;
  v_image_url text;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF v_owner_type IS NULL OR v_owner_id IS NULL THEN
    RAISE EXCEPTION 'owner information required';
  END IF;

  IF v_owner_type = 'profile' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_owner_id
        AND p.user_id = v_actor
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  ELSIF v_owner_type = 'label' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.label_members lm
      WHERE lm.label_id = v_owner_id
        AND lm.user_id = v_actor
        AND lm.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  ELSE
    RAISE EXCEPTION 'invalid owner type';
  END IF;

  IF NULLIF(p_input->>'name', '') IS NULL THEN
    RAISE EXCEPTION 'tier name required';
  END IF;

  IF NULLIF(p_input->>'slug', '') IS NULL THEN
    RAISE EXCEPTION 'tier slug required';
  END IF;

  v_description := NULLIF(p_input->>'description', '');
  v_tier_order := COALESCE((p_input->>'tier_order')::integer, 0);
  v_price_monthly := CASE
    WHEN p_input ? 'price_monthly' THEN
      CASE WHEN p_input->>'price_monthly' IS NULL THEN NULL ELSE (p_input->>'price_monthly')::integer END
    ELSE NULL
  END;
  v_price_yearly := CASE
    WHEN p_input ? 'price_yearly' THEN
      CASE WHEN p_input->>'price_yearly' IS NULL THEN NULL ELSE (p_input->>'price_yearly')::integer END
    ELSE NULL
  END;
  v_price_lifetime := CASE
    WHEN p_input ? 'price_lifetime' THEN
      CASE WHEN p_input->>'price_lifetime' IS NULL THEN NULL ELSE (p_input->>'price_lifetime')::integer END
    ELSE NULL
  END;
  v_currency := COALESCE(NULLIF(p_input->>'currency', ''), 'USD');
  v_status := COALESCE(NULLIF(p_input->>'status', '')::public.tier_status, 'draft');
  v_features := COALESCE(p_input->'features', '[]'::jsonb);
  v_color := NULLIF(p_input->>'color', '');
  v_emoji := NULLIF(p_input->>'emoji', '');
  v_max_members := CASE
    WHEN p_input ? 'max_members' THEN
      CASE WHEN p_input->>'max_members' IS NULL THEN NULL ELSE (p_input->>'max_members')::integer END
    ELSE NULL
  END;
  v_image_url := NULLIF(p_input->>'image_url', '');

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
    NULLIF(btrim(p_input->>'name'), ''),
    NULLIF(btrim(p_input->>'slug'), ''),
    v_description,
    v_tier_order,
    v_price_monthly,
    v_price_yearly,
    v_price_lifetime,
    v_currency,
    v_status,
    v_features,
    v_color,
    v_emoji,
    v_max_members,
    v_image_url,
    'pending',
    NULL
  )
  RETURNING * INTO v_tier;

  PERFORM public.enqueue_membership_tier_sync('create', to_jsonb(v_tier), NULL, v_actor);

  RETURN v_tier;
END;
$$;

-- RPC: update membership tier
CREATE OR REPLACE FUNCTION public.update_membership_tier(p_tier_id uuid, p_input jsonb)
RETURNS public.membership_tiers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing public.membership_tiers;
  v_updated public.membership_tiers;
  v_name text;
  v_description text;
  v_tier_order integer;
  v_price_monthly integer;
  v_price_yearly integer;
  v_price_lifetime integer;
  v_currency text;
  v_status public.tier_status;
  v_features jsonb;
  v_color text;
  v_emoji text;
  v_max_members integer;
  v_image_url text;
  v_previous jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_existing
  FROM public.membership_tiers
  WHERE id = p_tier_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership tier not found';
  END IF;

  IF v_existing.owner_type = 'profile' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_existing.owner_id
        AND p.user_id = v_actor
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  ELSIF v_existing.owner_type = 'label' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.label_members lm
      WHERE lm.label_id = v_existing.owner_id
        AND lm.user_id = v_actor
        AND lm.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  v_name := COALESCE(NULLIF(p_input->>'name', ''), v_existing.name);
  v_description := CASE
    WHEN p_input ? 'description' THEN NULLIF(p_input->>'description', '')
    ELSE v_existing.description
  END;
  v_tier_order := CASE
    WHEN p_input ? 'tier_order' THEN COALESCE((p_input->>'tier_order')::integer, 0)
    ELSE v_existing.tier_order
  END;
  v_price_monthly := CASE
    WHEN p_input ? 'price_monthly' THEN
      CASE WHEN p_input->>'price_monthly' IS NULL THEN NULL ELSE (p_input->>'price_monthly')::integer END
    ELSE v_existing.price_monthly
  END;
  v_price_yearly := CASE
    WHEN p_input ? 'price_yearly' THEN
      CASE WHEN p_input->>'price_yearly' IS NULL THEN NULL ELSE (p_input->>'price_yearly')::integer END
    ELSE v_existing.price_yearly
  END;
  v_price_lifetime := CASE
    WHEN p_input ? 'price_lifetime' THEN
      CASE WHEN p_input->>'price_lifetime' IS NULL THEN NULL ELSE (p_input->>'price_lifetime')::integer END
    ELSE v_existing.price_lifetime
  END;
  v_currency := COALESCE(NULLIF(p_input->>'currency', ''), v_existing.currency);
  v_status := CASE
    WHEN p_input ? 'status' THEN NULLIF(p_input->>'status', '')::public.tier_status
    ELSE v_existing.status
  END;
  v_features := CASE
    WHEN p_input ? 'features' THEN COALESCE(p_input->'features', '[]'::jsonb)
    ELSE v_existing.features
  END;
  v_color := CASE
    WHEN p_input ? 'color' THEN NULLIF(p_input->>'color', '')
    ELSE v_existing.color
  END;
  v_emoji := CASE
    WHEN p_input ? 'emoji' THEN NULLIF(p_input->>'emoji', '')
    ELSE v_existing.emoji
  END;
  v_max_members := CASE
    WHEN p_input ? 'max_members' THEN
      CASE WHEN p_input->>'max_members' IS NULL THEN NULL ELSE (p_input->>'max_members')::integer END
    ELSE v_existing.max_members
  END;
  v_image_url := CASE
    WHEN p_input ? 'image_url' THEN NULLIF(p_input->>'image_url', '')
    ELSE v_existing.image_url
  END;

  v_previous := jsonb_build_object(
    'stripe_product_id', v_existing.stripe_product_id,
    'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
    'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
    'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
  );

  UPDATE public.membership_tiers
  SET name = v_name,
      description = v_description,
      tier_order = v_tier_order,
      price_monthly = v_price_monthly,
      price_yearly = v_price_yearly,
      price_lifetime = v_price_lifetime,
      currency = v_currency,
      status = v_status,
      features = v_features,
      color = v_color,
      emoji = v_emoji,
      max_members = v_max_members,
      image_url = v_image_url,
      updated_at = now(),
      stripe_sync_status = 'pending',
      stripe_sync_error = NULL,
      stripe_synced_at = NULL
  WHERE id = p_tier_id
  RETURNING * INTO v_updated;

  PERFORM public.enqueue_membership_tier_sync('update', to_jsonb(v_updated), v_previous, v_actor);

  RETURN v_updated;
END;
$$;

-- RPC: delete membership tier
CREATE OR REPLACE FUNCTION public.delete_membership_tier(p_tier_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := auth.uid();
  v_existing public.membership_tiers;
  v_previous jsonb;
BEGIN
  IF v_actor IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT * INTO v_existing
  FROM public.membership_tiers
  WHERE id = p_tier_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership tier not found';
  END IF;

  IF v_existing.owner_type = 'profile' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_existing.owner_id
        AND p.user_id = v_actor
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  ELSIF v_existing.owner_type = 'label' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.label_members lm
      WHERE lm.label_id = v_existing.owner_id
        AND lm.user_id = v_actor
        AND lm.role IN ('owner', 'admin')
    ) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;

  v_previous := jsonb_build_object(
    'stripe_product_id', v_existing.stripe_product_id,
    'stripe_price_monthly_id', v_existing.stripe_price_monthly_id,
    'stripe_price_yearly_id', v_existing.stripe_price_yearly_id,
    'stripe_price_lifetime_id', v_existing.stripe_price_lifetime_id
  );

  PERFORM public.enqueue_membership_tier_sync('delete', to_jsonb(v_existing), v_previous, v_actor);

  DELETE FROM public.membership_tiers WHERE id = p_tier_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_membership_tier(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_membership_tier(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_membership_tier(uuid) TO authenticated;

DO $$
DECLARE
  v_command text := $cmd$
  SELECT
    net.http_post(
      url := 'https://qkwvqmubhyondemhasjp.supabase.co/functions/v1/membership-tier-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrd3ZxbXViaHlvbmRlbWhhc2pwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE1ODIzNDksImV4cCI6MjA2NzE1ODM0OX0.bABRv9v_9mdlfjFs5Txx_VLEX-M9bbhs0LrCbHZIV6o"}'::jsonb,
      body := jsonb_build_object('source', 'cron', 'limit', 10)
    )
  $cmd$;
DECLARE
  v_job_id bigint;
BEGIN
  SELECT jobid
  INTO v_job_id
  FROM cron.job
  WHERE jobname = 'membership-tier-stripe-sync';

  IF v_job_id IS NULL THEN
    PERFORM cron.schedule('membership-tier-stripe-sync', '*/5 * * * *', v_command);
  ELSE
    PERFORM cron.alter_job(v_job_id, schedule := '*/5 * * * *', command := v_command);
  END IF;
END;
$$;

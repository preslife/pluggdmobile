-- Membership access rule management, gating enforcement, and backfill

-- Ensure gated_content supports all content surfaces (beats & sample packs)
ALTER TABLE public.gated_content
  DROP CONSTRAINT IF EXISTS gated_content_content_type_check;

ALTER TABLE public.gated_content
  ADD CONSTRAINT gated_content_content_type_check
  CHECK (content_type IN ('post', 'track', 'release', 'video', 'livestream', 'beat', 'sample_pack'));

-- Add updated_at tracking for gate mutations
ALTER TABLE public.gated_content
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_gated_content_updated_at ON public.gated_content;
CREATE TRIGGER update_gated_content_updated_at
  BEFORE UPDATE ON public.gated_content
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Canonical view for analytics and Studio selectors
CREATE OR REPLACE VIEW public.membership_access_rules AS
SELECT
  content_type,
  content_id,
  owner_type,
  owner_id,
  gate_type,
  minimum_tier_id,
  allowed_tier_ids,
  preview_text,
  preview_duration,
  created_at,
  updated_at
FROM public.gated_content;

-- Fetch a single access rule for the editor & gating guards
CREATE OR REPLACE FUNCTION public.get_membership_access_rules(
  p_content_type text,
  p_content_id uuid
)
RETURNS TABLE (
  gate_type public.content_gate_type,
  minimum_tier_id uuid,
  allowed_tier_ids uuid[],
  preview_text text,
  preview_duration integer,
  owner_type text,
  owner_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.gate_type,
    gc.minimum_tier_id,
    gc.allowed_tier_ids,
    gc.preview_text,
    gc.preview_duration,
    gc.owner_type,
    gc.owner_id
  FROM public.gated_content gc
  WHERE gc.content_type = p_content_type
    AND gc.content_id = p_content_id;
END;
$$;

-- Insert or update gating metadata for content
CREATE OR REPLACE FUNCTION public.upsert_membership_access_rules(
  p_content_type text,
  p_content_id uuid,
  p_owner_type text,
  p_owner_id uuid,
  p_gate_type public.content_gate_type,
  p_minimum_tier_id uuid DEFAULT NULL,
  p_allowed_tier_ids uuid[] DEFAULT NULL,
  p_preview_text text DEFAULT NULL,
  p_preview_duration integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_owner_valid boolean := false;
  v_minimum_tier record;
BEGIN
  IF p_content_type IS NULL OR p_content_id IS NULL THEN
    RAISE EXCEPTION 'Content type and id are required';
  END IF;

  IF p_owner_type NOT IN ('profile', 'label') THEN
    RAISE EXCEPTION 'Owner type must be profile or label';
  END IF;

  -- Validate tier relationships when provided
  IF p_gate_type = 'tier_or_higher' THEN
    IF p_minimum_tier_id IS NULL THEN
      RAISE EXCEPTION 'minimum_tier_id required for tier_or_higher gate';
    END IF;

    SELECT id, owner_type, owner_id
    INTO v_minimum_tier
    FROM public.membership_tiers
    WHERE id = p_minimum_tier_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'minimum_tier_id % does not exist', p_minimum_tier_id;
    END IF;

    IF v_minimum_tier.owner_type <> p_owner_type OR v_minimum_tier.owner_id <> p_owner_id THEN
      RAISE EXCEPTION 'minimum tier owner mismatch for %', p_minimum_tier_id;
    END IF;
  ELSIF p_gate_type = 'specific_tier' THEN
    IF p_allowed_tier_ids IS NULL OR array_length(p_allowed_tier_ids, 1) = 0 THEN
      RAISE EXCEPTION 'allowed_tier_ids required for specific_tier gate';
    END IF;

    -- Ensure allowed tiers belong to the same owner
    IF EXISTS (
      SELECT 1
      FROM unnest(p_allowed_tier_ids) AS t(tier_id)
      LEFT JOIN public.membership_tiers mt ON mt.id = t.tier_id
      WHERE mt.id IS NULL
        OR mt.owner_type <> p_owner_type
        OR mt.owner_id <> p_owner_id
    ) THEN
      RAISE EXCEPTION 'allowed tiers must belong to the specified owner';
    END IF;
  END IF;

  -- Ensure the owner relationship exists (profile or label)
  IF p_owner_type = 'profile' THEN
    SELECT TRUE INTO v_owner_valid
    FROM public.profiles
    WHERE id = p_owner_id;
  ELSE
    SELECT TRUE INTO v_owner_valid
    FROM public.labels
    WHERE id = p_owner_id;
  END IF;

  IF NOT COALESCE(v_owner_valid, FALSE) THEN
    RAISE EXCEPTION 'Owner % of type % does not exist', p_owner_id, p_owner_type;
  END IF;

  INSERT INTO public.gated_content AS gc (
    content_type,
    content_id,
    owner_type,
    owner_id,
    gate_type,
    minimum_tier_id,
    allowed_tier_ids,
    preview_text,
    preview_duration
  ) VALUES (
    p_content_type,
    p_content_id,
    p_owner_type,
    p_owner_id,
    p_gate_type,
    p_minimum_tier_id,
    CASE WHEN p_gate_type = 'specific_tier' THEN p_allowed_tier_ids ELSE NULL END,
    p_preview_text,
    p_preview_duration
  )
  ON CONFLICT (content_type, content_id)
  DO UPDATE SET
    owner_type = EXCLUDED.owner_type,
    owner_id = EXCLUDED.owner_id,
    gate_type = EXCLUDED.gate_type,
    minimum_tier_id = EXCLUDED.minimum_tier_id,
    allowed_tier_ids = EXCLUDED.allowed_tier_ids,
    preview_text = EXCLUDED.preview_text,
    preview_duration = EXCLUDED.preview_duration,
    updated_at = now();
END;
$$;

-- Remove gating when disabling membership access
CREATE OR REPLACE FUNCTION public.delete_membership_access_rules(
  p_content_type text,
  p_content_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  DELETE FROM public.gated_content
  WHERE content_type = p_content_type
    AND content_id = p_content_id;
END;
$$;

GRANT SELECT ON public.membership_access_rules TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_membership_access_rules(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_membership_access_rules(text, uuid, text, uuid, public.content_gate_type, uuid, uuid[], text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_membership_access_rules(text, uuid) TO authenticated;

-- Backfill: promote premium releases without gating metadata into any-tier rules
INSERT INTO public.gated_content (content_type, content_id, owner_type, owner_id, gate_type, minimum_tier_id, allowed_tier_ids, preview_text, preview_duration)
SELECT
  'release',
  r.id,
  COALESCE(r.owner_type, 'profile'),
  COALESCE(r.owner_id, (
    SELECT id FROM public.profiles p WHERE p.user_id = r.user_id LIMIT 1
  )),
  'any_tier',
  NULL,
  NULL,
  NULL,
  NULL
FROM public.releases r
WHERE COALESCE(r.is_premium_content, FALSE) = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.gated_content gc
    WHERE gc.content_type = 'release'
      AND gc.content_id = r.id
  );

-- Reconcile existing gated_content rows missing owner metadata by inheriting from the content tables
UPDATE public.gated_content gc
SET owner_type = COALESCE(gc.owner_type, r.owner_type, 'profile'),
    owner_id = COALESCE(gc.owner_id, r.owner_id, (
      SELECT id FROM public.profiles p WHERE p.user_id = r.user_id LIMIT 1
    )),
    updated_at = now()
FROM public.releases r
WHERE gc.content_type = 'release'
  AND gc.content_id = r.id
  AND (gc.owner_id IS NULL OR gc.owner_type IS NULL);

UPDATE public.gated_content gc
SET owner_type = COALESCE(gc.owner_type, 'profile'),
    owner_id = COALESCE(gc.owner_id, b.owner_id, (
      SELECT id FROM public.profiles p WHERE p.user_id = b.user_id LIMIT 1
    )),
    updated_at = now()
FROM public.beats b
WHERE gc.content_type = 'beat'
  AND gc.content_id = b.id
  AND (gc.owner_id IS NULL OR gc.owner_type IS NULL);

UPDATE public.gated_content gc
SET owner_type = COALESCE(gc.owner_type, 'profile'),
    owner_id = COALESCE(gc.owner_id, pst.owner_id, (
      SELECT id FROM public.profiles p WHERE p.user_id = pst.user_id LIMIT 1
    )),
    updated_at = now()
FROM public.posts pst
WHERE gc.content_type = 'post'
  AND gc.content_id = pst.id
  AND (gc.owner_id IS NULL OR gc.owner_type IS NULL);

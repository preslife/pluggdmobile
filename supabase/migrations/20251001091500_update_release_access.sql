-- Align release access logic with membership gates

CREATE OR REPLACE FUNCTION public.can_access_release(p_user_id uuid, p_release_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_price numeric := 0;
  v_is_premium boolean := false;
  v_owner_type text := 'profile';
  v_owner_id uuid := NULL;
  v_user_id uuid := NULL;
  v_gate_exists boolean := false;
  v_has_purchase boolean := false;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    COALESCE(price, 0),
    COALESCE(is_premium_content, FALSE),
    COALESCE(owner_type, 'profile'),
    owner_id,
    user_id
  INTO v_price, v_is_premium, v_owner_type, v_owner_id, v_user_id
  FROM public.releases
  WHERE id = p_release_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.gated_content gc
    WHERE gc.content_type = 'release'
      AND gc.content_id = p_release_id
  )
  INTO v_gate_exists;

  IF v_gate_exists THEN
    IF public.check_content_access(p_user_id, 'release', p_release_id) THEN
      RETURN true;
    END IF;

    SELECT public.has_purchased_release(p_user_id, p_release_id)
    INTO v_has_purchase;

    IF v_has_purchase THEN
      RETURN true;
    END IF;

    RETURN false;
  END IF;

  -- Direct purchase unlocks releases without explicit gating
  SELECT public.has_purchased_release(p_user_id, p_release_id)
  INTO v_has_purchase;

  IF v_has_purchase THEN
    RETURN true;
  END IF;

  -- Free, non-premium releases remain public when ungated
  IF v_price = 0 AND NOT v_is_premium THEN
    RETURN true;
  END IF;

  -- Resolve owner fallback when older rows are missing ownership metadata
  IF v_owner_id IS NULL THEN
    SELECT id
    INTO v_owner_id
    FROM public.profiles
    WHERE user_id = v_user_id
    LIMIT 1;
  END IF;

  -- Premium content without explicit gate still respects active memberships for the owner
  IF v_owner_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.memberships m
      JOIN public.membership_tiers t ON t.id = m.tier_id
      WHERE m.user_id = p_user_id
        AND m.status = 'active'
        AND t.owner_type = v_owner_type
        AND t.owner_id = v_owner_id
    );
  END IF;

  RETURN false;
END;
$$;

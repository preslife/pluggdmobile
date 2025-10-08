BEGIN;

-- Create segments table to persist CRM segment definitions
CREATE TABLE IF NOT EXISTS public.crm_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    manual_contact_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    contact_count INTEGER NOT NULL DEFAULT 0,
    refresh_frequency_minutes INTEGER NOT NULL DEFAULT 60,
    refreshed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure updated_at stays fresh
DROP TRIGGER IF EXISTS set_timestamp_crm_segments ON public.crm_segments;
CREATE TRIGGER set_timestamp_crm_segments
BEFORE UPDATE ON public.crm_segments
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.crm_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view their segments" ON public.crm_segments;
CREATE POLICY "Creators can view their segments"
ON public.crm_segments
FOR SELECT
USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can insert their segments" ON public.crm_segments;
CREATE POLICY "Creators can insert their segments"
ON public.crm_segments
FOR INSERT
WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can update their segments" ON public.crm_segments;
CREATE POLICY "Creators can update their segments"
ON public.crm_segments
FOR UPDATE
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can delete their segments" ON public.crm_segments;
CREATE POLICY "Creators can delete their segments"
ON public.crm_segments
FOR DELETE
USING (auth.uid() = creator_id);

-- Segment membership table for cached membership counts
CREATE TABLE IF NOT EXISTS public.crm_segment_members (
    segment_id UUID NOT NULL REFERENCES public.crm_segments(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sources TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    total_spend NUMERIC NOT NULL DEFAULT 0,
    lifetime_value NUMERIC NOT NULL DEFAULT 0,
    last_interaction TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (segment_id, contact_id)
);

DROP TRIGGER IF EXISTS set_timestamp_crm_segment_members ON public.crm_segment_members;
CREATE TRIGGER set_timestamp_crm_segment_members
BEFORE UPDATE ON public.crm_segment_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.crm_segment_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creators can view their segment memberships" ON public.crm_segment_members;
CREATE POLICY "Creators can view their segment memberships"
ON public.crm_segment_members
FOR SELECT
USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Creators can manage their segment memberships" ON public.crm_segment_members;
CREATE POLICY "Creators can manage their segment memberships"
ON public.crm_segment_members
FOR ALL
USING (auth.uid() = creator_id)
WITH CHECK (auth.uid() = creator_id);

-- Followers aggregation
CREATE OR REPLACE VIEW public.crm_contact_rollup AS
WITH followers AS (
    SELECT
        uf.following_id AS creator_id,
        uf.follower_id AS contact_id,
        MIN(uf.created_at) AS follower_since,
        MAX(uf.created_at) AS follower_last
    FROM public.user_follows uf
    GROUP BY 1, 2
),
customers AS (
    SELECT
        oi.creator_id,
        o.user_id AS contact_id,
        MIN(o.created_at) AS first_order_at,
        MAX(o.created_at) AS last_order_at,
        COALESCE(SUM(oi.price::NUMERIC * COALESCE(oi.quantity, 1)), 0) AS order_value,
        COUNT(DISTINCT o.id) AS order_count
    FROM public.order_items oi
    INNER JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.creator_id IS NOT NULL
      AND o.status IN ('completed', 'processing')
    GROUP BY 1, 2
),
members AS (
    SELECT
        fs.creator_id,
        fs.fan_id AS contact_id,
        MIN(fs.created_at) AS membership_since,
        MAX(fs.updated_at) AS membership_last,
        MAX(fs.status) AS membership_status,
        COALESCE(SUM(fs.price_cents), 0) / 100.0 AS membership_value
    FROM public.fan_subscriptions fs
    GROUP BY 1, 2
),
students AS (
    SELECT
        c.instructor_id AS creator_id,
        cp.user_id AS contact_id,
        MIN(cp.purchased_at) AS first_course_purchase,
        MAX(cp.purchased_at) AS last_course_purchase,
        COALESCE(SUM(cp.amount_paid), 0) AS course_value
    FROM public.course_purchases cp
    INNER JOIN public.courses c ON c.id = cp.course_id
    GROUP BY 1, 2
),
combined AS (
    SELECT creator_id, contact_id FROM followers
    UNION
    SELECT creator_id, contact_id FROM customers
    UNION
    SELECT creator_id, contact_id FROM members
    UNION
    SELECT creator_id, contact_id FROM students
)
SELECT
    c.creator_id,
    c.contact_id,
    followers.follower_since,
    followers.follower_last,
    customers.first_order_at,
    customers.last_order_at,
    customers.order_value,
    customers.order_count,
    members.membership_since,
    members.membership_last,
    members.membership_status,
    members.membership_value,
    students.first_course_purchase,
    students.last_course_purchase,
    students.course_value,
    array_remove(ARRAY[
        CASE WHEN followers.contact_id IS NOT NULL THEN 'follower' END,
        CASE WHEN customers.contact_id IS NOT NULL THEN 'customer' END,
        CASE WHEN members.contact_id IS NOT NULL THEN 'member' END,
        CASE WHEN students.contact_id IS NOT NULL THEN 'student' END
    ], NULL) AS sources,
    COALESCE(customers.order_value, 0)
      + COALESCE(members.membership_value, 0)
      + COALESCE(students.course_value, 0) AS total_spend,
    GREATEST(
        COALESCE(customers.last_order_at, '-infinity'),
        COALESCE(members.membership_last, '-infinity'),
        COALESCE(students.last_course_purchase, '-infinity'),
        COALESCE(followers.follower_last, '-infinity')
    ) AS last_interaction,
    LEAST(
        COALESCE(customers.first_order_at, 'infinity'),
        COALESCE(members.membership_since, 'infinity'),
        COALESCE(students.first_course_purchase, 'infinity'),
        COALESCE(followers.follower_since, 'infinity')
    ) AS first_interaction
FROM combined c
LEFT JOIN followers ON followers.creator_id = c.creator_id AND followers.contact_id = c.contact_id
LEFT JOIN customers ON customers.creator_id = c.creator_id AND customers.contact_id = c.contact_id
LEFT JOIN members ON members.creator_id = c.creator_id AND members.contact_id = c.contact_id
LEFT JOIN students ON students.creator_id = c.creator_id AND students.contact_id = c.contact_id;

-- Function to fetch CRM contacts with profile metadata
CREATE OR REPLACE FUNCTION public.get_crm_contacts(p_creator_id UUID DEFAULT auth.uid())
RETURNS TABLE (
    contact_id UUID,
    email TEXT,
    username TEXT,
    full_name TEXT,
    sources TEXT[],
    total_spend NUMERIC,
    lifetime_value NUMERIC,
    last_interaction TIMESTAMPTZ,
    first_interaction TIMESTAMPTZ,
    order_count INTEGER,
    follower_since TIMESTAMPTZ,
    membership_status TEXT,
    membership_value NUMERIC,
    membership_since TIMESTAMPTZ,
    student_value NUMERIC,
    student_since TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_request_role TEXT := current_setting('request.jwt.claim.role', true);
  v_request_uid UUID := auth.uid();
  v_effective_creator UUID;
BEGIN
  IF COALESCE(v_request_role, '') <> 'service_role' THEN
    IF v_request_uid IS NULL THEN
      RAISE EXCEPTION 'Access denied for anonymous caller'
        USING ERRCODE = '42501';
    END IF;

    IF p_creator_id IS NOT NULL AND p_creator_id <> v_request_uid THEN
      RAISE EXCEPTION 'Access denied for creator %', p_creator_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  v_effective_creator := COALESCE(p_creator_id, v_request_uid);

  IF v_effective_creator IS NULL THEN
    RAISE EXCEPTION 'Creator id required'
      USING ERRCODE = '22004';
  END IF;

  RETURN QUERY
  SELECT
    r.contact_id,
    u.email,
    p.username,
    p.full_name,
    r.sources,
    r.total_spend,
    r.total_spend AS lifetime_value,
    NULLIF(r.last_interaction, '-infinity') AS last_interaction,
    NULLIF(r.first_interaction, 'infinity') AS first_interaction,
    COALESCE(r.order_count, 0) AS order_count,
    r.follower_since,
    r.membership_status,
    r.membership_value,
    r.membership_since,
    r.course_value AS student_value,
    r.first_course_purchase AS student_since
  FROM public.crm_contact_rollup r
  LEFT JOIN public.profiles p ON p.user_id = r.contact_id
  LEFT JOIN auth.users u ON u.id = r.contact_id
  WHERE r.creator_id = v_effective_creator;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_contacts(UUID) TO authenticated, service_role;

-- Function to log structured system events
CREATE OR REPLACE FUNCTION public.log_system_event(
  p_level INTEGER,
  p_message TEXT,
  p_component TEXT,
  p_action TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  INSERT INTO public.system_logs(level, message, component, action, metadata, user_id)
  VALUES (p_level, p_message, p_component, p_action, COALESCE(p_metadata, '{}'::jsonb), p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_system_event(INTEGER, TEXT, TEXT, TEXT, JSONB, UUID) TO authenticated, service_role;

-- Helper function to refresh an individual segment
CREATE OR REPLACE FUNCTION public.refresh_crm_segment(p_segment_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_segment public.crm_segments%ROWTYPE;
BEGIN
  SELECT * INTO v_segment FROM public.crm_segments WHERE id = p_segment_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM public.crm_segment_members WHERE segment_id = p_segment_id;

  WITH filtered AS (
    SELECT
      v_segment.id AS segment_id,
      c.contact_id,
      c.creator_id,
      c.sources,
      c.total_spend,
      c.total_spend AS lifetime_value,
      c.last_interaction
    FROM public.crm_contact_rollup c
    WHERE c.creator_id = v_segment.creator_id
      AND (
        NOT (v_segment.filters ? 'sources')
        OR c.sources && ARRAY(
          SELECT jsonb_array_elements_text(v_segment.filters -> 'sources')
        )
      )
      AND (
        NOT (v_segment.filters ? 'min_total_spend')
        OR c.total_spend >= (v_segment.filters ->> 'min_total_spend')::NUMERIC
      )
      AND (
        NOT (v_segment.filters ? 'max_days_since_last_interaction')
        OR c.last_interaction >= NOW() - ((v_segment.filters ->> 'max_days_since_last_interaction')::INT || ' days')::INTERVAL
      )
      AND (
        NOT (v_segment.filters ? 'membership_status')
        OR c.membership_status = v_segment.filters ->> 'membership_status'
      )
      AND (
        NOT (v_segment.filters ? 'min_orders')
        OR COALESCE(c.order_count, 0) >= (v_segment.filters ->> 'min_orders')::INT
      )
  ),
  manual_contacts AS (
    SELECT
      v_segment.id AS segment_id,
      manual_ids.contact_id,
      v_segment.creator_id,
      COALESCE(c.sources, ARRAY[]::TEXT[]) || ARRAY['manual'] AS sources,
      COALESCE(c.total_spend, 0) AS total_spend,
      COALESCE(c.total_spend, 0) AS lifetime_value,
      COALESCE(c.last_interaction, NOW()) AS last_interaction
    FROM UNNEST(COALESCE(v_segment.manual_contact_ids, ARRAY[]::UUID[])) AS manual_ids(contact_id)
    LEFT JOIN public.crm_contact_rollup c
      ON c.creator_id = v_segment.creator_id
     AND c.contact_id = manual_ids.contact_id
  ),
  combined AS (
    SELECT * FROM filtered
    UNION ALL
    SELECT * FROM manual_contacts
  ),
  aggregated AS (
    SELECT
      segment_id,
      contact_id,
      creator_id,
      ARRAY_AGG(DISTINCT source) AS sources,
      MAX(total_spend) AS total_spend,
      MAX(lifetime_value) AS lifetime_value,
      MAX(last_interaction) AS last_interaction
    FROM (
      SELECT
        segment_id,
        contact_id,
        creator_id,
        UNNEST(COALESCE(sources, ARRAY[]::TEXT[])) AS source,
        total_spend,
        lifetime_value,
        last_interaction
      FROM combined
    ) expanded
    GROUP BY segment_id, contact_id, creator_id
  )
  INSERT INTO public.crm_segment_members(segment_id, contact_id, creator_id, sources, total_spend, lifetime_value, last_interaction)
  SELECT
    segment_id,
    contact_id,
    creator_id,
    sources,
    total_spend,
    lifetime_value,
    last_interaction
  FROM aggregated;

  UPDATE public.crm_segments
  SET
    contact_count = (
      SELECT COUNT(*)
      FROM public.crm_segment_members
      WHERE segment_id = p_segment_id
    ),
    refreshed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_segment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_crm_segment(UUID) TO authenticated, service_role;

-- Batch refresher
CREATE OR REPLACE FUNCTION public.refresh_due_crm_segments()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_segment_id UUID;
BEGIN
  FOR v_segment_id IN
    SELECT id
    FROM public.crm_segments
    WHERE refreshed_at IS NULL
       OR refreshed_at < NOW() - (refresh_frequency_minutes || ' minutes')::INTERVAL
       OR updated_at > refreshed_at
  LOOP
    PERFORM public.refresh_crm_segment(v_segment_id);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_due_crm_segments() TO service_role;

-- Schedule hourly refresh
SELECT cron.schedule(
  'refresh-crm-segments-hourly',
  '15 * * * *',
  $$
    SELECT public.refresh_due_crm_segments();
  $$
);

COMMIT;

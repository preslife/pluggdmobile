-- Studio service-layer RPCs and views for CRM, catalog, and crowdfunding modules
set search_path = public;

-- Ensure dependent views/functions can be recreated safely
DROP VIEW IF EXISTS public.crm_contacts_enriched;

CREATE OR REPLACE VIEW public.crm_contacts_enriched AS
WITH order_data AS (
  SELECT
    oi.creator_id,
    o.user_id AS contact_id,
    SUM(oi.price * oi.quantity)::numeric / 100.0 AS order_total,
    COUNT(DISTINCT o.id) AS order_count,
    MAX(COALESCE(o.paid_at, o.updated_at, o.created_at)) AS last_order_at,
    MIN(o.created_at) AS first_order_at
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.creator_id IS NOT NULL
  GROUP BY oi.creator_id, o.user_id
),
membership_owner AS (
  SELECT
    mt.id,
    CASE mt.owner_type
      WHEN 'profile' THEN prof.user_id
      WHEN 'label' THEN lbl.owner_user_id
      ELSE NULL
    END AS creator_user_id
  FROM public.membership_tiers mt
  LEFT JOIN public.profiles prof ON prof.id = mt.owner_id AND mt.owner_type = 'profile'
  LEFT JOIN public.labels lbl ON lbl.id = mt.owner_id AND mt.owner_type = 'label'
),
membership_data AS (
  SELECT
    mo.creator_user_id AS creator_id,
    m.user_id AS contact_id,
    MAX(m.status::text) AS membership_status,
    SUM(m.support_amount)::numeric / 100.0 AS membership_value,
    MIN(m.started_at) AS membership_since,
    MAX(m.updated_at) AS last_membership_at
  FROM public.memberships m
  JOIN membership_owner mo ON mo.id = m.tier_id
  WHERE mo.creator_user_id IS NOT NULL
  GROUP BY mo.creator_user_id, m.user_id
),
crowdfunding_data AS (
  SELECT
    c.creator_id,
    cs.supporter_id AS contact_id,
    SUM(cs.contribution_amount_cents)::numeric / 100.0 AS crowdfunding_total,
    COUNT(*) AS contribution_count,
    MAX(cs.contributed_at) AS last_support_at,
    MIN(cs.contributed_at) AS first_support_at
  FROM public.campaign_supporters cs
  JOIN public.campaigns c ON c.id = cs.campaign_id
  WHERE cs.supporter_id IS NOT NULL
  GROUP BY c.creator_id, cs.supporter_id
),
fan_subscription_data AS (
  SELECT
    fs.creator_id,
    fs.fan_id AS contact_id,
    MAX(fs.updated_at) AS last_subscription_at,
    MIN(fs.created_at) AS first_subscription_at
  FROM public.fan_subscriptions fs
  GROUP BY fs.creator_id, fs.fan_id
),
base_contacts AS (
  SELECT
    COALESCE(order_data.creator_id, membership_data.creator_id, crowdfunding_data.creator_id, fan_subscription_data.creator_id) AS creator_id,
    COALESCE(order_data.contact_id, membership_data.contact_id, crowdfunding_data.contact_id, fan_subscription_data.contact_id) AS contact_id,
    GREATEST(
      COALESCE(order_data.last_order_at, '-infinity'::timestamptz),
      COALESCE(membership_data.last_membership_at, '-infinity'::timestamptz),
      COALESCE(crowdfunding_data.last_support_at, '-infinity'::timestamptz),
      COALESCE(fan_subscription_data.last_subscription_at, '-infinity'::timestamptz)
    ) AS last_touch_at,
    NULLIF(LEAST(
      COALESCE(order_data.first_order_at, 'infinity'::timestamptz),
      COALESCE(membership_data.membership_since, 'infinity'::timestamptz),
      COALESCE(crowdfunding_data.first_support_at, 'infinity'::timestamptz),
      COALESCE(fan_subscription_data.first_subscription_at, 'infinity'::timestamptz)
    ), 'infinity'::timestamptz) AS first_touch_at
  FROM order_data
  FULL OUTER JOIN membership_data USING (creator_id, contact_id)
  FULL OUTER JOIN crowdfunding_data USING (creator_id, contact_id)
  FULL OUTER JOIN fan_subscription_data USING (creator_id, contact_id)
  WHERE COALESCE(order_data.creator_id, membership_data.creator_id, crowdfunding_data.creator_id, fan_subscription_data.creator_id) IS NOT NULL
    AND COALESCE(order_data.contact_id, membership_data.contact_id, crowdfunding_data.contact_id, fan_subscription_data.contact_id) IS NOT NULL
),
profile_data AS (
  SELECT
    p.user_id AS contact_id,
    p.full_name,
    p.username,
    au.email
  FROM public.profiles p
  LEFT JOIN auth.users au ON au.id = p.user_id
)
SELECT
  bc.creator_id,
  bc.contact_id,
  pd.email,
  pd.username,
  pd.full_name,
  ARRAY(SELECT tag FROM unnest(ARRAY[
    CASE WHEN order_data.order_count IS NOT NULL AND order_data.order_count > 0 THEN 'customer' END,
    CASE WHEN membership_data.membership_status IS NOT NULL THEN 'member' END,
    CASE WHEN crowdfunding_data.contribution_count IS NOT NULL AND crowdfunding_data.contribution_count > 0 THEN 'supporter' END,
    CASE WHEN fan_subscription_data.contact_id IS NOT NULL THEN 'follower' END
  ]) tag WHERE tag IS NOT NULL) AS sources,
  ARRAY(SELECT DISTINCT tag FROM unnest(
    ARRAY[
      CASE WHEN order_data.order_count IS NOT NULL AND order_data.order_count > 0 THEN 'customer' END,
      CASE WHEN membership_data.membership_status IS NOT NULL THEN 'member' END,
      CASE WHEN crowdfunding_data.contribution_count IS NOT NULL AND crowdfunding_data.contribution_count > 0 THEN 'supporter' END,
      CASE WHEN fan_subscription_data.contact_id IS NOT NULL THEN 'follower' END,
      CASE WHEN membership_data.membership_status = 'active' THEN 'active_member' END,
      CASE WHEN (COALESCE(order_data.order_total, 0) + COALESCE(crowdfunding_data.crowdfunding_total, 0)) >= 100 THEN 'vip' END
    ]
  ) tag WHERE tag IS NOT NULL) AS tags,
  COALESCE(order_data.order_total, 0) + COALESCE(crowdfunding_data.crowdfunding_total, 0) AS total_spend,
  COALESCE(order_data.order_total, 0) AS lifetime_value,
  COALESCE(bc.last_touch_at, bc.first_touch_at) AS last_interaction,
  bc.first_touch_at AS first_interaction,
  COALESCE(order_data.order_count, 0) AS order_count,
  membership_data.membership_status,
  COALESCE(membership_data.membership_value, 0) AS membership_value,
  membership_data.membership_since,
  0::numeric AS student_value,
  NULL::timestamptz AS student_since
FROM base_contacts bc
LEFT JOIN order_data ON order_data.creator_id = bc.creator_id AND order_data.contact_id = bc.contact_id
LEFT JOIN membership_data ON membership_data.creator_id = bc.creator_id AND membership_data.contact_id = bc.contact_id
LEFT JOIN crowdfunding_data ON crowdfunding_data.creator_id = bc.creator_id AND crowdfunding_data.contact_id = bc.contact_id
LEFT JOIN fan_subscription_data ON fan_subscription_data.creator_id = bc.creator_id AND fan_subscription_data.contact_id = bc.contact_id
LEFT JOIN profile_data pd ON pd.contact_id = bc.contact_id;

COMMENT ON VIEW public.crm_contacts_enriched IS 'Aggregated CRM contact data including spend, membership, and engagement signals.';

DROP FUNCTION IF EXISTS public.get_crm_contacts(uuid);
CREATE OR REPLACE FUNCTION public.get_crm_contacts(p_creator_id uuid)
RETURNS TABLE (
  contact_id uuid,
  email text,
  username text,
  full_name text,
  sources text[],
  total_spend numeric,
  lifetime_value numeric,
  last_interaction timestamptz,
  first_interaction timestamptz,
  order_count integer,
  follower_since timestamptz,
  membership_status text,
  membership_value numeric,
  membership_since timestamptz,
  student_value numeric,
  student_since timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    contact_id,
    email,
    username,
    full_name,
    sources,
    total_spend,
    lifetime_value,
    last_interaction,
    first_interaction,
    order_count,
    NULL::timestamptz AS follower_since,
    membership_status,
    membership_value,
    membership_since,
    student_value,
    student_since
  FROM public.crm_contacts_enriched
  WHERE creator_id = p_creator_id
  ORDER BY COALESCE(last_interaction, first_interaction) DESC NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_crm_contacts(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.crm_list_contacts(uuid, uuid, integer, integer, text, text[], uuid);
CREATE OR REPLACE FUNCTION public.crm_list_contacts(
  p_creator_id uuid,
  p_actor_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_query text DEFAULT NULL,
  p_tags text[] DEFAULT NULL,
  p_segment_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := GREATEST(1, LEAST(200, COALESCE(p_limit, 50)));
  v_offset integer := GREATEST(0, COALESCE(p_offset, 0));
  v_items jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_active bigint := 0;
  v_vip bigint := 0;
  v_total_revenue numeric := 0;
  v_email_subscribers bigint := 0;
  v_sales_count numeric := 0;
  v_membership_count numeric := 0;
  v_crowd_total numeric := 0;
  v_crowd_supporters bigint := 0;
  v_summary jsonb := '{}'::jsonb;
BEGIN
  IF p_actor_id IS NULL OR p_creator_id IS NULL THEN
    RAISE EXCEPTION 'Actor and creator are required';
  END IF;

  IF p_actor_id <> p_creator_id THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.label_members lm
      JOIN public.labels lbl ON lbl.id = lm.label_id
      WHERE lm.user_id = p_actor_id
        AND lbl.owner_user_id = p_creator_id
        AND lm.role IN ('owner', 'admin', 'editor')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions for CRM access';
    END IF;
  END IF;

  WITH base AS (
    SELECT *
    FROM public.crm_contacts_enriched c
    WHERE c.creator_id = p_creator_id
      AND (
        p_query IS NULL
        OR c.email ILIKE '%' || p_query || '%'
        OR c.username ILIKE '%' || p_query || '%'
        OR c.full_name ILIKE '%' || p_query || '%'
      )
      AND (
        p_tags IS NULL OR p_tags = '{}'::text[] OR c.tags && p_tags
      )
      AND (
        p_segment_id IS NULL OR EXISTS (
          SELECT 1
          FROM public.crm_segment_members sm
          WHERE sm.segment_id = p_segment_id
            AND sm.contact_id = c.contact_id
        )
      )
  ),
  counts AS (
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE COALESCE(base.last_interaction, base.first_interaction) >= (now() - INTERVAL '60 days')) AS active_contacts,
      COUNT(*) FILTER (WHERE 'vip' = ANY(base.tags)) AS vip_contacts,
      COALESCE(SUM(base.total_spend), 0) AS total_revenue,
      COUNT(*) FILTER (WHERE base.email IS NOT NULL) AS email_subscribers,
      COALESCE(SUM(base.order_count), 0) AS sales_count,
      COUNT(*) FILTER (WHERE base.membership_status = 'active') AS membership_count
    FROM base
  ),
  campaign_rollup AS (
    SELECT
      COALESCE(SUM(cs.contribution_amount_cents), 0)::numeric / 100.0 AS raised_total,
      COUNT(DISTINCT cs.supporter_id) AS supporter_count
    FROM public.campaign_supporters cs
    JOIN public.campaigns c ON c.id = cs.campaign_id
    WHERE c.creator_id = p_creator_id
  ),
  analytics AS (
    SELECT *
    FROM public.creator_metrics cm
    WHERE cm.creator_id = p_creator_id
    ORDER BY cm.metric_date DESC
    LIMIT 1
  ),
  paginated AS (
    SELECT *
    FROM base
    ORDER BY COALESCE(base.last_interaction, base.first_interaction) DESC NULLS LAST
    LIMIT v_limit OFFSET v_offset
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(paginated)), '[]'::jsonb),
    counts.total_count,
    counts.active_contacts,
    counts.vip_contacts,
    counts.total_revenue,
    counts.email_subscribers,
    COALESCE(analytics.sales_count, counts.sales_count) AS resolved_sales,
    COALESCE(analytics.subs_count, counts.membership_count) AS resolved_memberships,
    campaign_rollup.raised_total,
    campaign_rollup.supporter_count
  INTO v_items, v_total, v_active, v_vip, v_total_revenue, v_email_subscribers, v_sales_count, v_membership_count, v_crowd_total, v_crowd_supporters
  FROM paginated
  CROSS JOIN counts
  LEFT JOIN analytics ON TRUE
  CROSS JOIN campaign_rollup;

  IF v_items IS NULL THEN
    v_items := '[]'::jsonb;
  END IF;

  v_summary := jsonb_build_object(
    'totalContacts', COALESCE(v_total, 0),
    'activeContacts', COALESCE(v_active, 0),
    'vipContacts', COALESCE(v_vip, 0),
    'totalRevenue', COALESCE(v_total_revenue, 0),
    'emailSubscribers', COALESCE(v_email_subscribers, 0),
    'salesCount', COALESCE(v_sales_count, 0),
    'membershipCount', COALESCE(v_membership_count, 0),
    'crowdfundingRaised', COALESCE(v_crowd_total, 0),
    'crowdfundingSupporters', COALESCE(v_crowd_supporters, 0)
  );

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', COALESCE(v_total, 0),
    'limit', v_limit,
    'offset', v_offset,
    'summary', v_summary
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crm_list_contacts(uuid, uuid, integer, integer, text, text[], uuid) TO authenticated;

DROP VIEW IF EXISTS public.catalog_items_overview;
CREATE OR REPLACE VIEW public.catalog_items_overview AS
WITH release_owner AS (
  SELECT
    r.id AS release_id,
    COALESCE(r.user_id::uuid, prof.user_id, lbl.owner_user_id) AS owner_user_id,
    CASE WHEN r.owner_type = 'label' THEN r.owner_id::uuid ELSE NULL END AS owner_label_id
  FROM public.releases r
  LEFT JOIN public.profiles prof ON prof.id = r.owner_id AND r.owner_type = 'profile'
  LEFT JOIN public.labels lbl ON lbl.id = r.owner_id AND r.owner_type = 'label'
),
beat_owner AS (
  SELECT
    b.id AS beat_id,
    COALESCE(b.user_id::uuid, prof.user_id, lbl.owner_user_id) AS owner_user_id,
    CASE WHEN b.owner_type = 'label' THEN b.owner_id::uuid ELSE NULL END AS owner_label_id
  FROM public.beats b
  LEFT JOIN public.profiles prof ON prof.id = b.owner_id AND b.owner_type = 'profile'
  LEFT JOIN public.labels lbl ON lbl.id = b.owner_id AND b.owner_type = 'label'
),
beat_sales_summary AS (
  SELECT
    bs.beat_id,
    COUNT(*) AS sale_count,
    COALESCE(SUM(bs.sale_price), 0)::numeric AS gross_revenue
  FROM public.beat_sales bs
  GROUP BY bs.beat_id
),
bundle_owner AS (
  SELECT
    cb.id AS bundle_id,
    COALESCE(cb.user_id::uuid, prof.user_id, lbl.owner_user_id) AS owner_user_id,
    CASE WHEN cb.owner_type = 'label' THEN cb.owner_id::uuid ELSE NULL END AS owner_label_id
  FROM public.creator_bundles cb
  LEFT JOIN public.profiles prof ON prof.id = cb.owner_id AND cb.owner_type = 'profile'
  LEFT JOIN public.labels lbl ON lbl.id = cb.owner_id AND cb.owner_type = 'label'
),
merch_owner AS (
  SELECT
    cm.id AS merch_id,
    COALESCE(prof.user_id, lbl.owner_user_id) AS owner_user_id,
    CASE WHEN cm.owner_type = 'label' THEN cm.owner_id::uuid ELSE NULL END AS owner_label_id
  FROM public.creator_merchandise cm
  LEFT JOIN public.profiles prof ON prof.id = cm.owner_id AND cm.owner_type = 'profile'
  LEFT JOIN public.labels lbl ON lbl.id = cm.owner_id AND cm.owner_type = 'label'
),
collectible_owner AS (
  SELECT
    cc.id AS collectible_id,
    COALESCE(prof.user_id, lbl.owner_user_id) AS owner_user_id,
    CASE WHEN cc.owner_type = 'label' THEN cc.owner_id::uuid ELSE NULL END AS owner_label_id
  FROM public.creator_collectibles cc
  LEFT JOIN public.profiles prof ON prof.id = cc.owner_id AND cc.owner_type = 'profile'
  LEFT JOIN public.labels lbl ON lbl.id = cc.owner_id AND cc.owner_type = 'label'
)
SELECT
  'release'::text AS item_type,
  r.id AS item_id,
  release_owner.owner_user_id,
  release_owner.owner_label_id,
  r.title,
  COALESCE(r.status, 'draft') AS status,
  COALESCE(r.price, 0)::numeric * 100 AS price_cents,
  COALESCE(r.total_plays, 0) AS sales_count,
  COALESCE(r.total_revenue, 0)::numeric * 100 AS revenue_cents,
  r.created_at,
  r.updated_at,
  r.cover_art_url AS media_url,
  jsonb_build_object(
    'release_date', r.release_date,
    'artist', r.artist,
    'genre', r.genre,
    'release_type', r.release_type
  ) AS extra_metadata
FROM public.releases r
JOIN release_owner ON release_owner.release_id = r.id

UNION ALL

SELECT
  'beat',
  b.id,
  beat_owner.owner_user_id,
  beat_owner.owner_label_id,
  b.title,
  CASE WHEN b.is_published THEN 'live' ELSE 'draft' END,
  COALESCE(b.price, 0)::numeric * 100,
  COALESCE(bss.sale_count, 0),
  COALESCE(bss.gross_revenue, 0)::numeric * 100,
  b.created_at,
  b.updated_at,
  b.image_url,
  jsonb_build_object('bpm', b.bpm, 'key', b.key, 'genre', b.genre)
FROM public.beats b
JOIN beat_owner ON beat_owner.beat_id = b.id
LEFT JOIN beat_sales_summary bss ON bss.beat_id = b.id

UNION ALL

SELECT
  'bundle',
  cb.id,
  bundle_owner.owner_user_id,
  bundle_owner.owner_label_id,
  cb.title,
  cb.status,
  COALESCE(cb.bundle_price, 0)::numeric * 100,
  COALESCE(cb.sales_count, 0),
  COALESCE(cb.revenue_total, 0)::numeric * 100,
  cb.created_at,
  cb.updated_at,
  cb.image_url,
  COALESCE(cb.bundle_items, '{}'::jsonb)
FROM public.creator_bundles cb
JOIN bundle_owner ON bundle_owner.bundle_id = cb.id

UNION ALL

SELECT
  'merch',
  cm.id,
  merch_owner.owner_user_id,
  merch_owner.owner_label_id,
  cm.title,
  cm.status,
  COALESCE(cm.price, 0)::numeric * 100,
  COALESCE(cm.sales_count, 0),
  COALESCE(cm.revenue_total, 0)::numeric * 100,
  cm.created_at,
  cm.updated_at,
  cm.image_url,
  jsonb_build_object('category', cm.category, 'product_type', cm.product_type)
FROM public.creator_merchandise cm
JOIN merch_owner ON merch_owner.merch_id = cm.id

UNION ALL

SELECT
  'collectible',
  cc.id,
  collectible_owner.owner_user_id,
  collectible_owner.owner_label_id,
  cc.title,
  cc.status,
  COALESCE(cc.price, 0)::numeric * 100,
  COALESCE(cc.sales_count, 0),
  COALESCE(cc.revenue_total, 0)::numeric * 100,
  cc.created_at,
  cc.updated_at,
  (cc.digital_assets ->> 'cover')::text,
  jsonb_build_object('collectible_type', cc.collectible_type, 'edition_type', cc.edition_type)
FROM public.creator_collectibles cc
JOIN collectible_owner ON collectible_owner.collectible_id = cc.id;

COMMENT ON VIEW public.catalog_items_overview IS 'Normalized catalog listings across releases, beats, bundles, merchandise, and collectibles.';

DROP FUNCTION IF EXISTS public.catalog_list_items(uuid, uuid, uuid, text[], text[], text, integer, integer);
CREATE OR REPLACE FUNCTION public.catalog_list_items(
  p_actor_id uuid,
  p_owner_user_id uuid DEFAULT NULL,
  p_owner_label_id uuid DEFAULT NULL,
  p_types text[] DEFAULT NULL,
  p_status text[] DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_user uuid := COALESCE(p_owner_user_id, p_actor_id);
  v_owner_label uuid := p_owner_label_id;
  v_limit integer := GREATEST(1, LEAST(200, COALESCE(p_limit, 50)));
  v_offset integer := GREATEST(0, COALESCE(p_offset, 0));
  v_items jsonb := '[]'::jsonb;
  v_total bigint := 0;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Actor is required';
  END IF;

  IF v_owner_label IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.labels lbl
      LEFT JOIN public.label_members lm ON lm.label_id = lbl.id AND lm.user_id = p_actor_id
      WHERE lbl.id = v_owner_label
        AND (lbl.owner_user_id = p_actor_id OR lm.role IN ('owner', 'admin', 'editor'))
    ) THEN
      RAISE EXCEPTION 'Label access denied';
    END IF;
  ELSIF v_owner_user <> p_actor_id THEN
    RAISE EXCEPTION 'Catalog access denied';
  END IF;

  WITH base AS (
    SELECT *
    FROM public.catalog_items_overview cio
    WHERE (v_owner_user IS NULL OR cio.owner_user_id = v_owner_user)
      AND (v_owner_label IS NULL OR cio.owner_label_id = v_owner_label)
      AND (p_types IS NULL OR p_types = '{}'::text[] OR cio.item_type = ANY(p_types))
      AND (p_status IS NULL OR p_status = '{}'::text[] OR cio.status = ANY(p_status))
      AND (
        p_search IS NULL OR cio.title ILIKE '%' || p_search || '%'
      )
  ),
  paginated AS (
    SELECT *
    FROM base
    ORDER BY base.created_at DESC
    LIMIT v_limit OFFSET v_offset
  )
  SELECT COALESCE(jsonb_agg(to_jsonb(paginated)), '[]'::jsonb)
  INTO v_items
  FROM paginated;

  SELECT COUNT(*) INTO v_total FROM base;

  IF v_items IS NULL THEN
    v_items := '[]'::jsonb;
  END IF;

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', COALESCE(v_total, 0),
    'limit', v_limit,
    'offset', v_offset
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.catalog_list_items(uuid, uuid, uuid, text[], text[], text, integer, integer) TO authenticated;

DROP FUNCTION IF EXISTS public.crowdfunding_list_campaigns(uuid, uuid, integer, integer);
CREATE OR REPLACE FUNCTION public.crowdfunding_list_campaigns(
  p_creator_id uuid,
  p_actor_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit integer := GREATEST(1, LEAST(100, COALESCE(p_limit, 20)));
  v_offset integer := GREATEST(0, COALESCE(p_offset, 0));
  v_items jsonb := '[]'::jsonb;
  v_total bigint := 0;
  v_total_raised numeric := 0;
  v_total_supporters bigint := 0;
  v_live_campaigns bigint := 0;
  v_summary jsonb := '{}'::jsonb;
BEGIN
  IF p_actor_id IS NULL OR p_creator_id IS NULL THEN
    RAISE EXCEPTION 'Actor and creator are required';
  END IF;

  IF p_actor_id <> p_creator_id THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.label_members lm
      JOIN public.labels lbl ON lbl.id = lm.label_id
      WHERE lm.user_id = p_actor_id
        AND lbl.owner_user_id = p_creator_id
        AND lm.role IN ('owner', 'admin', 'editor')
    ) THEN
      RAISE EXCEPTION 'Insufficient permissions for crowdfunding access';
    END IF;
  END IF;

  WITH base AS (
    SELECT
      c.*,
      COALESCE((
        SELECT jsonb_agg(to_jsonb(r) ORDER BY r.contribution_amount_cents ASC)
        FROM public.campaign_rewards r
        WHERE r.campaign_id = c.id
      ), '[]'::jsonb) AS rewards,
      COALESCE((
        SELECT jsonb_agg(
          to_jsonb(s) || jsonb_build_object(
            'supporter', jsonb_build_object(
              'full_name', prof.full_name,
              'username', prof.username,
              'avatar_url', prof.avatar_url
            )
          )
          ORDER BY s.contributed_at DESC
        )
        FROM public.campaign_supporters s
        LEFT JOIN public.profiles prof ON prof.user_id = s.supporter_id
        WHERE s.campaign_id = c.id
      ), '[]'::jsonb) AS supporters,
      COALESCE((
        SELECT jsonb_agg(to_jsonb(h) ORDER BY h.created_at DESC)
        FROM public.campaign_status_history h
        WHERE h.campaign_id = c.id
      ), '[]'::jsonb) AS status_history
    FROM public.campaigns c
    WHERE c.creator_id = p_creator_id
  ),
  paginated AS (
    SELECT *
    FROM base
    ORDER BY base.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ),
  counts AS (
    SELECT
      COUNT(*) AS total_count,
      COALESCE(SUM(base.current_amount_cents), 0)::numeric / 100.0 AS total_raised,
      COALESCE(SUM(base.supporter_count), 0) AS total_supporters,
      COUNT(*) FILTER (WHERE base.status = 'live') AS live_campaigns
    FROM base
  )
  SELECT
    COALESCE(jsonb_agg(to_jsonb(paginated)), '[]'::jsonb),
    counts.total_count,
    counts.total_raised,
    counts.total_supporters,
    counts.live_campaigns
  INTO v_items, v_total, v_total_raised, v_total_supporters, v_live_campaigns
  FROM paginated
  CROSS JOIN counts;

  v_summary := jsonb_build_object(
    'totalRaised', COALESCE(v_total_raised, 0),
    'supporterCount', COALESCE(v_total_supporters, 0),
    'liveCampaigns', COALESCE(v_live_campaigns, 0)
  );

  RETURN jsonb_build_object(
    'items', v_items,
    'total_count', COALESCE(v_total, 0),
    'limit', v_limit,
    'offset', v_offset,
    'summary', v_summary
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.crowdfunding_list_campaigns(uuid, uuid, integer, integer) TO authenticated;

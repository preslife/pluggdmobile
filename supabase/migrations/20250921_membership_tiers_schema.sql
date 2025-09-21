-- Membership Tiers & Fan Subscriptions Schema
-- This creates the complete infrastructure for creator/label memberships,
-- gated content, perks, and subscription management

-- Enums ----------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'billing_period') THEN
    CREATE TYPE public.billing_period AS ENUM ('monthly', 'yearly', 'lifetime');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tier_status') THEN
    CREATE TYPE public.tier_status AS ENUM ('draft', 'active', 'paused', 'archived');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
    CREATE TYPE public.membership_status AS ENUM ('active', 'cancelled', 'expired', 'past_due');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_gate_type') THEN
    CREATE TYPE public.content_gate_type AS ENUM ('tier_or_higher', 'specific_tier', 'any_tier');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perk_type') THEN
    CREATE TYPE public.perk_type AS ENUM (
      'discord_role',
      'early_access',
      'exclusive_content',
      'download_access',
      'merch_discount',
      'livestream_access',
      'custom_badge',
      'shoutout',
      'behind_the_scenes'
    );
  END IF;
END
$$;

-- Tables ---------------------------------------------------------------------

-- Membership tiers (plans creators/labels offer)
CREATE TABLE IF NOT EXISTS public.membership_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner (can be profile or label)
  owner_type text NOT NULL CHECK (owner_type IN ('profile', 'label')),
  owner_id uuid NOT NULL,

  -- Tier details
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  tier_order integer NOT NULL DEFAULT 0, -- For hierarchy (higher = more premium)

  -- Pricing
  price_monthly integer, -- In cents, NULL if not offered
  price_yearly integer,  -- In cents, NULL if not offered
  price_lifetime integer, -- In cents, NULL if not offered
  currency text NOT NULL DEFAULT 'USD',

  -- Status
  status public.tier_status NOT NULL DEFAULT 'draft',

  -- Limits
  max_members integer, -- NULL for unlimited
  current_members integer NOT NULL DEFAULT 0,

  -- Visual
  color text, -- Hex color for badges
  emoji text, -- Optional emoji for tier
  image_url text,

  -- Features summary (for display)
  features jsonb DEFAULT '[]'::jsonb, -- Array of feature strings

  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_tier_slug UNIQUE (owner_type, owner_id, slug)
);

CREATE INDEX idx_membership_tiers_owner ON public.membership_tiers(owner_type, owner_id);
CREATE INDEX idx_membership_tiers_status ON public.membership_tiers(status);

-- Fan memberships (actual subscriptions)
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subscription details
  tier_id uuid NOT NULL REFERENCES public.membership_tiers(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Billing
  billing_period public.billing_period NOT NULL,
  status public.membership_status NOT NULL DEFAULT 'active',

  -- Stripe references
  stripe_subscription_id text,
  stripe_customer_id text,

  -- Dates
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz, -- For lifetime, this is NULL

  -- Support tracking
  support_amount integer NOT NULL DEFAULT 0, -- Total paid in cents

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_user_tier UNIQUE (user_id, tier_id)
);

CREATE INDEX idx_memberships_user ON public.memberships(user_id);
CREATE INDEX idx_memberships_tier ON public.memberships(tier_id);
CREATE INDEX idx_memberships_status ON public.memberships(status);
CREATE INDEX idx_memberships_expires ON public.memberships(expires_at);

-- Membership perks (benefits for each tier)
CREATE TABLE IF NOT EXISTS public.membership_perks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_id uuid NOT NULL REFERENCES public.membership_tiers(id) ON DELETE CASCADE,

  type public.perk_type NOT NULL,
  name text NOT NULL,
  description text,

  -- Configuration based on type
  config jsonb DEFAULT '{}'::jsonb,
  -- For discord_role: { "role_id": "...", "guild_id": "..." }
  -- For download_access: { "content_types": ["tracks", "stems"] }
  -- For merch_discount: { "percentage": 20 }

  enabled boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_membership_perks_tier ON public.membership_perks(tier_id);
CREATE INDEX idx_membership_perks_type ON public.membership_perks(type);

-- Gated content (posts/tracks restricted to members)
CREATE TABLE IF NOT EXISTS public.gated_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Content reference
  content_type text NOT NULL CHECK (content_type IN ('post', 'track', 'release', 'video', 'livestream')),
  content_id uuid NOT NULL,

  -- Owner
  owner_type text NOT NULL CHECK (owner_type IN ('profile', 'label')),
  owner_id uuid NOT NULL,

  -- Gating rules
  gate_type public.content_gate_type NOT NULL DEFAULT 'tier_or_higher',
  minimum_tier_id uuid REFERENCES public.membership_tiers(id) ON DELETE CASCADE,
  allowed_tier_ids uuid[], -- For specific_tier type

  -- Teaser content (shown to non-members)
  preview_text text,
  preview_duration integer, -- Seconds for audio/video preview

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_gated_content UNIQUE (content_type, content_id)
);

CREATE INDEX idx_gated_content_owner ON public.gated_content(owner_type, owner_id);
CREATE INDEX idx_gated_content_tier ON public.gated_content(minimum_tier_id);

-- Discord integration for member verification
CREATE TABLE IF NOT EXISTS public.membership_discord_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id uuid NOT NULL REFERENCES public.memberships(id) ON DELETE CASCADE,
  discord_user_id text NOT NULL,
  discord_username text,

  access_token text NOT NULL,
  refresh_token text NOT NULL,
  expires_at timestamptz NOT NULL,

  roles_synced_at timestamptz,
  sync_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_discord_membership UNIQUE (membership_id, discord_user_id)
);

CREATE INDEX idx_discord_tokens_membership ON public.membership_discord_tokens(membership_id);
CREATE INDEX idx_discord_tokens_discord_user ON public.membership_discord_tokens(discord_user_id);

-- Membership analytics/metrics
CREATE TABLE IF NOT EXISTS public.membership_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Owner
  owner_type text NOT NULL CHECK (owner_type IN ('profile', 'label')),
  owner_id uuid NOT NULL,

  -- Date for aggregation
  date date NOT NULL,

  -- Metrics
  total_members integer NOT NULL DEFAULT 0,
  new_members integer NOT NULL DEFAULT 0,
  churned_members integer NOT NULL DEFAULT 0,

  -- Revenue (in cents)
  gross_revenue integer NOT NULL DEFAULT 0,
  net_revenue integer NOT NULL DEFAULT 0,

  -- By tier breakdown
  tier_breakdown jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_daily_metrics UNIQUE (owner_type, owner_id, date)
);

CREATE INDEX idx_membership_metrics_owner ON public.membership_metrics(owner_type, owner_id);
CREATE INDEX idx_membership_metrics_date ON public.membership_metrics(date);

-- Functions ------------------------------------------------------------------

-- Check if user has access to gated content
CREATE OR REPLACE FUNCTION public.check_content_access(
  p_user_id uuid,
  p_content_type text,
  p_content_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_gate record;
  v_has_access boolean := false;
BEGIN
  -- Get gating rules
  SELECT * INTO v_gate
  FROM public.gated_content
  WHERE content_type = p_content_type
    AND content_id = p_content_id;

  -- If no gating, content is public
  IF NOT FOUND THEN
    RETURN true;
  END IF;

  -- Check if user is the owner
  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_gate.owner_id
      AND p.user_id = p_user_id
      AND v_gate.owner_type = 'profile'
  ) THEN
    RETURN true;
  END IF;

  -- Check memberships based on gate type
  CASE v_gate.gate_type
    WHEN 'any_tier' THEN
      -- Any active membership to this creator/label
      SELECT EXISTS (
        SELECT 1
        FROM public.memberships m
        JOIN public.membership_tiers t ON m.tier_id = t.id
        WHERE m.user_id = p_user_id
          AND m.status = 'active'
          AND t.owner_type = v_gate.owner_type
          AND t.owner_id = v_gate.owner_id
      ) INTO v_has_access;

    WHEN 'tier_or_higher' THEN
      -- Membership at or above minimum tier
      SELECT EXISTS (
        SELECT 1
        FROM public.memberships m
        JOIN public.membership_tiers t ON m.tier_id = t.id
        JOIN public.membership_tiers min_t ON min_t.id = v_gate.minimum_tier_id
        WHERE m.user_id = p_user_id
          AND m.status = 'active'
          AND t.owner_type = v_gate.owner_type
          AND t.owner_id = v_gate.owner_id
          AND t.tier_order >= min_t.tier_order
      ) INTO v_has_access;

    WHEN 'specific_tier' THEN
      -- Membership in specific allowed tiers
      SELECT EXISTS (
        SELECT 1
        FROM public.memberships m
        WHERE m.user_id = p_user_id
          AND m.status = 'active'
          AND m.tier_id = ANY(v_gate.allowed_tier_ids)
      ) INTO v_has_access;
  END CASE;

  RETURN v_has_access;
END;
$$;

-- Get user's active memberships
CREATE OR REPLACE FUNCTION public.get_user_memberships(p_user_id uuid)
RETURNS TABLE (
  membership_id uuid,
  tier_id uuid,
  tier_name text,
  tier_order integer,
  owner_type text,
  owner_id uuid,
  owner_name text,
  status text,
  expires_at timestamptz,
  perks jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id as membership_id,
    t.id as tier_id,
    t.name as tier_name,
    t.tier_order,
    t.owner_type,
    t.owner_id,
    CASE
      WHEN t.owner_type = 'profile' THEN p.display_name
      WHEN t.owner_type = 'label' THEN l.name
    END as owner_name,
    m.status::text,
    m.expires_at,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'type', mp.type,
          'name', mp.name,
          'description', mp.description
        )
      ) FILTER (WHERE mp.id IS NOT NULL),
      '[]'::jsonb
    ) as perks
  FROM public.memberships m
  JOIN public.membership_tiers t ON m.tier_id = t.id
  LEFT JOIN public.profiles p ON t.owner_type = 'profile' AND t.owner_id = p.id
  LEFT JOIN public.labels l ON t.owner_type = 'label' AND t.owner_id = l.id
  LEFT JOIN public.membership_perks mp ON mp.tier_id = t.id AND mp.enabled = true
  WHERE m.user_id = p_user_id
    AND m.status IN ('active', 'past_due')
  GROUP BY m.id, t.id, p.display_name, l.name;
END;
$$;

-- RLS Policies ---------------------------------------------------------------

ALTER TABLE public.membership_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_perks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gated_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_discord_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_metrics ENABLE ROW LEVEL SECURITY;

-- Membership tiers policies
CREATE POLICY membership_tiers_select ON public.membership_tiers
  FOR SELECT USING (status = 'active' OR (
    -- Owners can see all their tiers
    (owner_type = 'profile' AND owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )) OR
    (owner_type = 'label' AND owner_id IN (
      SELECT label_id FROM public.label_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    ))
  ));

CREATE POLICY membership_tiers_manage ON public.membership_tiers
  FOR ALL USING (
    (owner_type = 'profile' AND owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )) OR
    (owner_type = 'label' AND owner_id IN (
      SELECT label_id FROM public.label_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ))
  );

-- Memberships policies
CREATE POLICY memberships_select_own ON public.memberships
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY memberships_select_creator ON public.memberships
  FOR SELECT USING (
    tier_id IN (
      SELECT id FROM public.membership_tiers t
      WHERE (
        (t.owner_type = 'profile' AND t.owner_id IN (
          SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )) OR
        (t.owner_type = 'label' AND t.owner_id IN (
          SELECT label_id FROM public.label_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
        ))
      )
    )
  );

CREATE POLICY memberships_insert ON public.memberships
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY memberships_update_own ON public.memberships
  FOR UPDATE USING (user_id = auth.uid());

-- Membership perks policies
CREATE POLICY membership_perks_select ON public.membership_perks
  FOR SELECT USING (
    tier_id IN (
      SELECT id FROM public.membership_tiers WHERE status = 'active'
    )
  );

CREATE POLICY membership_perks_manage ON public.membership_perks
  FOR ALL USING (
    tier_id IN (
      SELECT id FROM public.membership_tiers t
      WHERE (
        (t.owner_type = 'profile' AND t.owner_id IN (
          SELECT id FROM public.profiles WHERE user_id = auth.uid()
        )) OR
        (t.owner_type = 'label' AND t.owner_id IN (
          SELECT label_id FROM public.label_members
          WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        ))
      )
    )
  );

-- Gated content policies
CREATE POLICY gated_content_select ON public.gated_content
  FOR SELECT USING (true); -- Need to check to know if content is gated

CREATE POLICY gated_content_manage ON public.gated_content
  FOR ALL USING (
    (owner_type = 'profile' AND owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )) OR
    (owner_type = 'label' AND owner_id IN (
      SELECT label_id FROM public.label_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    ))
  );

-- Discord tokens policies
CREATE POLICY discord_tokens_own ON public.membership_discord_tokens
  FOR ALL USING (
    membership_id IN (
      SELECT id FROM public.memberships WHERE user_id = auth.uid()
    )
  );

-- Membership metrics policies
CREATE POLICY metrics_view ON public.membership_metrics
  FOR SELECT USING (
    (owner_type = 'profile' AND owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )) OR
    (owner_type = 'label' AND owner_id IN (
      SELECT label_id FROM public.label_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'editor')
    ))
  );

-- Triggers -------------------------------------------------------------------

CREATE TRIGGER update_membership_tiers_updated_at
  BEFORE UPDATE ON public.membership_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_discord_tokens_updated_at
  BEFORE UPDATE ON public.membership_discord_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions ----------------------------------------------------------
GRANT SELECT ON public.membership_tiers TO authenticated;
GRANT ALL ON public.membership_tiers TO authenticated;

GRANT SELECT ON public.memberships TO authenticated;
GRANT ALL ON public.memberships TO authenticated;

GRANT SELECT ON public.membership_perks TO authenticated;
GRANT ALL ON public.membership_perks TO authenticated;

GRANT SELECT ON public.gated_content TO authenticated;
GRANT ALL ON public.gated_content TO authenticated;

GRANT SELECT ON public.membership_discord_tokens TO authenticated;
GRANT ALL ON public.membership_discord_tokens TO authenticated;

GRANT SELECT ON public.membership_metrics TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_content_access TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_memberships TO authenticated;
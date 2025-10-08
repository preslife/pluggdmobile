-- Crowdfunding core tables and state machine enforcement
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE public.campaign_status AS ENUM ('draft', 'reviewing', 'live', 'success', 'failed', 'fulfilled');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_supporter_status') THEN
    CREATE TYPE public.campaign_supporter_status AS ENUM ('pledged', 'refunded', 'fulfilled', 'cancelled');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  goal_amount_cents INTEGER NOT NULL CHECK (goal_amount_cents >= 0),
  current_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (current_amount_cents >= 0),
  supporter_count INTEGER NOT NULL DEFAULT 0 CHECK (supporter_count >= 0),
  status public.campaign_status NOT NULL DEFAULT 'draft',
  funding_deadline TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'campaigns'
      AND column_name = 'creator_id'
  ) THEN
    ALTER TABLE public.campaigns
      ADD COLUMN creator_id UUID;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'campaigns_creator_id_fkey'
      AND conrelid = 'public.campaigns'::regclass
  ) THEN
    ALTER TABLE public.campaigns
      ADD CONSTRAINT campaigns_creator_id_fkey
        FOREIGN KEY (creator_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END$$;

DO $$
DECLARE
  v_nulls INTEGER;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'campaigns'
      AND column_name = 'creator_id'
  ) THEN
    SELECT COUNT(*) INTO v_nulls
    FROM public.campaigns
    WHERE creator_id IS NULL;

    IF v_nulls = 0 THEN
      ALTER TABLE public.campaigns
        ALTER COLUMN creator_id SET NOT NULL;
    END IF;
  END IF;
END$$;

DO $$
DECLARE
  v_udt TEXT;
  v_nulls INTEGER;
BEGIN
  SELECT udt_name INTO v_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'campaigns'
    AND column_name = 'status';

  IF NOT FOUND THEN
    ALTER TABLE public.campaigns
      ADD COLUMN status public.campaign_status;

    UPDATE public.campaigns
    SET status = 'draft'
    WHERE status IS NULL;

    ALTER TABLE public.campaigns
      ALTER COLUMN status SET DEFAULT 'draft';

    ALTER TABLE public.campaigns
      ALTER COLUMN status SET NOT NULL;
  ELSE
    IF v_udt <> 'campaign_status' THEN
      ALTER TABLE public.campaigns
        ALTER COLUMN status TYPE public.campaign_status
        USING CASE
          WHEN status::text IN ('draft', 'reviewing', 'live', 'success', 'failed', 'fulfilled')
            THEN status::public.campaign_status
          ELSE 'draft'::public.campaign_status
        END;
    END IF;

    UPDATE public.campaigns
    SET status = 'draft'
    WHERE status IS NULL;

    ALTER TABLE public.campaigns
      ALTER COLUMN status SET DEFAULT 'draft';

    SELECT COUNT(*) INTO v_nulls
    FROM public.campaigns
    WHERE status IS NULL;

    IF v_nulls = 0 THEN
      ALTER TABLE public.campaigns
        ALTER COLUMN status SET NOT NULL;
    END IF;
  END IF;
END$$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaigns_creator_slug ON public.campaigns(creator_id, slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_creator ON public.campaigns(creator_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

CREATE TABLE IF NOT EXISTS public.campaign_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  contribution_amount_cents INTEGER NOT NULL CHECK (contribution_amount_cents >= 0),
  quantity_limit INTEGER CHECK (quantity_limit IS NULL OR quantity_limit > 0),
  quantity_claimed INTEGER NOT NULL DEFAULT 0 CHECK (quantity_claimed >= 0),
  estimated_delivery DATE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_rewards_campaign_id ON public.campaign_rewards(campaign_id);

CREATE TABLE IF NOT EXISTS public.campaign_supporters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  supporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reward_id UUID REFERENCES public.campaign_rewards(id) ON DELETE SET NULL,
  contribution_amount_cents INTEGER NOT NULL CHECK (contribution_amount_cents >= 0),
  status public.campaign_supporter_status NOT NULL DEFAULT 'pledged',
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  contributed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  fulfilled_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_campaign_supporters_campaign ON public.campaign_supporters(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_supporters_supporter ON public.campaign_supporters(supporter_id);
CREATE INDEX IF NOT EXISTS idx_campaign_supporters_status ON public.campaign_supporters(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_supporters_payment_intent ON public.campaign_supporters(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.campaign_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  from_status public.campaign_status,
  to_status public.campaign_status NOT NULL,
  changed_by UUID,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_status_history_campaign ON public.campaign_status_history(campaign_id, created_at DESC);

-- Utility function to get the request actor
CREATE OR REPLACE FUNCTION public.current_request_user()
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_sub TEXT;
BEGIN
  BEGIN
    v_sub := current_setting('request.jwt.claim.sub', true);
  EXCEPTION WHEN others THEN
    v_sub := NULL;
  END;

  IF v_sub IS NULL OR v_sub = '' THEN
    RETURN NULL;
  END IF;

  RETURN v_sub::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.touch_campaign_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_campaign_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  allowed BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'draft' THEN
      allowed := NEW.status IN ('draft', 'reviewing');
    WHEN 'reviewing' THEN
      allowed := NEW.status IN ('reviewing', 'draft', 'live');
    WHEN 'live' THEN
      allowed := NEW.status IN ('live', 'success', 'failed');
    WHEN 'success' THEN
      allowed := NEW.status IN ('success', 'fulfilled');
    WHEN 'failed' THEN
      allowed := NEW.status IN ('failed', 'fulfilled');
    WHEN 'fulfilled' THEN
      allowed := NEW.status = 'fulfilled';
    ELSE
      allowed := FALSE;
  END CASE;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Invalid campaign status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_campaign_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  actor UUID := public.current_request_user();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.campaign_status_history (campaign_id, to_status, changed_by, note)
    VALUES (NEW.id, NEW.status, actor, 'campaign_created');
    RETURN NEW;
  END IF;

  IF NEW.status <> OLD.status THEN
    INSERT INTO public.campaign_status_history (campaign_id, from_status, to_status, changed_by)
    VALUES (NEW.id, OLD.status, NEW.status, actor);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_campaign_progress(p_campaign_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_amount INTEGER;
  v_supporters INTEGER;
BEGIN
  SELECT
    COALESCE(SUM(contribution_amount_cents), 0),
    COALESCE(COUNT(DISTINCT supporter_id), 0)
  INTO v_amount, v_supporters
  FROM public.campaign_supporters
  WHERE campaign_id = p_campaign_id
    AND status IN ('pledged', 'fulfilled');

  UPDATE public.campaigns
  SET
    current_amount_cents = v_amount,
    supporter_count = v_supporters,
    updated_at = now()
  WHERE id = p_campaign_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_campaign_supporter_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_campaign UUID := COALESCE(NEW.campaign_id, OLD.campaign_id);
  actor UUID := public.current_request_user();
  v_campaign RECORD;
  v_message TEXT;
  v_amount NUMERIC;
BEGIN
  IF target_campaign IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Maintain reward quantity claimed counts
  IF TG_OP = 'INSERT' THEN
    IF NEW.reward_id IS NOT NULL THEN
      UPDATE public.campaign_rewards
      SET quantity_claimed = quantity_claimed + 1, updated_at = now()
      WHERE id = NEW.reward_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reward_id IS NOT NULL THEN
      UPDATE public.campaign_rewards
      SET quantity_claimed = GREATEST(quantity_claimed - 1, 0), updated_at = now()
      WHERE id = OLD.reward_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.reward_id IS DISTINCT FROM OLD.reward_id THEN
      IF OLD.reward_id IS NOT NULL THEN
        UPDATE public.campaign_rewards
        SET quantity_claimed = GREATEST(quantity_claimed - 1, 0), updated_at = now()
        WHERE id = OLD.reward_id;
      END IF;
      IF NEW.reward_id IS NOT NULL THEN
        UPDATE public.campaign_rewards
        SET quantity_claimed = quantity_claimed + 1, updated_at = now()
        WHERE id = NEW.reward_id;
      END IF;
    END IF;

    IF NEW.status IN ('refunded', 'cancelled') AND OLD.status NOT IN ('refunded', 'cancelled') THEN
      IF NEW.reward_id IS NOT NULL THEN
        UPDATE public.campaign_rewards
        SET quantity_claimed = GREATEST(quantity_claimed - 1, 0), updated_at = now()
        WHERE id = NEW.reward_id;
      END IF;
    ELSIF OLD.status IN ('refunded', 'cancelled') AND NEW.status NOT IN ('refunded', 'cancelled') THEN
      IF NEW.reward_id IS NOT NULL THEN
        UPDATE public.campaign_rewards
        SET quantity_claimed = quantity_claimed + 1, updated_at = now()
        WHERE id = NEW.reward_id;
      END IF;
    END IF;
  END IF;

  PERFORM public.refresh_campaign_progress(target_campaign);

  IF TG_OP = 'INSERT' THEN
    SELECT creator_id, title INTO v_campaign FROM public.campaigns WHERE id = target_campaign;
    IF v_campaign.creator_id IS NOT NULL THEN
      v_amount := COALESCE(NEW.contribution_amount_cents, 0) / 100.0;
      v_message := format('New supporter pledged £%s to %s', to_char(v_amount, 'FM999,990.00'), v_campaign.title);
      INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
      VALUES (v_campaign.creator_id, 'New campaign supporter', v_message, 'success', NEW.id, 'campaign_supporter')
      ON CONFLICT DO NOTHING;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.status <> OLD.status THEN
    SELECT creator_id, title INTO v_campaign FROM public.campaigns WHERE id = target_campaign;
    IF NEW.status = 'fulfilled' THEN
      v_message := format('Reward fulfilled for %s', v_campaign.title);
      IF NEW.supporter_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
        VALUES (NEW.supporter_id, 'Reward fulfilled', v_message, 'success', NEW.id, 'campaign_reward')
        ON CONFLICT DO NOTHING;
      END IF;
      IF v_campaign.creator_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
        VALUES (v_campaign.creator_id, 'Reward fulfillment sent', v_message, 'info', NEW.id, 'campaign_reward')
        ON CONFLICT DO NOTHING;
      END IF;
    ELSIF NEW.status = 'refunded' THEN
      v_message := format('Contribution refunded for %s', v_campaign.title);
      IF NEW.supporter_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
        VALUES (NEW.supporter_id, 'Contribution refunded', v_message, 'warning', NEW.id, 'campaign_supporter')
        ON CONFLICT DO NOTHING;
      END IF;
      IF v_campaign.creator_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
        VALUES (v_campaign.creator_id, 'Supporter refunded', v_message, 'warning', NEW.id, 'campaign_supporter')
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_campaign_updated_at();

CREATE TRIGGER trg_campaigns_validate_status
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_campaign_status_transition();

CREATE TRIGGER trg_campaigns_log_status
  AFTER INSERT OR UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.log_campaign_status_transition();

CREATE TRIGGER trg_campaign_rewards_updated_at
  BEFORE UPDATE ON public.campaign_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_campaign_updated_at();

CREATE TRIGGER trg_campaign_supporters_refresh
  AFTER INSERT OR UPDATE OR DELETE ON public.campaign_supporters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_campaign_supporter_mutation();

-- Ensure notifications can be written by service role contexts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'notifications'
      AND policyname = 'Service role can manage notifications'
  ) THEN
    CREATE POLICY "Service role can manage notifications" ON public.notifications
      FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_supporters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_status_history ENABLE ROW LEVEL SECURITY;

-- Campaign RLS policies enforcing the state machine
CREATE POLICY "Campaigns are readable by creator or supporters" ON public.campaigns
  FOR SELECT USING (
    auth.uid() = creator_id OR
    EXISTS (
      SELECT 1 FROM public.campaign_supporters cs
      WHERE cs.campaign_id = campaigns.id AND cs.supporter_id = auth.uid()
    )
  );

CREATE POLICY "Creators can manage draft campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = creator_id AND status IN ('draft', 'reviewing'))
  WITH CHECK (auth.uid() = creator_id AND status IN ('draft', 'reviewing'));

CREATE POLICY "Creators can publish campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = creator_id AND status = 'reviewing')
  WITH CHECK (auth.uid() = creator_id AND status = 'live');

CREATE POLICY "Creators can complete campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = creator_id AND status = 'live')
  WITH CHECK (auth.uid() = creator_id AND status IN ('success', 'failed'));

CREATE POLICY "Creators can fulfill campaigns" ON public.campaigns
  FOR UPDATE USING (auth.uid() = creator_id AND status IN ('success', 'failed'))
  WITH CHECK (auth.uid() = creator_id AND status = 'fulfilled');

CREATE POLICY "Creators can create campaigns" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can remove campaigns" ON public.campaigns
  FOR DELETE USING (auth.uid() = creator_id);

CREATE POLICY "Service role can manage campaigns" ON public.campaigns
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Campaign rewards visible to stakeholders" ON public.campaign_rewards
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND (c.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.campaign_supporters cs WHERE cs.campaign_id = campaign_id AND cs.supporter_id = auth.uid())))
  );

CREATE POLICY "Creators manage campaign rewards" ON public.campaign_rewards
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid())
  );

CREATE POLICY "Supporters view their pledges" ON public.campaign_supporters
  FOR SELECT USING (
    auth.uid() = supporter_id OR EXISTS (
      SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid()
    )
  );

CREATE POLICY "Supporters create pledges" ON public.campaign_supporters
  FOR INSERT WITH CHECK (auth.uid() = supporter_id);

CREATE POLICY "Creators update pledge fulfillment" ON public.campaign_supporters
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND c.creator_id = auth.uid())
  );

CREATE POLICY "Service role manage supporters" ON public.campaign_supporters
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Campaign history visible to stakeholders" ON public.campaign_status_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.campaigns c WHERE c.id = campaign_id AND (c.creator_id = auth.uid() OR EXISTS (SELECT 1 FROM public.campaign_supporters cs WHERE cs.campaign_id = campaign_id AND cs.supporter_id = auth.uid())))
  );

CREATE POLICY "Service role manage campaign history" ON public.campaign_status_history
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- RPC: publish campaign across review/live states
CREATE OR REPLACE FUNCTION public.crowdfunding_publish_campaign(
  p_campaign_id UUID,
  p_go_live BOOLEAN DEFAULT FALSE,
  p_note TEXT DEFAULT NULL
)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign public.campaigns%ROWTYPE;
  actor UUID := public.current_request_user();
BEGIN
  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF actor IS NULL OR actor <> v_campaign.creator_id THEN
    RAISE EXCEPTION 'Not authorized to publish this campaign';
  END IF;

  IF v_campaign.status NOT IN ('draft', 'reviewing') THEN
    RAISE EXCEPTION 'Campaign must be draft or reviewing to publish';
  END IF;

  IF v_campaign.status = 'draft' THEN
    UPDATE public.campaigns SET status = 'reviewing', published_at = now()
    WHERE id = p_campaign_id;
  END IF;

  IF p_go_live THEN
    UPDATE public.campaigns SET status = 'live'
    WHERE id = p_campaign_id;
  END IF;

  IF p_note IS NOT NULL THEN
    INSERT INTO public.campaign_status_history (campaign_id, from_status, to_status, changed_by, note)
    VALUES (p_campaign_id, v_campaign.status, (SELECT status FROM public.campaigns WHERE id = p_campaign_id), actor, p_note);
  END IF;

  SELECT * INTO v_campaign FROM public.campaigns WHERE id = p_campaign_id;
  RETURN v_campaign;
END;
$$;

-- RPC: mark supporter pledge fulfilled
CREATE OR REPLACE FUNCTION public.crowdfunding_mark_supporter_fulfilled(
  p_supporter_entry UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS public.campaign_supporters
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry public.campaign_supporters%ROWTYPE;
  actor UUID := public.current_request_user();
BEGIN
  SELECT * INTO v_entry FROM public.campaign_supporters WHERE id = p_supporter_entry;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supporter pledge not found';
  END IF;

  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.campaigns c WHERE c.id = v_entry.campaign_id AND c.creator_id = actor
  ) THEN
    RAISE EXCEPTION 'Not authorized to fulfill this pledge';
  END IF;

  UPDATE public.campaign_supporters
  SET status = 'fulfilled', fulfilled_at = now(), metadata = metadata || jsonb_build_object('fulfillment_note', p_note, 'fulfilled_by', actor)
  WHERE id = p_supporter_entry
  RETURNING * INTO v_entry;

  PERFORM public.refresh_campaign_progress(v_entry.campaign_id);

  RETURN v_entry;
END;
$$;

-- RPC: refund a supporter pledge
CREATE OR REPLACE FUNCTION public.crowdfunding_refund_supporter(
  p_supporter_entry UUID,
  p_reason TEXT DEFAULT NULL,
  p_refund_cents INTEGER DEFAULT NULL
)
RETURNS public.campaign_supporters
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_entry public.campaign_supporters%ROWTYPE;
  actor UUID := public.current_request_user();
  v_reason JSONB;
BEGIN
  SELECT * INTO v_entry FROM public.campaign_supporters WHERE id = p_supporter_entry;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Supporter pledge not found';
  END IF;

  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.campaigns c WHERE c.id = v_entry.campaign_id AND c.creator_id = actor
  ) THEN
    RAISE EXCEPTION 'Not authorized to refund this pledge';
  END IF;

  v_reason := jsonb_build_object(
    'refunded_by', actor,
    'reason', p_reason,
    'refunded_amount_cents', COALESCE(p_refund_cents, v_entry.contribution_amount_cents),
    'refunded_at', now()
  );

  UPDATE public.campaign_supporters
  SET status = 'refunded', refunded_at = now(), metadata = metadata || v_reason
  WHERE id = p_supporter_entry
  RETURNING * INTO v_entry;

  PERFORM public.refresh_campaign_progress(v_entry.campaign_id);

  RETURN v_entry;
END;
$$;

GRANT EXECUTE ON FUNCTION public.crowdfunding_publish_campaign(UUID, BOOLEAN, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crowdfunding_mark_supporter_fulfilled(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.crowdfunding_refund_supporter(UUID, TEXT, INTEGER) TO authenticated;

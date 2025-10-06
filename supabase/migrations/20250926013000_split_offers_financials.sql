-- Create table for split offers requiring collaborator approval
CREATE TABLE IF NOT EXISTS public.content_split_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('beat', 'pack', 'release')),
  content_id UUID NOT NULL,
  proposer_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payee_email TEXT,
  percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, payee_user_id)
);

ALTER TABLE public.content_split_offers ENABLE ROW LEVEL SECURITY;

-- Policies for split offers
CREATE POLICY IF NOT EXISTS "Split offer visibility" ON public.content_split_offers
FOR SELECT
USING (
  payee_user_id = auth.uid()
  OR proposer_user_id = auth.uid()
  OR (content_type = 'beat' AND EXISTS (SELECT 1 FROM public.beats WHERE id = content_id AND user_id = auth.uid()))
  OR (content_type = 'release' AND EXISTS (SELECT 1 FROM public.releases WHERE id = content_id AND user_id = auth.uid()))
  OR (content_type = 'pack' AND EXISTS (SELECT 1 FROM public.sample_packs WHERE id = content_id AND user_id = auth.uid()))
);

CREATE POLICY IF NOT EXISTS "Content owners manage split offers" ON public.content_split_offers
FOR INSERT
WITH CHECK (
  proposer_user_id = auth.uid()
  AND (
    (content_type = 'beat' AND EXISTS (SELECT 1 FROM public.beats WHERE id = content_id AND user_id = auth.uid()))
    OR (content_type = 'release' AND EXISTS (SELECT 1 FROM public.releases WHERE id = content_id AND user_id = auth.uid()))
    OR (content_type = 'pack' AND EXISTS (SELECT 1 FROM public.sample_packs WHERE id = content_id AND user_id = auth.uid()))
  )
);

CREATE POLICY IF NOT EXISTS "Content owners update split offers" ON public.content_split_offers
FOR UPDATE
USING (
  proposer_user_id = auth.uid()
  OR (
    (content_type = 'beat' AND EXISTS (SELECT 1 FROM public.beats WHERE id = content_id AND user_id = auth.uid()))
    OR (content_type = 'release' AND EXISTS (SELECT 1 FROM public.releases WHERE id = content_id AND user_id = auth.uid()))
    OR (content_type = 'pack' AND EXISTS (SELECT 1 FROM public.sample_packs WHERE id = content_id AND user_id = auth.uid()))
  )
)
WITH CHECK (
  status IN ('pending', 'declined')
);

CREATE POLICY IF NOT EXISTS "Payees can respond to offers" ON public.content_split_offers
FOR UPDATE
USING (payee_user_id = auth.uid())
WITH CHECK (
  payee_user_id = auth.uid()
  AND status IN ('accepted', 'declined')
);

CREATE POLICY IF NOT EXISTS "Content owners delete split offers" ON public.content_split_offers
FOR DELETE
USING (
  proposer_user_id = auth.uid()
  OR (
    (content_type = 'beat' AND EXISTS (SELECT 1 FROM public.beats WHERE id = content_id AND user_id = auth.uid()))
    OR (content_type = 'release' AND EXISTS (SELECT 1 FROM public.releases WHERE id = content_id AND user_id = auth.uid()))
    OR (content_type = 'pack' AND EXISTS (SELECT 1 FROM public.sample_packs WHERE id = content_id AND user_id = auth.uid()))
  )
);

-- Helper function to detect existing commerce for content
CREATE OR REPLACE FUNCTION public.content_has_orders(p_content_type TEXT, p_content_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_type TEXT := lower(p_content_type);
BEGIN
  IF v_type = 'beat' THEN
    RETURN EXISTS (SELECT 1 FROM public.beat_sales WHERE beat_id = p_content_id)
      OR EXISTS (
        SELECT 1
        FROM public.order_items oi
        JOIN public.store_product_items spi ON spi.bundle_product_id = oi.product_id
        WHERE spi.item_type = 'beat' AND spi.item_id = p_content_id
        LIMIT 1
      );
  ELSIF v_type = 'release' THEN
    RETURN EXISTS (SELECT 1 FROM public.release_purchases WHERE release_id = p_content_id)
      OR EXISTS (
        SELECT 1
        FROM public.order_items oi
        JOIN public.store_product_items spi ON spi.bundle_product_id = oi.product_id
        WHERE spi.item_type = 'release' AND spi.item_id = p_content_id
        LIMIT 1
      );
  ELSIF v_type = 'pack' THEN
    RETURN EXISTS (SELECT 1 FROM public.sample_pack_purchases WHERE sample_pack_id = p_content_id)
      OR EXISTS (
        SELECT 1
        FROM public.order_items oi
        JOIN public.store_product_items spi ON spi.bundle_product_id = oi.product_id
        WHERE spi.item_type = 'pack' AND spi.item_id = p_content_id
        LIMIT 1
      );
  END IF;

  RETURN FALSE;
END;
$$;

-- Trigger helper to prevent edits once orders exist
CREATE OR REPLACE FUNCTION public.ensure_content_unlocked()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_type TEXT;
  v_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_type := OLD.content_type;
    v_id := OLD.content_id;
  ELSE
    v_type := NEW.content_type;
    v_id := NEW.content_id;
    NEW.updated_at = now();
  END IF;

  IF public.content_has_orders(v_type, v_id) THEN
    RAISE EXCEPTION 'Cannot modify royalty splits once orders exist for this content.' USING ERRCODE = 'raise_exception';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply triggers to content_splits
DROP TRIGGER IF EXISTS ensure_content_splits_unlocked ON public.content_splits;
DROP TRIGGER IF EXISTS ensure_content_splits_unlocked_delete ON public.content_splits;
CREATE TRIGGER ensure_content_splits_unlocked
  BEFORE INSERT OR UPDATE ON public.content_splits
  FOR EACH ROW EXECUTE FUNCTION public.ensure_content_unlocked();
CREATE TRIGGER ensure_content_splits_unlocked_delete
  BEFORE DELETE ON public.content_splits
  FOR EACH ROW EXECUTE FUNCTION public.ensure_content_unlocked();

-- Apply triggers to content_split_offers
DROP TRIGGER IF EXISTS ensure_content_split_offers_unlocked ON public.content_split_offers;
DROP TRIGGER IF EXISTS ensure_content_split_offers_unlocked_delete ON public.content_split_offers;
CREATE TRIGGER ensure_content_split_offers_unlocked
  BEFORE INSERT OR UPDATE ON public.content_split_offers
  FOR EACH ROW EXECUTE FUNCTION public.ensure_content_unlocked();
CREATE TRIGGER ensure_content_split_offers_unlocked_delete
  BEFORE DELETE ON public.content_split_offers
  FOR EACH ROW EXECUTE FUNCTION public.ensure_content_unlocked();

-- Automatically sync accepted offers into locked splits
CREATE OR REPLACE FUNCTION public.handle_split_offer_response()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> OLD.status THEN
    IF NEW.percent <> OLD.percent THEN
      NEW.percent := OLD.percent;
    END IF;

    IF NEW.status IN ('accepted', 'declined') AND NEW.responded_at IS NULL THEN
      NEW.responded_at = now();
    END IF;

    IF NEW.status = 'accepted' THEN
      INSERT INTO public.content_splits (content_type, content_id, payee_user_id, percent)
      VALUES (NEW.content_type, NEW.content_id, NEW.payee_user_id, NEW.percent)
      ON CONFLICT (content_type, content_id, payee_user_id)
      DO UPDATE SET percent = EXCLUDED.percent, updated_at = now();
    ELSIF OLD.status = 'accepted' AND NEW.status <> 'accepted' THEN
      DELETE FROM public.content_splits
      WHERE content_type = NEW.content_type
        AND content_id = NEW.content_id
        AND payee_user_id = NEW.payee_user_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS handle_split_offer_response_trigger ON public.content_split_offers;
CREATE TRIGGER handle_split_offer_response_trigger
  AFTER UPDATE ON public.content_split_offers
  FOR EACH ROW EXECUTE FUNCTION public.handle_split_offer_response();

-- Refresh split status helper to account for offers and locks
CREATE OR REPLACE FUNCTION public.get_content_split_status(p_content_type TEXT, p_content_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  total_percent NUMERIC := 0;
  pending_offers INTEGER := 0;
  declined_offers INTEGER := 0;
  has_orders BOOLEAN := public.content_has_orders(p_content_type, p_content_id);
BEGIN
  SELECT COALESCE(SUM(percent), 0) INTO total_percent
  FROM public.content_splits
  WHERE content_type = p_content_type AND content_id = p_content_id;

  SELECT COUNT(*) FILTER (WHERE status = 'pending'),
         COUNT(*) FILTER (WHERE status = 'declined')
  INTO pending_offers, declined_offers
  FROM public.content_split_offers
  WHERE content_type = p_content_type AND content_id = p_content_id;

  IF has_orders THEN
    RETURN 'locked';
  ELSIF total_percent = 0 AND pending_offers = 0 THEN
    RETURN 'not_set';
  ELSIF pending_offers > 0 THEN
    RETURN 'awaiting_approvals';
  ELSIF total_percent = 100 THEN
    RETURN 'complete';
  ELSE
    RETURN 'incomplete';
  END IF;
END;
$$;

-- Financial tables for statements and payouts
CREATE TABLE IF NOT EXISTS public.creator_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type TEXT CHECK (content_type IN ('beat', 'pack', 'release')), 
  content_id UUID,
  statement_period_start DATE,
  statement_period_end DATE,
  source_type TEXT NOT NULL DEFAULT 'order',
  source_id TEXT,
  gross_amount_cents INTEGER NOT NULL DEFAULT 0,
  fee_amount_cents INTEGER NOT NULL DEFAULT 0,
  net_amount_cents INTEGER NOT NULL DEFAULT 0,
  split_percent NUMERIC(5,2),
  currency TEXT NOT NULL DEFAULT 'gbp',
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('pending', 'ready', 'paid', 'cancelled')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_creator_statements_user_status ON public.creator_statements(user_id, status);
CREATE INDEX IF NOT EXISTS idx_creator_statements_content ON public.creator_statements(content_type, content_id);

ALTER TABLE public.creator_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Creators can view their statements" ON public.creator_statements
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "System manages statements" ON public.creator_statements
FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'gbp',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  stripe_transfer_id TEXT,
  failure_reason TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_user_status ON public.payouts(user_id, status);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Creators can view their payouts" ON public.payouts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "System manages payouts" ON public.payouts
FOR ALL USING (true);

CREATE TABLE IF NOT EXISTS public.payout_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  statement_id UUID NOT NULL REFERENCES public.creator_statements(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(payout_id, statement_id)
);

CREATE INDEX IF NOT EXISTS idx_payout_statements_statement ON public.payout_statements(statement_id);

ALTER TABLE public.payout_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Creators can view their payout statements" ON public.payout_statements
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.payouts p
    WHERE p.id = payout_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY IF NOT EXISTS "System manages payout statements" ON public.payout_statements
FOR ALL USING (true);

-- Trigger to keep timestamps fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_creator_statements ON public.creator_statements;
CREATE TRIGGER touch_creator_statements
  BEFORE UPDATE ON public.creator_statements
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS touch_payouts ON public.payouts;
CREATE TRIGGER touch_payouts
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

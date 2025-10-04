-- Live streaming Agora integration and gifting tables

-- Ensure new columns exist on session_rooms for Agora metadata
ALTER TABLE public.session_rooms
  ADD COLUMN IF NOT EXISTS agora_channel_name text,
  ADD COLUMN IF NOT EXISTS agora_host_uid bigint,
  ADD COLUMN IF NOT EXISTS agora_live_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS agora_live_ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS agora_last_token_issued_at timestamptz,
  ADD COLUMN IF NOT EXISTS agora_last_activity_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_rooms_agora_channel
  ON public.session_rooms(agora_channel_name)
  WHERE agora_channel_name IS NOT NULL;

-- Catalog of available live gifts
CREATE TABLE IF NOT EXISTS public.live_gift_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  label text NOT NULL,
  description text,
  credit_cost integer NOT NULL CHECK (credit_cost > 0),
  animation_url text,
  thumbnail_url text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Track gifts sent during a live session
CREATE TABLE IF NOT EXISTS public.live_gift_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.session_rooms(id) ON DELETE CASCADE,
  gift_id uuid NOT NULL REFERENCES public.live_gift_catalog(id) ON DELETE RESTRICT,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  total_credits integer NOT NULL CHECK (total_credits > 0),
  animation_variant text,
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_live_gift_events_room_created
  ON public.live_gift_events(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_live_gift_events_sender
  ON public.live_gift_events(sender_id, created_at DESC);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_live_gift_catalog_updated_at ON public.live_gift_catalog;
CREATE TRIGGER trg_live_gift_catalog_updated_at
  BEFORE UPDATE ON public.live_gift_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Row level security for gifts
ALTER TABLE public.live_gift_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_gift_events ENABLE ROW LEVEL SECURITY;

-- Everyone can read catalog
CREATE POLICY IF NOT EXISTS "live_gift_catalog_read" ON public.live_gift_catalog
  FOR SELECT USING (true);

-- Only service key or admins can manage catalog entries
CREATE POLICY IF NOT EXISTS "live_gift_catalog_manage" ON public.live_gift_catalog
  FOR ALL USING (
    auth.role() = 'service_role' OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Users can view gift events for rooms they can access
CREATE POLICY IF NOT EXISTS "live_gift_events_read" ON public.live_gift_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.session_rooms sr
      LEFT JOIN public.session_participants sp
        ON sp.room_id = sr.id
        AND sp.user_id = auth.uid()
        AND sp.left_at IS NULL
      WHERE sr.id = room_id
        AND (
          sr.host_id = auth.uid()
          OR coalesce(sr.is_public, false) = true
          OR sp.user_id IS NOT NULL
        )
    )
  );

-- Users can insert gift events for themselves
CREATE POLICY IF NOT EXISTS "live_gift_events_insert" ON public.live_gift_events
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- No direct updates/deletes from client
CREATE POLICY IF NOT EXISTS "live_gift_events_block_updates" ON public.live_gift_events
  FOR UPDATE USING (false);
CREATE POLICY IF NOT EXISTS "live_gift_events_block_deletes" ON public.live_gift_events
  FOR DELETE USING (false);

-- Helper view for aggregating gifts per room (optional, idempotent)
CREATE OR REPLACE VIEW public.live_gift_room_totals AS
SELECT
  room_id,
  SUM(total_credits) AS total_credits,
  SUM(quantity) AS total_quantity,
  COUNT(*) AS events_count
FROM public.live_gift_events
GROUP BY room_id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_participants_room_user_key'
  ) THEN
    ALTER TABLE public.session_participants
      ADD CONSTRAINT session_participants_room_user_key UNIQUE (room_id, user_id);
  END IF;
END;
$$;

-- Extend wallet ledger kinds to support live gifting
ALTER TABLE public.wallet_ledger DROP CONSTRAINT IF EXISTS wallet_ledger_kind_check;
ALTER TABLE public.wallet_ledger
  ADD CONSTRAINT wallet_ledger_kind_check CHECK (kind IN (
    'topup',
    'spend_tip',
    'spend_purchase',
    'spend_battle',
    'award_prize',
    'convert_cashout',
    'convert_sub_applied',
    'spend_gift',
    'earn_gift'
  ));

-- Function to atomically process live gifts and ledger entries
CREATE OR REPLACE FUNCTION public.perform_live_gift(
  p_sender uuid,
  p_room_id uuid,
  p_gift_id uuid,
  p_quantity integer DEFAULT 1,
  p_message text DEFAULT NULL,
  p_animation_variant text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gift RECORD;
  v_room RECORD;
  v_total integer;
  v_available bigint;
  v_event_id uuid;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'Quantity must be a positive integer';
  END IF;

  SELECT * INTO v_gift
  FROM public.live_gift_catalog
  WHERE id = p_gift_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Gift is not available';
  END IF;

  SELECT id, host_id, is_public INTO v_room
  FROM public.session_rooms
  WHERE id = p_room_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Live session not found';
  END IF;

  IF v_room.host_id <> p_sender THEN
    IF coalesce(v_room.is_public, false) = false THEN
      PERFORM 1
      FROM public.session_participants sp
      WHERE sp.room_id = p_room_id
        AND sp.user_id = p_sender
        AND sp.left_at IS NULL;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'You are not allowed to gift in this session';
      END IF;
    END IF;
  END IF;

  v_total := COALESCE(v_gift.credit_cost, 0) * p_quantity;
  IF v_total <= 0 THEN
    RAISE EXCEPTION 'Gift pricing invalid';
  END IF;

  SELECT (balance->>'available_credits')::bigint INTO v_available
  FROM (
    SELECT public.get_wallet_balance(p_sender) AS balance
  ) sub;

  IF v_available IS NULL OR v_available < v_total THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  INSERT INTO public.live_gift_events (
    room_id,
    gift_id,
    sender_id,
    quantity,
    total_credits,
    animation_variant,
    message
  )
  VALUES (
    p_room_id,
    p_gift_id,
    p_sender,
    p_quantity,
    v_total,
    p_animation_variant,
    p_message
  )
  RETURNING id INTO v_event_id;

  INSERT INTO public.wallet_ledger (
    user_id,
    kind,
    amount_credits,
    ref_type,
    ref_id,
    counterparty_user_id,
    meta
  )
  VALUES (
    p_sender,
    'spend_gift',
    -v_total,
    'live_gift',
    v_event_id,
    v_room.host_id,
    jsonb_build_object(
      'gift_id', p_gift_id,
      'quantity', p_quantity
    )
  );

  INSERT INTO public.wallet_ledger (
    user_id,
    kind,
    amount_credits,
    ref_type,
    ref_id,
    counterparty_user_id,
    meta
  )
  VALUES (
    v_room.host_id,
    'earn_gift',
    v_total,
    'live_gift',
    v_event_id,
    p_sender,
    jsonb_build_object(
      'gift_id', p_gift_id,
      'quantity', p_quantity
    )
  );

  RETURN v_event_id;
END;
$$;

-- Seed default live gifts
INSERT INTO public.live_gift_catalog (slug, label, description, credit_cost, animation_url, thumbnail_url)
VALUES
  ('applause', 'Applause Burst', 'Cheer on the host with a burst of applause.', 10, 'https://cdn.jsdelivr.net/gh/lottiefiles/lottie-samples@master/lf20_ydo1amjm.json', 'https://cdn.jsdelivr.net/gh/lottiefiles/lottie-samples@master/preview/applause.png'),
  ('spotlight', 'Spotlight', 'Shine the spotlight on the current performer.', 25, 'https://cdn.jsdelivr.net/gh/lottiefiles/lottie-samples@master/lf20_ucbyrun5.json', 'https://cdn.jsdelivr.net/gh/lottiefiles/lottie-samples@master/preview/spotlight.png'),
  ('fire', 'Fire Emoji', 'Turn the stage into pure fire.', 40, 'https://cdn.jsdelivr.net/gh/lottiefiles/lottie-samples@master/lf20_kp0iy6uv.json', 'https://cdn.jsdelivr.net/gh/lottiefiles/lottie-samples@master/preview/fire.png')
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  credit_cost = EXCLUDED.credit_cost,
  animation_url = EXCLUDED.animation_url,
  thumbnail_url = EXCLUDED.thumbnail_url,
  updated_at = now();

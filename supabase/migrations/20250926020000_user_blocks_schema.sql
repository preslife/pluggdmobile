-- Trust & Safety: user-to-user blocking table
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  reason TEXT,
  context JSONB,
  expires_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx
  ON public.user_blocks(blocker_id, blocked_user_id);

CREATE INDEX IF NOT EXISTS user_blocks_blocked_user_idx
  ON public.user_blocks(blocked_user_id, status);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blockers manage their blocks" ON public.user_blocks;
CREATE POLICY "Blockers manage their blocks"
  ON public.user_blocks
  FOR ALL
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage user blocks" ON public.user_blocks;
CREATE POLICY "Admins can manage user blocks"
  ON public.user_blocks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.touch_user_blocks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_blocks_set_updated_at ON public.user_blocks;
CREATE TRIGGER user_blocks_set_updated_at
  BEFORE UPDATE ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_user_blocks_updated_at();

-- Trust & Safety polish: align content_reports & user block helpers

-- Extend content_reports columns for ownership + appeals metadata
ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS target_owner_id UUID,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS appeal_notes TEXT,
  ADD COLUMN IF NOT EXISTS appealed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS appealed_by UUID REFERENCES auth.users(id);

-- Ensure updated_at mirrors created_at for legacy rows
UPDATE public.content_reports
SET updated_at = COALESCE(updated_at, created_at)
WHERE updated_at IS NULL;

-- Allow latest target types handled by Edge/UI
ALTER TABLE public.content_reports
  DROP CONSTRAINT IF EXISTS content_reports_target_type_check;
ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_target_type_check
    CHECK (target_type IN ('release', 'beat', 'post', 'profile', 'comment', 'blog_post'));

-- Allow appealed lifecycle state
ALTER TABLE public.content_reports
  DROP CONSTRAINT IF EXISTS content_reports_status_check;
ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_status_check
    CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed', 'appealed'));

-- Normalize reason codes used by UI; fallback to 'other'
UPDATE public.content_reports
SET reason = 'other'
WHERE reason IS NULL OR trim(reason) = '';

UPDATE public.content_reports
SET reason = 'other'
WHERE reason NOT IN (
  'inappropriate_content',
  'spam',
  'harassment',
  'copyright_infringement',
  'hate_speech',
  'violence',
  'other'
);

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_reason_check
    CHECK (reason IN (
      'inappropriate_content',
      'spam',
      'harassment',
      'copyright_infringement',
      'hate_speech',
      'violence',
      'other'
    ));

-- Index helpers for moderation lookups
CREATE INDEX IF NOT EXISTS idx_content_reports_owner
  ON public.content_reports(target_owner_id);

CREATE INDEX IF NOT EXISTS idx_content_reports_updated_at
  ON public.content_reports(updated_at DESC);

-- Keep updated_at fresh
DROP TRIGGER IF EXISTS content_reports_set_updated_at
  ON public.content_reports;
CREATE TRIGGER content_reports_set_updated_at
  BEFORE UPDATE ON public.content_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Allow owners to review reports about their content
DROP POLICY IF EXISTS "Content owners view reports"
  ON public.content_reports;
CREATE POLICY "Content owners view reports"
  ON public.content_reports
  FOR SELECT
  USING (target_owner_id = auth.uid());

-- User block safety helpers -------------------------------------------------
-- Prevent duplicate active blocks per user pair
CREATE UNIQUE INDEX IF NOT EXISTS user_blocks_active_pair_unique
  ON public.user_blocks(blocker_id, blocked_user_id)
  WHERE status = 'active';

-- Helper RPC for checking mutual block state
CREATE OR REPLACE FUNCTION public.is_user_blocked(
  p_actor UUID,
  p_target UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := now();
BEGIN
  IF p_actor IS NULL OR p_target IS NULL OR p_actor = p_target THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_blocks
    WHERE status = 'active'
      AND (expires_at IS NULL OR expires_at > v_now)
      AND (
        (blocker_id = p_actor AND blocked_user_id = p_target) OR
        (blocker_id = p_target AND blocked_user_id = p_actor)
      )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_user_blocked(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_user_blocked(UUID, UUID) TO service_role;

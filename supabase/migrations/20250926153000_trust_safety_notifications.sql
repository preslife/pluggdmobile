-- Trust & Safety, Notifications, and Observability enhancements (Milestones D1-D3)

-- Ensure supporting schema exists
CREATE SCHEMA IF NOT EXISTS analytics;

-- Create user_blocks table if it does not exist
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired')),
  reason TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT user_blocks_blocker_not_self CHECK (blocker_id <> blocked_user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS user_blocks_unique_pair ON public.user_blocks(blocker_id, blocked_user_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS user_blocks_blocked_lookup ON public.user_blocks(blocked_user_id, status);
CREATE INDEX IF NOT EXISTS user_blocks_status_idx ON public.user_blocks(status, updated_at DESC);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their user blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Admins manage all user blocks" ON public.user_blocks;
DROP POLICY IF EXISTS "Blocked users can view their blocks" ON public.user_blocks;

CREATE POLICY "User blocks owners manage"
  ON public.user_blocks
  FOR ALL
  USING (auth.uid() = blocker_id)
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Admins manage all user blocks"
  ON public.user_blocks
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "Blocked users may view block status"
  ON public.user_blocks
  FOR SELECT
  USING (
    auth.uid() = blocked_user_id OR auth.uid() = blocker_id OR
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Maintain updated_at
DROP TRIGGER IF EXISTS set_user_blocks_updated_at ON public.user_blocks;
CREATE TRIGGER set_user_blocks_updated_at
  BEFORE UPDATE ON public.user_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to evaluate blocking relationships
CREATE OR REPLACE FUNCTION public.is_user_blocked(p_actor uuid, p_target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  IF p_actor IS NULL OR p_target IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_blocks b
    WHERE b.status = 'active'
      AND (b.expires_at IS NULL OR b.expires_at > v_now)
      AND (
        (b.blocker_id = p_actor AND b.blocked_user_id = p_target)
        OR
        (b.blocker_id = p_target AND b.blocked_user_id = p_actor)
      )
  );
END;
$$;

-- Harden content_reports table
CREATE TABLE IF NOT EXISTS public.content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('release', 'beat', 'post', 'profile', 'comment', 'blog_post')),
  target_id UUID NOT NULL,
  target_owner_id UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed', 'appealed')),
  appealed_by UUID REFERENCES auth.users(id),
  appealed_at TIMESTAMP WITH TIME ZONE,
  appeal_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Ensure constraint alignment when table already exists
ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_target_type_check;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_target_type_check
  CHECK (target_type IN ('release', 'beat', 'post', 'profile', 'comment', 'blog_post'));

ALTER TABLE public.content_reports DROP CONSTRAINT IF EXISTS content_reports_status_check;
ALTER TABLE public.content_reports ADD CONSTRAINT content_reports_status_check
  CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed', 'appealed'));

ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS target_owner_id UUID REFERENCES auth.users(id);
ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS appealed_by UUID REFERENCES auth.users(id);
ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS appealed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS appeal_notes TEXT;
ALTER TABLE public.content_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS set_content_reports_updated_at ON public.content_reports;
CREATE TRIGGER set_content_reports_updated_at
  BEFORE UPDATE ON public.content_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_content_reports_reporter ON public.content_reports(reporter_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_status_created ON public.content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_target_owner ON public.content_reports(target_owner_id, status);

DROP POLICY IF EXISTS "Users can create content reports" ON public.content_reports;
DROP POLICY IF EXISTS "Users can view their own reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can manage all content reports" ON public.content_reports;
DROP POLICY IF EXISTS "Reporters can update their own reports" ON public.content_reports;
DROP POLICY IF EXISTS "Admins can manage reports" ON public.content_reports;

CREATE POLICY "Reporters insert content reports"
  ON public.content_reports
  FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND (target_owner_id IS NULL OR NOT public.is_user_blocked(auth.uid(), target_owner_id))
  );

CREATE POLICY "Reporters view own reports"
  ON public.content_reports
  FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Reporters appeal pending reports"
  ON public.content_reports
  FOR UPDATE
  USING (auth.uid() = reporter_id)
  WITH CHECK (
    auth.uid() = reporter_id
    AND status IN ('pending', 'investigating', 'appealed')
  );

CREATE POLICY "Admins manage all reports"
  ON public.content_reports
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Notifications table modernization
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
    CREATE TYPE public.notification_type_enum AS ENUM ('system', 'order', 'tip', 'membership', 'moderation', 'social');
  END IF;
END $$;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS payload JSONB;
UPDATE public.notifications SET payload = COALESCE(payload, data, '{}'::jsonb);
ALTER TABLE public.notifications ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
ALTER TABLE public.notifications ALTER COLUMN payload SET NOT NULL;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;
UPDATE public.notifications
SET read_at = CASE WHEN read IS TRUE THEN COALESCE(read_at, created_at) ELSE read_at END;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_type TEXT;

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type_enum public.notification_type_enum;
UPDATE public.notifications
SET type_enum = CASE
  WHEN type = 'purchase' THEN 'order'::public.notification_type_enum
  WHEN type = 'support' THEN 'tip'::public.notification_type_enum
  WHEN type = 'follow' THEN 'social'::public.notification_type_enum
  WHEN type = 'session_feedback' THEN 'system'::public.notification_type_enum
  WHEN type = 'order' THEN 'order'::public.notification_type_enum
  WHEN type = 'tip' THEN 'tip'::public.notification_type_enum
  WHEN type = 'membership' THEN 'membership'::public.notification_type_enum
  WHEN type = 'moderation' THEN 'moderation'::public.notification_type_enum
  ELSE 'system'::public.notification_type_enum
END;

ALTER TABLE public.notifications DROP COLUMN IF EXISTS type;
ALTER TABLE public.notifications RENAME COLUMN type_enum TO type;
ALTER TABLE public.notifications ALTER COLUMN type SET NOT NULL;
ALTER TABLE public.notifications ALTER COLUMN type SET DEFAULT 'system';

ALTER TABLE public.notifications DROP COLUMN IF EXISTS data;
ALTER TABLE public.notifications DROP COLUMN IF EXISTS read;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

-- Analytical view for milestone funnels
CREATE OR REPLACE VIEW analytics.platform_observability_funnels AS
SELECT
  (SELECT COUNT(*) FROM public.orders WHERE status = 'completed') AS total_completed_orders,
  (SELECT COUNT(*) FROM public.artist_tips WHERE status = 'settled') AS total_settled_tips,
  (SELECT COUNT(*) FROM public.content_reports WHERE status IN ('pending', 'investigating')) AS open_reports,
  (SELECT COUNT(*) FROM public.user_blocks WHERE status = 'active') AS active_user_blocks,
  (SELECT COUNT(*) FROM public.notifications WHERE read_at IS NULL) AS unread_notifications,
  (SELECT COUNT(*) FROM public.notifications WHERE type = 'moderation') AS moderation_notifications;

COMMENT ON VIEW analytics.platform_observability_funnels IS 'Aggregated KPI snapshot for checkout, tips, trust & safety, and notifications funnels.';

-- Ensure RLS for notifications remains strict
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

CREATE POLICY "Users view their notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage read state"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification RPC helpers aligned to read_at tracking
CREATE OR REPLACE FUNCTION public.notifications_unread_count()
RETURNS integer
LANGUAGE sql
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM public.notifications
  WHERE user_id = auth.uid() AND read_at IS NULL;
$$;

CREATE OR REPLACE FUNCTION public.notifications_list_recent(p_limit integer DEFAULT 20)
RETURNS SETOF public.notifications
LANGUAGE sql
STABLE
AS $$
  SELECT *
  FROM public.notifications
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT GREATEST(COALESCE(p_limit, 20), 1);
$$;

CREATE OR REPLACE FUNCTION public.notifications_mark_read(p_notification_id uuid)
RETURNS void
LANGUAGE sql
VOLATILE
AS $$
  UPDATE public.notifications
  SET read_at = now()
  WHERE id = p_notification_id AND user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.notifications_mark_all_read()
RETURNS void
LANGUAGE sql
VOLATILE
AS $$
  UPDATE public.notifications
  SET read_at = now()
  WHERE user_id = auth.uid() AND read_at IS NULL;
$$;


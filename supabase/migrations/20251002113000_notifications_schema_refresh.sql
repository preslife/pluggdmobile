-- Milestone D2: notifications schema + preference helpers

-- Ensure notifications payload column matches runtime code
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'data'
  ) THEN
    ALTER TABLE public.notifications RENAME COLUMN data TO payload;
  END IF;
END;
$$;

ALTER TABLE public.notifications
  ALTER COLUMN payload SET DEFAULT '{}'::jsonb,
  ALTER COLUMN payload SET NOT NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Track read timestamps instead of boolean flag
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'read'
  ) THEN
    EXECUTE 'UPDATE public.notifications SET read_at = COALESCE(read_at, created_at) WHERE read = true AND read_at IS NULL';
    ALTER TABLE public.notifications
      DROP COLUMN read;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS notifications_set_updated_at ON public.notifications;
CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Basic indexes for inbox queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON public.notifications(user_id)
  WHERE read_at IS NULL;

-- Notification preferences table -----------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_push BOOLEAN DEFAULT TRUE,
  notify_contest_reminders BOOLEAN DEFAULT TRUE,
  notify_live_sessions BOOLEAN DEFAULT TRUE,
  notify_purchases BOOLEAN DEFAULT TRUE,
  notify_supporters BOOLEAN DEFAULT TRUE,
  notify_follows BOOLEAN DEFAULT TRUE,
  notify_session_feedback BOOLEAN DEFAULT TRUE,
  notify_email_marketing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage notification prefs" ON public.notification_prefs;
CREATE POLICY "Users manage notification prefs"
  ON public.notification_prefs
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS notification_prefs_set_updated_at ON public.notification_prefs;
CREATE TRIGGER notification_prefs_set_updated_at
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Helper to ensure preference row exists
CREATE OR REPLACE FUNCTION public.ensure_notification_prefs(p_user_id UUID)
RETURNS public.notification_prefs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := p_user_id;
  v_prefs public.notification_prefs%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.notification_prefs (user_id)
  VALUES (v_user)
  ON CONFLICT (user_id) DO UPDATE SET user_id = EXCLUDED.user_id
  RETURNING * INTO v_prefs;

  RETURN v_prefs;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_notification_prefs(UUID) TO authenticated;

-- Preference RPCs ---------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_notification_prefs(UUID);
CREATE OR REPLACE FUNCTION public.get_notification_prefs(p_user_id UUID DEFAULT auth.uid())
RETURNS public.notification_prefs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := COALESCE(p_user_id, auth.uid());
  v_prefs public.notification_prefs%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_prefs := public.ensure_notification_prefs(v_user);
  RETURN v_prefs;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_notification_prefs(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.set_notification_pref(TEXT, BOOLEAN, UUID);

CREATE OR REPLACE FUNCTION public.set_notification_pref(
  p_key TEXT,
  p_value BOOLEAN,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS public.notification_prefs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := COALESCE(p_user_id, auth.uid());
  v_allowed CONSTANT TEXT[] := ARRAY[
    'notify_push',
    'notify_contest_reminders',
    'notify_live_sessions',
    'notify_purchases',
    'notify_supporters',
    'notify_follows',
    'notify_session_feedback',
    'notify_email_marketing'
  ];
  v_sql TEXT;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_key IS NULL OR NOT (p_key = ANY(v_allowed)) THEN
    RAISE EXCEPTION 'Invalid notification preference key %', p_key;
  END IF;

  PERFORM public.ensure_notification_prefs(v_user);

  v_sql := format('UPDATE public.notification_prefs SET %I = $1 WHERE user_id = $2', p_key);
  EXECUTE v_sql USING COALESCE(p_value, TRUE), v_user;

  RETURN public.get_notification_prefs(v_user);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_notification_pref(TEXT, BOOLEAN, UUID) TO authenticated;

-- Notification list + counters -------------------------------------------
DROP FUNCTION IF EXISTS public.notifications_list_recent(INTEGER);
CREATE OR REPLACE FUNCTION public.notifications_list_recent(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (
  id UUID,
  type TEXT,
  title TEXT,
  message TEXT,
  payload JSONB,
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 100);
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  RETURN QUERY
  SELECT n.id, n.type, n.title, n.message, n.payload, n.related_id, n.related_type, n.created_at, n.read_at
  FROM public.notifications n
  WHERE n.user_id = v_user
  ORDER BY n.created_at DESC
  LIMIT v_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notifications_list_recent(INTEGER) TO authenticated;

DROP FUNCTION IF EXISTS public.notifications_unread_count();
CREATE OR REPLACE FUNCTION public.notifications_unread_count()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_count INTEGER := 0;
BEGIN
  IF v_user IS NULL THEN
    RETURN 0;
  END IF;

  SELECT COUNT(*)
  INTO v_count
  FROM public.notifications
  WHERE user_id = v_user
    AND read_at IS NULL;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notifications_unread_count() TO authenticated;

DROP FUNCTION IF EXISTS public.notifications_mark_read(UUID);
CREATE OR REPLACE FUNCTION public.notifications_mark_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.notifications
  SET read_at = COALESCE(read_at, now())
  WHERE id = p_notification_id
    AND user_id = v_user;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notifications_mark_read(UUID) TO authenticated;

DROP FUNCTION IF EXISTS public.notifications_mark_all_read();
CREATE OR REPLACE FUNCTION public.notifications_mark_all_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE public.notifications
  SET read_at = COALESCE(read_at, now())
  WHERE user_id = v_user
    AND read_at IS NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.notifications_mark_all_read() TO authenticated;

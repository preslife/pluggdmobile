
-- Ensure system_logs table exists so the views can be created even if the
-- earlier analytics migrations were skipped (e.g. on fresh staging envs).
DO $guard$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public' AND tablename = 'system_logs'
  ) THEN
    EXECUTE $ddl$
      CREATE TABLE public.system_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        level INTEGER NOT NULL,
        message TEXT NOT NULL,
        "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        session_id TEXT,
        component TEXT,
        action TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    $ddl$;

    -- Mirror the essential indexes from the canonical migration so the
    -- fallback table performs well until the full analytics pack is applied.
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs("timestamp" DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON public.system_logs(user_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_system_logs_session_id ON public.system_logs(session_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_system_logs_component ON public.system_logs(component)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_system_logs_action ON public.system_logs(action)';

    EXECUTE 'ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY';

    EXECUTE $ddl$
      CREATE POLICY "Users can insert their own logs" ON public.system_logs
      FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL)
    $ddl$;

    EXECUTE $ddl$
      CREATE POLICY "Admins can read all logs" ON public.system_logs
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'admin'
        )
      )
    $ddl$;

    EXECUTE $ddl$
      CREATE POLICY "Users can read their own logs" ON public.system_logs
      FOR SELECT USING (auth.uid() = user_id)
    $ddl$;
  END IF;
END;
$guard$;

CREATE OR REPLACE VIEW public.vw_trust_safety_report_status AS
SELECT
  status,
  COUNT(*) AS total_reports,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS reports_last_7_days,
  COUNT(*) FILTER (WHERE status IN ('pending', 'investigating')) AS open_reports,
  COALESCE(ROUND(EXTRACT(EPOCH FROM (NOW() - MIN(created_at))) / 3600, 2), 0) AS oldest_open_hours
FROM public.content_reports
GROUP BY status;

CREATE OR REPLACE VIEW public.vw_notification_skip_summary AS
SELECT
  metadata ->> 'notification_type' AS notification_type,
  metadata ->> 'reason' AS skip_reason,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE "timestamp" >= NOW() - INTERVAL '1 day') AS events_last_24h
FROM public.system_logs
WHERE component = 'broadcast_notification'
  AND action = 'broadcast_notification_recipient_skipped'
GROUP BY 1, 2;

CREATE OR REPLACE VIEW public.vw_webhook_delivery_errors AS
SELECT
  wd.endpoint_id,
  we.user_id,
  wd.event_type,
  wd.status,
  COUNT(*) AS attempts,
  COUNT(*) FILTER (WHERE wd.status <> 'delivered') AS failures,
  MAX(wd.last_error) AS last_error,
  MAX(wd.updated_at) AS last_attempt_at
FROM (
  SELECT
    id,
    endpoint_id,
    event_type,
    status,
    last_error,
    GREATEST(created_at, COALESCE(delivered_at, created_at)) AS updated_at
  FROM public.webhook_deliveries
) AS wd
JOIN public.webhook_endpoints we ON we.id = wd.endpoint_id
GROUP BY wd.endpoint_id, we.user_id, wd.event_type, wd.status;

GRANT SELECT ON public.vw_trust_safety_report_status TO authenticated;
GRANT SELECT ON public.vw_notification_skip_summary TO authenticated;
GRANT SELECT ON public.vw_webhook_delivery_errors TO authenticated;

-- Observability views for Milestone D3

-- Notification skips summary -------------------------------------------------
DROP VIEW IF EXISTS public.vw_notification_skip_summary;
CREATE OR REPLACE VIEW public.vw_notification_skip_summary AS
SELECT
  COALESCE((metadata->>'notification_type')::text, 'unknown') AS notification_type,
  COALESCE((metadata->>'reason')::text, 'unknown') AS skip_reason,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE timestamp >= now() - INTERVAL '24 hours') AS events_last_24h
FROM public.system_logs
WHERE action = 'broadcast_notification_recipient_skipped'
GROUP BY 1, 2;

-- Trust & Safety backlog stats -----------------------------------------------
DROP VIEW IF EXISTS public.vw_trust_safety_report_status;
CREATE OR REPLACE VIEW public.vw_trust_safety_report_status(
  status,
  open_reports,
  oldest_open_hours,
  reports_last_7_days,
  total_reports
) AS
WITH status_counts AS (
  SELECT status, COUNT(*) AS total_reports
  FROM public.content_reports
  GROUP BY status
),
open_summary AS (
  SELECT
    COUNT(*) AS open_reports,
    EXTRACT(EPOCH FROM (now() - MIN(created_at))) / 3600 AS oldest_open_hours
  FROM public.content_reports
  WHERE status IN ('pending', 'investigating', 'appealed')
),
recent_inflow AS (
  SELECT COUNT(*) AS reports_last_7_days
  FROM public.content_reports
  WHERE created_at >= now() - INTERVAL '7 days'
)
SELECT
  sc.status,
  CASE WHEN sc.status IN ('pending', 'investigating', 'appealed') THEN sc.total_reports ELSE 0 END,
  CASE WHEN sc.status = 'pending' THEN open_summary.oldest_open_hours ELSE NULL END,
  recent_inflow.reports_last_7_days,
  sc.total_reports
FROM status_counts sc
CROSS JOIN recent_inflow
LEFT JOIN open_summary ON TRUE
UNION ALL
SELECT
  'open_total',
  COALESCE(open_summary.open_reports, 0),
  open_summary.oldest_open_hours,
  recent_inflow.reports_last_7_days,
  (SELECT SUM(total_reports) FROM status_counts)
FROM recent_inflow
LEFT JOIN open_summary ON TRUE;

-- Webhook delivery health ----------------------------------------------------
DROP VIEW IF EXISTS public.vw_webhook_delivery_errors;
CREATE OR REPLACE VIEW public.vw_webhook_delivery_errors AS
SELECT
  wd.endpoint_id,
  we.user_id,
  wd.event_type,
  wd.status,
  SUM(GREATEST(wd.attempt_count, 1)) AS attempts,
  COUNT(*) FILTER (WHERE wd.status NOT IN ('delivered', 'success')) AS failures,
  MAX(COALESCE(wd.delivered_at, wd.created_at)) AS last_attempt_at,
  MAX(wd.last_error) FILTER (WHERE wd.last_error IS NOT NULL) AS last_error
FROM public.webhook_deliveries wd
JOIN public.webhook_endpoints we ON we.id = wd.endpoint_id
GROUP BY wd.endpoint_id, we.user_id, wd.event_type, wd.status;

-- Observability rollups for checkout and memberships (Phase F3)
DROP VIEW IF EXISTS public.vw_checkout_activity_daily;
CREATE VIEW public.vw_checkout_activity_daily AS
WITH day_series AS (
  SELECT generate_series(
    date_trunc('day', now() - interval '29 days'),
    date_trunc('day', now()),
    interval '1 day'
  ) AS day
),
orders_daily AS (
  SELECT
    date_trunc('day', created_at) AS day,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed_orders,
    COUNT(*) FILTER (WHERE status <> 'completed') AS failed_orders,
    SUM(total_amount) FILTER (WHERE status = 'completed') AS completed_revenue
  FROM public.orders
  WHERE created_at >= now() - interval '30 days'
  GROUP BY 1
),
error_daily AS (
  SELECT
    date_trunc('day', timestamp) AS day,
    COUNT(*) FILTER (WHERE level >= 3) AS checkout_errors
  FROM public.system_logs
  WHERE component = 'checkout'
    AND timestamp >= now() - interval '30 days'
  GROUP BY 1
)
SELECT
  ds.day::date AS day,
  COALESCE(od.completed_orders, 0) AS completed_orders,
  COALESCE(od.failed_orders, 0) AS failed_orders,
  COALESCE(od.completed_revenue, 0)::numeric AS completed_revenue,
  COALESCE(ed.checkout_errors, 0) AS checkout_errors
FROM day_series ds
LEFT JOIN orders_daily od ON od.day = ds.day
LEFT JOIN error_daily ed ON ed.day = ds.day
ORDER BY ds.day DESC;

DROP VIEW IF EXISTS public.vw_membership_activity_daily;
CREATE VIEW public.vw_membership_activity_daily AS
WITH day_series AS (
  SELECT generate_series(
    date_trunc('day', now() - interval '29 days'),
    date_trunc('day', now()),
    interval '1 day'
  ) AS day
),
new_subscriptions AS (
  SELECT
    date_trunc('day', created_at) AS day,
    COUNT(*) AS new_subscriptions,
    SUM(price_cents) AS new_mrr_cents
  FROM public.fan_subscriptions
  WHERE created_at >= now() - interval '30 days'
  GROUP BY 1
),
churned_subscriptions AS (
  SELECT
    date_trunc('day', updated_at) AS day,
    COUNT(*) AS churned_subscriptions,
    SUM(price_cents) AS churned_mrr_cents
  FROM public.fan_subscriptions
  WHERE updated_at >= now() - interval '30 days'
    AND status <> 'active'
  GROUP BY 1
),
active_totals AS (
  SELECT
    COUNT(*) FILTER (WHERE status = 'active') AS active_subscriptions,
    SUM(price_cents) FILTER (WHERE status = 'active') AS active_mrr_cents
  FROM public.fan_subscriptions
)
SELECT
  ds.day::date AS day,
  COALESCE(ns.new_subscriptions, 0) AS new_subscriptions,
  COALESCE(ns.new_mrr_cents, 0)::numeric AS new_mrr_cents,
  COALESCE(cs.churned_subscriptions, 0) AS churned_subscriptions,
  COALESCE(cs.churned_mrr_cents, 0)::numeric AS churned_mrr_cents,
  active_totals.active_subscriptions,
  COALESCE(active_totals.active_mrr_cents, 0)::numeric AS active_mrr_cents
FROM day_series ds
LEFT JOIN new_subscriptions ns ON ns.day = ds.day
LEFT JOIN churned_subscriptions cs ON cs.day = ds.day
CROSS JOIN active_totals
ORDER BY ds.day DESC;

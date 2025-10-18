CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create analytics KPI event table and supporting rollups
CREATE TABLE IF NOT EXISTS public.creator_kpi_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_name text,
  source text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  metric_date date NOT NULL DEFAULT (timezone('utc', now())::date),
  kpi_key text NOT NULL,
  kpi_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_creator_kpi_events_creator_date
  ON public.creator_kpi_events (creator_id, metric_date, kpi_key);
CREATE INDEX IF NOT EXISTS idx_creator_kpi_events_source
  ON public.creator_kpi_events (source);

ALTER TABLE public.creator_kpi_events ENABLE ROW LEVEL SECURITY;

-- Allow creators to view and manage their KPI rows when inserting via client SDKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_kpi_events'
      AND policyname = 'Creator KPI events can be viewed by owner'
  ) THEN
    EXECUTE 'CREATE POLICY "Creator KPI events can be viewed by owner"
      ON public.creator_kpi_events
      FOR SELECT
      USING (auth.uid() = creator_id);';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'creator_kpi_events'
      AND policyname = 'Creator KPI events can be inserted by owner'
  ) THEN
    EXECUTE 'CREATE POLICY "Creator KPI events can be inserted by owner"
      ON public.creator_kpi_events
      FOR INSERT
      WITH CHECK (auth.uid() = creator_id);';
  END IF;
END
$$;

-- Materialized daily aggregate of KPI events
CREATE MATERIALIZED VIEW IF NOT EXISTS public.creator_kpi_daily
AS
SELECT
  creator_id,
  metric_date,
  kpi_key,
  SUM(kpi_value)::numeric AS total_value,
  COUNT(*)::bigint AS event_count,
  MAX(occurred_at) AS last_occurred_at
FROM public.creator_kpi_events
GROUP BY creator_id, metric_date, kpi_key
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS idx_creator_kpi_daily_unique
  ON public.creator_kpi_daily (creator_id, metric_date, kpi_key);

-- Initial refresh to make the materialized view queryable immediately
REFRESH MATERIALIZED VIEW public.creator_kpi_daily;

-- Helper function to refresh the KPI daily rollup concurrently
CREATE OR REPLACE FUNCTION public.refresh_creator_kpi_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.creator_kpi_daily;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_creator_kpi_daily() TO authenticated;

-- Developer-friendly view with built-in auth guard
CREATE OR REPLACE VIEW public.creator_kpi_daily_personal
AS
SELECT
  creator_id,
  metric_date,
  kpi_key,
  total_value,
  event_count,
  last_occurred_at
FROM public.creator_kpi_daily
WHERE creator_id = auth.uid();

GRANT SELECT ON public.creator_kpi_daily_personal TO authenticated;

-- Ensure pg_cron/pg_net extensions exist for scheduling refreshes
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Replace existing job if it exists, then schedule nightly refresh at 00:10 UTC
DO $$
DECLARE
  existing_job_id integer;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'refresh-creator-kpi-daily';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'refresh-creator-kpi-daily',
    '10 0 * * *',
    'SELECT public.refresh_creator_kpi_daily();'
  );
END;
$$;

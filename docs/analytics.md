# Analytics & KPI Pipeline

## Overview
The analytics pipeline collects engagement and revenue signals from Supabase Edge Functions, stores raw KPI events, and exposes nightly rollups that power the Creator Studio dashboards. This document summarizes the data flow, KPI definitions, and how to access the metrics from the front-end.

## Data flow
1. **Event collection** – Functions such as `analytics-processor`, `track-release-play`, `fetch-spotify-analytics`, `fetch-youtube-analytics`, `metrics-aggregator`, and `revenue-aggregator` now emit rows into the `public.creator_kpi_events` table whenever they observe a KPI update.
2. **Daily rollups** – A materialized view `public.creator_kpi_daily` aggregates the raw events by creator, date, and KPI key. A nightly cron job refreshes the view via the helper function `public.refresh_creator_kpi_daily()`.
3. **Secure access** – The `public.creator_kpi_daily_personal` view wraps the materialized rollup with an `auth.uid()` filter so authenticated creators only see their own KPIs. The Creator Studio `InsightsModule` reads from this view.

### Storage objects
| Object | Purpose |
| --- | --- |
| `public.creator_kpi_events` | Raw KPI events emitted by Edge Functions (streams, views, revenue, etc.). |
| `public.creator_kpi_daily` | Materialized rollup, refreshed nightly to support performant queries. |
| `public.creator_kpi_daily_personal` | Security-filtered view for client consumption. |

## KPI catalog
The following KPI keys are currently produced. All financial metrics are stored as integer cents.

| KPI key | Description | Source functions |
| --- | --- | --- |
| `total_streams` | Total music streams tracked per day. | `track-release-play`, `analytics-processor`, `fetch-spotify-analytics` |
| `total_views` | Video views captured from YouTube analytics. | `fetch-youtube-analytics`, `analytics-processor` |
| `total_likes` | Likes across streaming services and community posts. | `fetch-spotify-analytics`, `fetch-youtube-analytics`, `metrics-aggregator`, `analytics-processor` |
| `total_comments` | Comment activity across channels. | `fetch-youtube-analytics`, `metrics-aggregator`, `analytics-processor` |
| `fan_revenue_cents` | Fan subscription revenue recognized for the day. | `metrics-aggregator`, `revenue-aggregator` |
| `battle_revenue_cents` | Competition/battle payouts earned. | `revenue-aggregator` |
| `event_revenue_cents` | Ticketed live session earnings. | `revenue-aggregator` |
| `active_subscriptions` | Count of active fan subscriptions. | `metrics-aggregator` |
| `new_fans` | New fan subscriptions in the last 30 days. | `metrics-aggregator` |
| `churned_fans` | Cancelled fan subscriptions in the last 30 days. | `metrics-aggregator` |
| `total_followers` | Spotify follower count snapshot. | `fetch-spotify-analytics` |
| `total_subscribers` | YouTube channel subscriber count snapshot. | `fetch-youtube-analytics` |

## Scheduling
- The migration `20250926021500_creator_kpi_analytics.sql` installs `pg_cron` and schedules the job `refresh-creator-kpi-daily` to run every day at 00:10 UTC. It invokes `public.refresh_creator_kpi_daily()` to refresh the materialized view concurrently.
- Edge Functions that publish KPI snapshots first prune existing rows for the same creator/date/source combination so the rollup stays idempotent.

## Front-end consumption
- `src/components/CreatorStudio/modules/InsightsModule.tsx` queries `creator_kpi_daily_personal` for the last 30 days of KPI data. It surfaces KPI cards with 7-day trend deltas and plugs directly into the Creator Studio analytics route.
- `src/components/CreatorStudio/modules/AnalyticsModule.tsx` embeds the insights module above the existing live ticketing analytics so creators can see both real-time and historical performance in one place.

## Adding new KPIs
1. Emit raw events by inserting into `public.creator_kpi_events` from the relevant Edge Function. Use a consistent `kpi_key` string and include helpful metadata for debugging.
2. Update the KPI catalog in this document and extend `InsightsModule` if the KPI should appear in the dashboard.
3. The scheduled materialized view refresh will automatically pick up the new events; ensure the front-end handles the new key gracefully.

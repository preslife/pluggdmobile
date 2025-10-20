# Label Dashboard Implementation Guide

This guide captures how the production label dashboard queries Supabase for catalog inventory, sales performance, and revenue metrics. It documents the SQL views and RPCs that back each widget, how the metrics stay fresh, and the environment variables required to run the same pipelines locally.

## Catalog inventory feed

The catalog grid pulls from the analytics schema that denormalizes every sellable SKU into a single view. The UI filters that view through a dedicated RPC so that user/label context and pagination stay inside the database.

```sql
-- Fetch the latest products published by a label
select
  item_id,
  item_type,
  name,
  price_cents,
  sales_count,
  revenue_cents,
  last_transaction_at,
  inventory_status,
  media_url,
  created_at
from analytics.label_catalog_items
where label_id = :label_id
  and coalesce(status, 'live') = any(:status_filter)
order by coalesce(last_transaction_at, created_at) desc
limit :page_size offset :offset;
```

Key columns:

- `inventory_status` surfaces the publish state derived from underlying release/merch tables so the UI can badge items that still need work.
- `media_url` is the canonical artwork/cover to render in the grid; the RPC excludes heavy metadata blobs so thumbnails stay fast.
- `created_at` and `last_transaction_at` determine sorting and help the dashboard highlight dormant SKUs.

```ts
// Studio > Catalog module
const { data, error } = await supabase.rpc("catalog_list_items", {
  p_actor_id: session.user.id,
  p_owner_label_id: activeLabel.id,
  p_types: ["release", "beat", "bundle", "merch", "collectible"],
  p_status: ["live", "draft"],
  p_limit: 20,
  p_offset: 0,
});
```

The RPC internally hits `analytics.label_catalog_items` so we do not duplicate join logic client side; refer to the Studio contracts for the complete payload shape.【F:docs/studio.md†L23-L44】 The optional `p_status` argument surfaces as the `status_filter` bind parameter in the SQL snippet above.

## Sales and revenue cards

The headline metrics (`Total Sales`, `Total Revenue`, `Avg. Order Value`, etc.) come from a materialized summary table refreshed every time new transactions arrive.

```sql
-- Lifetime aggregate per label
select
  sum(sales_count)            as total_sales,
  sum(gross_revenue_cents)    as lifetime_gross_cents,
  sum(net_revenue_cents)      as lifetime_net_cents,
  sum(refund_cents)           as lifetime_refund_cents,
  sum(gross_revenue_cents) / nullif(sum(sales_count), 0) as average_order_value_cents
from analytics.label_sales_summary
where label_id = :label_id
  and period = 'lifetime';
```

```sql
-- 30 day trailing metrics that power the trend pill
select
  period,
  sales_count,
  gross_revenue_cents,
  net_revenue_cents
from analytics.label_sales_summary
where label_id = :label_id
  and period in ('30d', '7d');
```

```ts
const { data: summary } = await supabase
  .from("label_sales_summary")
  .select("period, sales_count, gross_revenue_cents, net_revenue_cents, refund_cents")
  .eq("label_id", activeLabel.id)
  .in("period", ["lifetime", "30d", "7d"]);
```

```ts
// Admin task: keep the lifetime materialized view fresh on demand
const { data, error } = await serviceClient.rpc("refresh_label_sales_summary", {
  p_label_id: activeLabel.id,
});
```

The admin script uses the same service-role Supabase client that powers the nightly aggregators so the refresh runs inside a single transaction.【F:supabase/functions/metrics-aggregator/index.ts†L59-L118】

## Revenue breakdown and charting

Trend visualisations and breakdown chips read directly from daily rollups so that the front end can render charts without additional aggregation.

```sql
-- Daily revenue + sales time series for the area chart
select
  metric_date,
  gross_revenue_cents,
  net_revenue_cents,
  sales_count
from analytics.label_daily_sales
where label_id = :label_id
  and metric_date >= (current_date - interval '90 days')
order by metric_date;
```

```sql
-- Revenue by product family for the donut chart
select
  item_type,
  sum(sales_count)         as sales_count,
  sum(net_revenue_cents)   as net_revenue_cents
from analytics.label_catalog_items
where label_id = :label_id
  and status = 'live'
  and last_transaction_at >= (current_date - interval '90 days')
group by item_type
order by net_revenue_cents desc;
```

## Refresh cadence

- **Streaming upserts** – Commerce webhooks write into `orders`/`order_items`; triggers update `analytics.label_catalog_items` and append the `label_daily_sales` fact rows.
- **Nightly cron** – The `metrics-aggregator` and `revenue-aggregator` edge functions run via pg_cron to re-sync KPIs and refresh the materialized summaries every midnight UTC, ensuring long-running dashboards pick up reconciled payouts.【F:supabase/functions/metrics-aggregator/index.ts†L59-L158】【F:supabase/functions/revenue-aggregator/index.ts†L64-L181】
- **Manual refresh** – Running `select refresh_label_sales_summary(:label_id)` (service role only) performs a synchronous `REFRESH MATERIALIZED VIEW CONCURRENTLY analytics.label_sales_summary` for incident response.

## Environment variables

The following settings must exist in Supabase and any worker that touches the label dashboards:

- `SUPABASE_URL` – Required by the scheduled aggregators to connect to the project before refreshing metrics.【F:supabase/functions/metrics-aggregator/index.ts†L65-L118】
- `SUPABASE_SERVICE_ROLE_KEY` – Grants the aggregators service-level access to refresh materialized views and upsert KPI snapshots.【F:supabase/functions/revenue-aggregator/index.ts†L72-L170】
- `LABELS_ENABLED` – Feature flag that toggles label routes and protects dashboard entry points in each environment.【F:supabase/specs/labels_migration_and_rollout.md†L4-L28】
- `LABEL_DASHBOARD_REFRESH_SECRET` – Shared secret used by the internal admin task that calls `refresh_label_sales_summary` (set in the Supabase config store).

Rotate the service role key alongside the cron secrets whenever label ownership changes, and verify the aggregators complete successfully by checking `creator_kpi_events` for the daily snapshots they insert.【F:supabase/functions/metrics-aggregator/index.ts†L11-L55】

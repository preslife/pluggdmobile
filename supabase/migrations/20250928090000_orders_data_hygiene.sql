-- Milestone A4 (Master Build Guide -2510): Normalize order states, backfill paid_at, and add reporting indexes.
-- References: BUILD GUIDES/MASTER BUILD GUIDE -2510, docs/qa-regression-checklist.md

begin;

-- Ensure required columns exist for reconciliation parity with PLUGGD_SCHEMA_2510
alter table public.orders
  add column if not exists paid_at timestamptz,
  add column if not exists payment_provider text default 'stripe';

-- Normalize legacy status values into the v2 enum contract
update public.orders
set status = case
  when status in ('complete', 'completed', 'succeeded', 'paid') then 'completed'
  when status in ('processing', 'in_progress') then 'processing'
  when status in ('cancelled', 'canceled', 'void') then 'cancelled'
  when status in ('refunded', 'refund') then 'refunded'
  when status in ('pending', 'awaiting_payment', 'open') then 'pending'
  else 'pending'
end
where status not in ('pending', 'processing', 'completed', 'cancelled', 'refunded');

-- Backfill paid_at timestamps for completed orders missing settlement time
update public.orders
set paid_at = coalesce(
  paid_at,
  updated_at,
  created_at
)
where status in ('completed', 'refunded')
  and paid_at is null;

-- Ensure payment_provider is populated for downstream analytics
update public.orders
set payment_provider = coalesce(nullif(payment_provider, ''), 'stripe')
where payment_provider is null
   or payment_provider = '';

-- Align historical payment_id data with Stripe sessions when available
update public.orders
set payment_id = coalesce(payment_id, stripe_session_id)
where payment_id is null
  and stripe_session_id is not null;

-- Indexes required for Account Orders + reporting (Milestone A4)
create index if not exists idx_orders_user_date on public.orders (user_id, created_at desc);
create index if not exists idx_orders_payment_id on public.orders (payment_id);
create index if not exists idx_order_items_order_id on public.order_items (order_id);

commit;

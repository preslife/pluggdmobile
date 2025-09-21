
begin;

-- 1) Extend purchases with commission/payout fields
alter table public.purchases
  add column if not exists commission_rate numeric,
  add column if not exists commission_amount numeric,
  add column if not exists producer_amount numeric,
  add column if not exists platform_fee_amount numeric,
  add column if not exists payout_status text not null default 'pending' check (payout_status in ('pending','eligible','processing','paid','failed'));

-- Helpful indexes for purchases
create index if not exists idx_purchases_buyer on public.purchases(buyer_id);
create index if not exists idx_purchases_beat on public.purchases(beat_id);
create index if not exists idx_purchases_status on public.purchases(status);
create index if not exists idx_purchases_payout_status on public.purchases(payout_status);

-- 2) Custom Beat Commissions: data model
create table if not exists public.commission_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null,              -- the artist requesting a custom beat
  producer_id uuid not null,               -- the producer receiving the request
  title text not null,
  description text,
  genre text,
  reference_links text[] default '{}'::text[],
  budget_cents integer not null,           -- proposed/funded budget in cents
  application_fee_percent numeric,         -- platform fee percent captured via Connect
  status text not null default 'pending' check (
    status in ('pending','accepted','funded','in_progress','delivered','completed','cancelled','refunded')
  ),
  stripe_payment_intent_id text,
  deadline date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.commission_requests enable row level security;

-- Policies:
-- Requester can create their own request
drop policy if exists "Requester can create commission" on public.commission_requests;
create policy "Requester can create commission"
on public.commission_requests
for insert
with check (auth.uid() = requester_id);

-- Requester or Producer can view their own commissions
drop policy if exists "Participants can view commission" on public.commission_requests;
create policy "Participants can view commission"
on public.commission_requests
for select
using (auth.uid() = requester_id or auth.uid() = producer_id);

-- Requester or Producer can update their commission
drop policy if exists "Participants can update commission" on public.commission_requests;
create policy "Participants can update commission"
on public.commission_requests
for update
using (auth.uid() = requester_id or auth.uid() = producer_id);

-- Admins can view all commissions
drop policy if exists "Admins can view all commissions" on public.commission_requests;
create policy "Admins can view all commissions"
on public.commission_requests
for select
using (exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin'));

-- updated_at trigger
drop trigger if exists trg_commission_requests_updated_at on public.commission_requests;
create trigger trg_commission_requests_updated_at
before update on public.commission_requests
for each row execute function public.update_updated_at_column();

-- Helpful indexes
create index if not exists idx_commission_requests_requester on public.commission_requests(requester_id);
create index if not exists idx_commission_requests_producer on public.commission_requests(producer_id);
create index if not exists idx_commission_requests_status on public.commission_requests(status);

commit;

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

create table if not exists public.creator_kpi_events (
  id uuid not null default gen_random_uuid(),
  creator_id uuid not null,
  event_name text,
  source text not null,
  occurred_at timestamptz not null default timezone('utc'::text, now()),
  metric_date date not null default (timezone('utc'::text, now()))::date,
  kpi_key text not null,
  kpi_value numeric not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint creator_kpi_events_pkey primary key (id),
  constraint creator_kpi_events_creator_id_fkey foreign key (creator_id) references auth.users(id)
);

alter table public.creator_kpi_events enable row level security;

create index if not exists idx_creator_kpi_events_creator_date
  on public.creator_kpi_events (creator_id, metric_date, kpi_key);

create index if not exists idx_creator_kpi_events_occurred_at
  on public.creator_kpi_events (occurred_at);

drop view if exists public.creator_kpi_daily_personal;
drop materialized view if exists public.creator_kpi_daily;

create materialized view public.creator_kpi_daily as
select
  e.creator_id,
  e.metric_date,
  e.kpi_key,
  e.source,
  nullif(e.metadata ->> 'post_id', '') as post_id,
  nullif(e.metadata ->> 'content_type', '') as content_type,
  nullif(e.metadata ->> 'content_id', '') as content_id,
  nullif(e.metadata ->> 'utm_source', '') as attribution_source,
  nullif(e.metadata ->> 'utm_medium', '') as attribution_medium,
  nullif(e.metadata ->> 'utm_campaign', '') as attribution_campaign,
  count(*)::bigint as event_count,
  coalesce(sum(e.kpi_value), 0)::numeric as total_value,
  max(e.occurred_at) as last_occurred_at
from public.creator_kpi_events e
group by
  e.creator_id,
  e.metric_date,
  e.kpi_key,
  e.source,
  nullif(e.metadata ->> 'post_id', ''),
  nullif(e.metadata ->> 'content_type', ''),
  nullif(e.metadata ->> 'content_id', ''),
  nullif(e.metadata ->> 'utm_source', ''),
  nullif(e.metadata ->> 'utm_medium', ''),
  nullif(e.metadata ->> 'utm_campaign', '');

create unique index idx_creator_kpi_daily_identity
  on public.creator_kpi_daily (
    creator_id,
    metric_date,
    kpi_key,
    source,
    post_id,
    content_type,
    content_id,
    attribution_source,
    attribution_medium,
    attribution_campaign
  );

create or replace function public.refresh_creator_kpi_daily()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  refresh materialized view concurrently public.creator_kpi_daily;
end;
$$;

create view public.creator_kpi_daily_personal as
select *
from public.creator_kpi_daily
where creator_id = auth.uid();

grant select on public.creator_kpi_daily_personal to authenticated;

do $$
begin
  perform public.refresh_creator_kpi_daily();
end
$$;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'refresh-creator-kpi-daily') then
    perform cron.schedule(
      'refresh-creator-kpi-daily',
      '10 0 * * *',
      $cron$
      select public.refresh_creator_kpi_daily();
      $cron$
    );
  end if;
end
$$;

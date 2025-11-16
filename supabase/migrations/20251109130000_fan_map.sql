-- Fan map plugs to back the community and creator maps

create table if not exists public.fan_map_plugs (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid references public.artists(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null,
  city text not null,
  country text not null,
  lat double precision not null check (lat >= -90 and lat <= 90),
  lng double precision not null check (lng >= -180 and lng <= 180),
  message text,
  tip_amount integer check (tip_amount is null or tip_amount >= 0),
  is_featured boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_fan_map_plugs_creator_id on public.fan_map_plugs(creator_id);
create index if not exists idx_fan_map_plugs_created_at on public.fan_map_plugs(created_at desc);

alter table public.fan_map_plugs enable row level security;

drop policy if exists "Fan map visible to everyone" on public.fan_map_plugs;
create policy "Fan map visible to everyone"
  on public.fan_map_plugs
  for select
  using (true);

drop policy if exists "Authenticated users can insert fan plugs"
  on public.fan_map_plugs;
create policy "Authenticated users can insert fan plugs"
  on public.fan_map_plugs
  for insert
  with check (auth.uid() is not null);

drop policy if exists "Service role manages fan plugs"
  on public.fan_map_plugs;
create policy "Service role manages fan plugs"
  on public.fan_map_plugs
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create or replace function public.get_fan_map_plugs(
  p_creator_id uuid default null,
  p_limit integer default 500
)
returns setof public.fan_map_plugs
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.fan_map_plugs
  where (p_creator_id is null and creator_id is null)
     or (creator_id = p_creator_id)
  order by created_at desc
  limit least(greatest(coalesce(p_limit, 500), 50), 2000);
$$;

create or replace function public.get_fan_map_stats(
  p_creator_id uuid default null
)
returns table(total bigint, featured bigint, countries integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*) as total,
    count(*) filter (where is_featured) as featured,
    count(distinct country) as countries
  from public.fan_map_plugs
  where (p_creator_id is null and creator_id is null)
     or (creator_id = p_creator_id);
$$;

create or replace function public.create_fan_map_plug(
  p_display_name text,
  p_city text,
  p_country text,
  p_lat double precision,
  p_lng double precision,
  p_message text default null,
  p_tip_amount integer default null,
  p_creator_id uuid default null
)
returns public.fan_map_plugs
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result public.fan_map_plugs%rowtype;
  v_display text;
  v_city text;
  v_country text;
  v_message text;
begin
  if v_user_id is null then
    raise exception 'not_authenticated';
  end if;

  if p_display_name is null or btrim(p_display_name) = '' then
    raise exception 'display_name_required';
  end if;

  if p_city is null or btrim(p_city) = '' then
    raise exception 'city_required';
  end if;

  if p_country is null or btrim(p_country) = '' then
    raise exception 'country_required';
  end if;

  if p_lat is null or p_lat < -90 or p_lat > 90 then
    raise exception 'invalid_latitude';
  end if;

  if p_lng is null or p_lng < -180 or p_lng > 180 then
    raise exception 'invalid_longitude';
  end if;

  if p_tip_amount is not null and p_tip_amount < 0 then
    raise exception 'invalid_tip_amount';
  end if;

  v_display := left(btrim(p_display_name), 80);
  v_city := left(btrim(p_city), 120);
  v_country := left(btrim(p_country), 120);
  v_message := nullif(left(coalesce(btrim(p_message), ''), 280), '');

  insert into public.fan_map_plugs (
    creator_id,
    user_id,
    display_name,
    city,
    country,
    lat,
    lng,
    message,
    tip_amount,
    is_featured
  )
  values (
    p_creator_id,
    v_user_id,
    v_display,
    v_city,
    v_country,
    p_lat,
    p_lng,
    v_message,
    p_tip_amount,
    coalesce(p_tip_amount, 0) > 0
  )
  returning * into v_result;

  return v_result;
end;
$$;

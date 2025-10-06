begin;

alter table releases
  add column if not exists contributors jsonb default '[]'::jsonb;

alter table releases
  add column if not exists lyrics text;

create table if not exists release_credits (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references releases(id) on delete cascade,
  name text not null,
  role text not null,
  contribution_type text,
  profile_url text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists release_credits_release_id_idx
  on release_credits (release_id);

alter table release_credits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where polname = 'Release credits are readable'
      and tablename = 'release_credits'
  ) then
    create policy "Release credits are readable" on release_credits
      for select
      using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where polname = 'Release credits manageable by owners'
      and tablename = 'release_credits'
  ) then
    create policy "Release credits manageable by owners" on release_credits
      for all
      using (
        auth.uid() = (
          select user_id from releases
          where releases.id = release_credits.release_id
        )
      )
      with check (
        auth.uid() = (
          select user_id from releases
          where releases.id = release_credits.release_id
        )
      );
  end if;
end
$$;

commit;

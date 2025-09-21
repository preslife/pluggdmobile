
-- Enable needed extension (for gen_random_uuid)
create extension if not exists pgcrypto;

-- 1) Battles
create table if not exists public.battles (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null,
  title text not null,
  description text,
  status text not null default 'draft',
  is_public boolean not null default true,
  submission_open_at timestamptz,
  submission_close_at timestamptz,
  voting_open_at timestamptz,
  voting_close_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint battles_status_check check (status in ('draft','open','voting','closed'))
);

-- 2) Submissions
create table if not exists public.battle_submissions (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  user_id uuid not null,
  title text,
  file_url text not null,
  file_type text,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  constraint one_submission_per_user_per_battle unique (battle_id, user_id)
);

-- 3) Votes
create table if not exists public.battle_votes (
  id uuid primary key default gen_random_uuid(),
  battle_id uuid not null references public.battles(id) on delete cascade,
  submission_id uuid not null references public.battle_submissions(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  constraint one_vote_per_user_per_battle unique (battle_id, user_id)
);

-- Helpful indexes
create index if not exists idx_battle_submissions_battle on public.battle_submissions(battle_id);
create index if not exists idx_battle_votes_battle on public.battle_votes(battle_id);
create index if not exists idx_battle_votes_submission on public.battle_votes(submission_id);

-- Updated_at trigger for battles
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

drop trigger if exists battles_set_updated on public.battles;
create trigger battles_set_updated
before update on public.battles
for each row execute function public.set_updated_at();

-- Validation triggers for time windows

-- Submissions allowed only when battle is 'open' and within submission window (if defined)
create or replace function public.check_submission_window() returns trigger
language plpgsql as $$
declare
  b record;
  nowts timestamptz := now();
begin
  select * into b from public.battles where id = new.battle_id;
  if not found then
    raise exception 'Battle not found for submission.';
  end if;

  -- Enforce status
  if b.status <> 'open' then
    raise exception 'Submissions are not open for this battle.';
  end if;

  -- Enforce optional submission window
  if b.submission_open_at is not null and nowts < b.submission_open_at then
    raise exception 'Submissions have not opened yet.';
  end if;
  if b.submission_close_at is not null and nowts > b.submission_close_at then
    raise exception 'Submissions are closed.';
  end if;

  return new;
end$$;

drop trigger if exists battle_submissions_window on public.battle_submissions;
create trigger battle_submissions_window
before insert or update on public.battle_submissions
for each row execute function public.check_submission_window();

-- Votes allowed only when battle is 'voting' and within voting window (if defined)
-- Also ensures submission belongs to the same battle
create or replace function public.check_vote_window_and_submission() returns trigger
language plpgsql as $$
declare
  b record;
  s record;
  nowts timestamptz := now();
begin
  select * into b from public.battles where id = new.battle_id;
  if not found then
    raise exception 'Battle not found for vote.';
  end if;

  -- Enforce status
  if b.status <> 'voting' then
    raise exception 'Voting is not open for this battle.';
  end if;

  -- Enforce optional voting window
  if b.voting_open_at is not null and nowts < b.voting_open_at then
    raise exception 'Voting has not opened yet.';
  end if;
  if b.voting_close_at is not null and nowts > b.voting_close_at then
    raise exception 'Voting is closed.';
  end if;

  -- Ensure submission belongs to this battle
  select id, battle_id into s from public.battle_submissions where id = new.submission_id;
  if not found then
    raise exception 'Submission not found.';
  end if;
  if s.battle_id <> new.battle_id then
    raise exception 'Submission does not belong to this battle.';
  end if;

  return new;
end$$;

drop trigger if exists battle_votes_window on public.battle_votes;
create trigger battle_votes_window
before insert or update on public.battle_votes
for each row execute function public.check_vote_window_and_submission();

-- Enable RLS
alter table public.battles enable row level security;
alter table public.battle_submissions enable row level security;
alter table public.battle_votes enable row level security;

-- RLS policies

-- battles: public can view public battles; creators manage their own
drop policy if exists "Public can view public battles" on public.battles;
create policy "Public can view public battles"
  on public.battles for select
  using (is_public = true or created_by = auth.uid());

drop policy if exists "Creators can insert battles" on public.battles;
create policy "Creators can insert battles"
  on public.battles for insert
  with check (created_by = auth.uid());

drop policy if exists "Creators can update their battles" on public.battles;
create policy "Creators can update their battles"
  on public.battles for update
  using (created_by = auth.uid());

drop policy if exists "Creators can delete their battles" on public.battles;
create policy "Creators can delete their battles"
  on public.battles for delete
  using (created_by = auth.uid());

-- submissions: public can read submissions of public battles; owners manage their own
drop policy if exists "Public can read submissions of public battles or owner" on public.battle_submissions;
create policy "Public can read submissions of public battles or owner"
  on public.battle_submissions for select
  using (
    exists (
      select 1 from public.battles b
      where b.id = battle_id
        and (b.is_public = true or b.created_by = auth.uid())
    )
    or user_id = auth.uid()
  );

drop policy if exists "Users can submit their own entries" on public.battle_submissions;
create policy "Users can submit their own entries"
  on public.battle_submissions for insert
  with check (user_id = auth.uid());

drop policy if exists "Owners can update their submissions" on public.battle_submissions;
create policy "Owners can update their submissions"
  on public.battle_submissions for update
  using (user_id = auth.uid());

drop policy if exists "Owners can delete their submissions" on public.battle_submissions;
create policy "Owners can delete their submissions"
  on public.battle_submissions for delete
  using (user_id = auth.uid());

-- votes: public can read (for leaderboards), only voter can insert/delete
drop policy if exists "Public can read votes" on public.battle_votes;
create policy "Public can read votes"
  on public.battle_votes for select
  using (true);

drop policy if exists "Users can cast a vote" on public.battle_votes;
create policy "Users can cast a vote"
  on public.battle_votes for insert
  with check (user_id = auth.uid());

drop policy if exists "Voters can delete their vote" on public.battle_votes;
create policy "Voters can delete their vote"
  on public.battle_votes for delete
  using (user_id = auth.uid());

-- Realtime publication (ignore if already added)
do $$
begin
  begin
    alter publication supabase_realtime add table public.battles;
  exception when duplicate_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.battle_submissions;
  exception when duplicate_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.battle_votes;
  exception when duplicate_object then
    null;
  end;
end$$;

-- Storage bucket for battle submissions (private, with policies)
select storage.create_bucket('battle-submissions', public => false);

-- Storage policies
-- Read: allow anyone (anon) to read via API for public listening
drop policy if exists "battle submissions read" on storage.objects;
create policy "battle submissions read"
  on storage.objects for select
  using (bucket_id = 'battle-submissions');

-- Insert: only authenticated users
drop policy if exists "battle submissions insert" on storage.objects;
create policy "battle submissions insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'battle-submissions');

-- Delete: only owners (the uploader)
drop policy if exists "battle submissions delete own" on storage.objects;
create policy "battle submissions delete own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'battle-submissions' and owner = auth.uid());

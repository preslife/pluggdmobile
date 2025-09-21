-- Create contest_submissions table
create table if not exists public.contest_submissions (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null,
  user_id uuid not null,
  title text not null,
  description text,
  audio_path text not null,
  file_size_bytes bigint not null default 0,
  duration_seconds integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_contest_submissions_contest foreign key (contest_id) references public.contests(id) on delete cascade
);

-- Helpful indexes
create index if not exists idx_contest_submissions_contest on public.contest_submissions(contest_id);
create index if not exists idx_contest_submissions_user on public.contest_submissions(user_id);

-- Single submission per user per contest
create unique index if not exists uniq_contest_submission_per_user on public.contest_submissions(contest_id, user_id);

-- Enable RLS
alter table public.contest_submissions enable row level security;

-- RLS Policies
-- Public can view submissions
create policy if not exists "Contest submissions are viewable by everyone"
  on public.contest_submissions for select using (true);

-- Users can create their own submissions
create policy if not exists "Users can create their own contest submissions"
  on public.contest_submissions for insert
  with check (auth.uid() = user_id);

-- Owners can update their submission before contest ends
create policy if not exists "Owners can update their submission before end"
  on public.contest_submissions for update
  using (
    auth.uid() = user_id
    and now() < (select c.end_date from public.contests c where c.id = contest_id)
  );

-- Owners can delete their submission before contest ends
create policy if not exists "Owners can delete their submission before end"
  on public.contest_submissions for delete
  using (
    auth.uid() = user_id
    and now() < (select c.end_date from public.contests c where c.id = contest_id)
  );

-- Updated-at trigger
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_contest_submissions_updated_at
before update on public.contest_submissions
for each row execute function public.update_updated_at_column();

-- Validate submissions: time window and file size (<= 50 MB)
create or replace function public.validate_contest_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sdate timestamptz;
  edate timestamptz;
begin
  select start_date, end_date into sdate, edate from public.contests where id = new.contest_id;
  if sdate is null then
    raise exception 'Contest not found for contest_id=%', new.contest_id;
  end if;
  if now() < sdate then
    raise exception 'Submissions are not open yet.';
  end if;
  if now() > edate then
    raise exception 'Submissions are closed.';
  end if;
  if new.file_size_bytes is null then
    new.file_size_bytes := 0;
  end if;
  if new.file_size_bytes > 50 * 1024 * 1024 then
    raise exception 'File exceeds 50MB limit.';
  end if;
  return new;
end;
$$;

create trigger trg_validate_contest_submission
before insert on public.contest_submissions
for each row execute function public.validate_contest_submission();

-- Voting rules on existing contest_votes table
-- Ensure one vote per contest per voter
do $$ begin
  if not exists (
    select 1 from pg_indexes where schemaname = 'public' and indexname = 'uniq_contest_vote_per_voter'
  ) then
    execute 'create unique index uniq_contest_vote_per_voter on public.contest_votes(contest_id, voter_id)';
  end if;
end $$;

-- Validate votes: voting window, non-participants, and matching contest/submission
create or replace function public.validate_contest_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  edate timestamptz;
  vend timestamptz;
  sub_contest uuid;
begin
  -- Check submission belongs to contest
  select contest_id into sub_contest from public.contest_submissions where id = new.submission_id;
  if sub_contest is null then
    raise exception 'Submission does not exist.';
  end if;
  if sub_contest <> new.contest_id then
    raise exception 'Submission does not belong to this contest.';
  end if;

  -- Time window: vote after submissions close and before voting_end_date (if set)
  select end_date, voting_end_date into edate, vend from public.contests where id = new.contest_id;
  if edate is null then
    raise exception 'Contest not found.';
  end if;
  if now() < edate then
    raise exception 'Voting has not started yet.';
  end if;
  if vend is not null and now() > vend then
    raise exception 'Voting period has ended.';
  end if;

  -- No participants can vote
  if exists (
    select 1 from public.contest_submissions cs
    where cs.contest_id = new.contest_id and cs.user_id = new.voter_id
  ) then
    raise exception 'Participants cannot vote in their own contest.';
  end if;

  return new;
end;
$$;

create trigger trg_validate_contest_vote
before insert on public.contest_votes
for each row execute function public.validate_contest_vote();

-- Storage bucket for contest submissions (public)
insert into storage.buckets (id, name, public)
values ('contest-submissions', 'contest-submissions', true)
on conflict (id) do update set public = true;

-- Storage policies
-- Public can read files
create policy if not exists "Public can read contest submissions files" on storage.objects
for select using (bucket_id = 'contest-submissions');

-- Users can upload to a folder with their user id as the first segment
create policy if not exists "Users can upload contest submissions"
  on storage.objects for insert
  with check (
    bucket_id = 'contest-submissions' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own files
create policy if not exists "Users can update their contest submission files"
  on storage.objects for update
  using (
    bucket_id = 'contest-submissions' and
    auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'contest-submissions' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
create policy if not exists "Users can delete their contest submission files"
  on storage.objects for delete
  using (
    bucket_id = 'contest-submissions' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
-- Create release_drafts table for creator-submitted releases
create table if not exists public.release_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  artist text,
  description text,
  genre text,
  release_type text not null default 'Single',
  cover_art_url text,
  preview_url text,
  download_price numeric default 0,
  download_url text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.release_drafts enable row level security;

-- Policies: creators manage their own drafts
create policy if not exists "Creators can manage their own release drafts"
  on public.release_drafts
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: admins can view all drafts
create policy if not exists "Admins can view all release drafts"
  on public.release_drafts
  for select
  using (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
create trigger if not exists update_release_drafts_updated_at
before update on public.release_drafts
for each row execute function public.update_updated_at_column();

-- Buckets for release assets
insert into storage.buckets (id, name, public)
values ('release-artwork', 'release-artwork', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('release-audio', 'release-audio', true)
on conflict (id) do nothing;

-- Storage policies: public read
create policy if not exists "Public can view release artwork"
  on storage.objects for select
  using (bucket_id = 'release-artwork');

create policy if not exists "Public can view release audio"
  on storage.objects for select
  using (bucket_id = 'release-audio');

-- Authenticated users can upload/update/delete within their own folder (prefix is user_id)
create policy if not exists "Users can upload their own release artwork"
  on storage.objects for insert
  with check (bucket_id = 'release-artwork' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Users can update their own release artwork"
  on storage.objects for update
  using (bucket_id = 'release-artwork' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Users can delete their own release artwork"
  on storage.objects for delete
  using (bucket_id = 'release-artwork' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Users can upload their own release audio"
  on storage.objects for insert
  with check (bucket_id = 'release-audio' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Users can update their own release audio"
  on storage.objects for update
  using (bucket_id = 'release-audio' and auth.uid()::text = (storage.foldername(name))[1]);

create policy if not exists "Users can delete their own release audio"
  on storage.objects for delete
  using (bucket_id = 'release-audio' and auth.uid()::text = (storage.foldername(name))[1]);
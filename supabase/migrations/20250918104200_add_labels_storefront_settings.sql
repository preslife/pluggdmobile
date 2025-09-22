alter table public.labels
  add column if not exists storefront_settings jsonb default '{}'::jsonb;

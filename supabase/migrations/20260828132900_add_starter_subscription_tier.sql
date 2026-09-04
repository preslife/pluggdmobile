-- Starter is a first-class PLUGGD platform tier. Keep this enum change in its
-- own migration so a fresh database commits the value before later functions
-- cast or persist it.
alter type public.subscription_tier
  add value if not exists 'starter' after 'free';

-- Add missing fields to api_tokens table
ALTER TABLE api_tokens 
ADD COLUMN IF NOT EXISTS scopes text[] DEFAULT '{read_releases,read_beats,read_stats}',
ADD COLUMN IF NOT EXISTS rate_limit_per_min integer DEFAULT 60,
ADD COLUMN IF NOT EXISTS revoked boolean DEFAULT false;

-- Add embed and onboarding settings to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS embed_settings jsonb DEFAULT '{
  "theme": "dark",
  "accent": "#6366f1",
  "size": "card",
  "autoplay": false
}'::jsonb,
ADD COLUMN IF NOT EXISTS onboarding_progress jsonb DEFAULT '{
  "completed_tasks": [],
  "completed_at": null,
  "rewards_claimed": false
}'::jsonb;
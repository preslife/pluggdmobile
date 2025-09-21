-- Phase 3 Stage 3: Distribution & Growth Extensions

-- A1. Extend releases table for distribution
ALTER TABLE releases ADD COLUMN IF NOT EXISTS distributor_provider TEXT DEFAULT 'manual';
ALTER TABLE releases ADD COLUMN IF NOT EXISTS distribution_status TEXT DEFAULT 'pending';
ALTER TABLE releases ADD COLUMN IF NOT EXISTS dsp_links JSONB DEFAULT '{}'::jsonb;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS smartlink_slug TEXT UNIQUE;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS explicit BOOLEAN DEFAULT FALSE;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS is_instrumental BOOLEAN DEFAULT FALSE;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS lyrics TEXT;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS credits_json JSONB DEFAULT '[]'::jsonb;

-- C1. Extend profiles for referral program
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- C1. Extend orders for referral attribution
ALTER TABLE orders ADD COLUMN IF NOT EXISTS referrer_code TEXT;

-- Create index for smartlink lookups
CREATE INDEX IF NOT EXISTS idx_releases_smartlink_slug ON releases(smartlink_slug) WHERE smartlink_slug IS NOT NULL;

-- Create index for referral code lookups
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code) WHERE referral_code IS NOT NULL;
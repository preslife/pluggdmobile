-- Ensure profiles table has referral_code with proper generation
ALTER TABLE profiles ALTER COLUMN referral_code SET DEFAULT upper(substring(md5(random()::text) from 1 for 8));

-- Update existing profiles without referral codes
UPDATE profiles 
SET referral_code = upper(substring(md5(random()::text) from 1 for 8))
WHERE referral_code IS NULL;
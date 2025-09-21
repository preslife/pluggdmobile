-- Update existing user profiles to be creators and add usernames where missing
UPDATE public.profiles 
SET is_creator = true,
    username = CASE 
      WHEN full_name = 'Admin User' AND username IS NULL THEN 'admin'
      WHEN full_name = 'Lord Tokumbo' AND username IS NULL THEN 'lord_tokumbo'
      ELSE username
    END
WHERE user_id IN (
  SELECT user_id FROM public.profiles 
  WHERE full_name IN ('Admin User', 'Lord Tokumbo')
);
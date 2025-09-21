-- Find and fix all functions missing search_path
-- Update all remaining functions with proper search_path settings

-- Fix get_user_tier function
CREATE OR REPLACE FUNCTION public.get_user_tier(user_id uuid)
RETURNS subscription_tier
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_tier subscription_tier;
BEGIN
  SELECT tier INTO user_tier
  FROM public.user_subscriptions
  WHERE public.user_subscriptions.user_id = $1
  AND status = 'active';
  
  RETURN COALESCE(user_tier, 'free');
END;
$$;

-- Fix has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;
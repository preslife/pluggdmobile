-- Fix critical security vulnerabilities by only adding policies that don't exist
-- Use CREATE POLICY IF NOT EXISTS where available, or DROP and recreate

-- Drop existing policies that are too permissive and recreate with proper restrictions
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "User achievements are viewable by everyone" ON public.user_achievements; 
DROP POLICY IF EXISTS "User stats are viewable by everyone" ON public.user_stats;
DROP POLICY IF EXISTS "User usage is viewable by everyone" ON public.user_usage;
DROP POLICY IF EXISTS "Producer earnings are viewable by everyone" ON public.producer_earnings;

-- 1. Secure profiles table - only own profile access
CREATE POLICY "Users can view own profile and admins can view all" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::user_role)
);

-- 2. Secure user_stats table - only own stats
CREATE POLICY "Users can view own stats and admins can view all" 
ON public.user_stats 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::user_role)
);

CREATE POLICY "Users can update own stats" 
ON public.user_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user stats" 
ON public.user_stats 
FOR INSERT 
WITH CHECK (true);

-- 3. Secure user_usage table - only own usage
CREATE POLICY "Users can view own usage and admins can view all" 
ON public.user_usage 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::user_role)
);

CREATE POLICY "Users can update own usage" 
ON public.user_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert user usage" 
ON public.user_usage 
FOR INSERT 
WITH CHECK (true);

-- 4. Secure producer_earnings table - only own earnings
CREATE POLICY "Producers can view own earnings and admins can view all" 
ON public.producer_earnings 
FOR SELECT 
USING (
  auth.uid() = producer_id OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::user_role)
);

-- 5. Secure user_achievements table - only own achievements  
CREATE POLICY "Users can view own achievements and admins can view all" 
ON public.user_achievements 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::user_role)
);

CREATE POLICY "System can insert user achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (true);

-- 6. Fix user_subscriptions - already has "Users can view their own subscription" policy
-- Just need to ensure system can manage subscriptions
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.user_subscriptions;

CREATE POLICY "System can insert user subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update user subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can view all user subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::user_role)
);
-- Fix critical security vulnerabilities by adding proper RLS policies

-- 1. Fix profiles table - restrict access to own profile or public viewing
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 2. Fix user_stats table - restrict to user's own stats
CREATE POLICY "Users can view their own stats" 
ON public.user_stats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.user_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats" 
ON public.user_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Fix user_usage table - restrict to user's own usage data
CREATE POLICY "Users can view their own usage" 
ON public.user_usage 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" 
ON public.user_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" 
ON public.user_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 4. Fix producer_earnings table - restrict to producer's own earnings
CREATE POLICY "Producers can view their own earnings" 
ON public.producer_earnings 
FOR SELECT 
USING (auth.uid() = producer_id);

CREATE POLICY "System can manage producer earnings" 
ON public.producer_earnings 
FOR ALL 
USING (true);

-- 5. Drop the overly permissive policy on user_subscriptions and create proper ones
DROP POLICY IF EXISTS "System can manage subscriptions" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscription" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (true);

-- 6. Fix user_achievements table - add missing RLS policies
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert achievements" 
ON public.user_achievements 
FOR INSERT 
WITH CHECK (true);

-- 7. Add admin override policies for administrative access
CREATE POLICY "Admins can view all user data" 
ON public.profiles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

CREATE POLICY "Admins can view all user stats" 
ON public.user_stats 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

CREATE POLICY "Admins can view all user usage" 
ON public.user_usage 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

CREATE POLICY "Admins can view all producer earnings" 
ON public.producer_earnings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

CREATE POLICY "Admins can view all subscriptions" 
ON public.user_subscriptions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

CREATE POLICY "Admins can view all achievements" 
ON public.user_achievements 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));
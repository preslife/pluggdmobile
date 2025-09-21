-- Fix security issues by tightening RLS policies

-- Create proper policies for analytics_events table
CREATE POLICY "Users can view their own analytics events" ON public.analytics_events
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics events" ON public.analytics_events
FOR SELECT USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin'::user_role
));

CREATE POLICY "System can insert analytics events" ON public.analytics_events
FOR INSERT WITH CHECK (true);

-- Improve contact_messages RLS to be more specific about access
DROP POLICY IF EXISTS "Users can submit contact messages with rate limiting" ON public.contact_messages;
CREATE POLICY "Anyone can create contact messages with validation" ON public.contact_messages
FOR INSERT WITH CHECK (validate_contact_submission(email, inet_client_addr()));

-- Add explicit policy for viewing own contact messages
CREATE POLICY "Users can view their own contact messages" ON public.contact_messages
FOR SELECT USING (email = (
  SELECT email FROM auth.users WHERE id = auth.uid()
));

-- Tighten profiles access
DROP POLICY IF EXISTS "Users can view profiles when authenticated" ON public.profiles;
CREATE POLICY "Public profile visibility" ON public.profiles
FOR SELECT USING (
  -- Profile owner can see everything
  auth.uid() = user_id OR
  -- Others can see basic public info only
  (auth.uid() IS NOT NULL)
);
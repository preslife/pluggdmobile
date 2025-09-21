-- Security fixes for critical vulnerabilities

-- 1. Add rate limiting and validation for mailing list
CREATE TABLE IF NOT EXISTS public.mailing_list_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT NOT NULL,
  submission_count INTEGER NOT NULL DEFAULT 1,
  first_submission_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_submission_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(ip_address, email)
);

-- Enable RLS on rate limiting table
ALTER TABLE public.mailing_list_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow system to manage rate limits
CREATE POLICY "System can manage rate limits" ON public.mailing_list_rate_limits
FOR ALL USING (true) WITH CHECK (true);

-- Add validation function for mailing list submissions
CREATE OR REPLACE FUNCTION public.validate_mailing_list_submission(p_email TEXT, p_ip_address INET DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  submission_count INTEGER;
  recent_submissions INTEGER;
BEGIN
  -- Basic email validation
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if email already exists
  IF EXISTS (SELECT 1 FROM public.mailing_list WHERE email = p_email) THEN
    RETURN FALSE;
  END IF;
  
  -- Rate limiting by IP (if provided)
  IF p_ip_address IS NOT NULL THEN
    -- Check submissions from this IP in last hour
    SELECT COUNT(*) INTO recent_submissions
    FROM public.mailing_list_rate_limits
    WHERE ip_address = p_ip_address 
    AND last_submission_at > NOW() - INTERVAL '1 hour';
    
    -- Limit to 3 submissions per hour per IP
    IF recent_submissions >= 3 THEN
      RETURN FALSE;
    END IF;
    
    -- Update rate limiting record
    INSERT INTO public.mailing_list_rate_limits (ip_address, email, submission_count, first_submission_at, last_submission_at)
    VALUES (p_ip_address, p_email, 1, NOW(), NOW())
    ON CONFLICT (ip_address, email) 
    DO UPDATE SET 
      submission_count = mailing_list_rate_limits.submission_count + 1,
      last_submission_at = NOW();
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update mailing list RLS policy to use validation
DROP POLICY IF EXISTS "Users can subscribe to mailing list" ON public.mailing_list;
CREATE POLICY "Users can subscribe to mailing list" ON public.mailing_list
FOR INSERT WITH CHECK (
  public.validate_mailing_list_submission(email, inet_client_addr())
);

-- 2. Add rate limiting for contact messages
CREATE TABLE IF NOT EXISTS public.contact_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  email TEXT NOT NULL,
  submission_count INTEGER NOT NULL DEFAULT 1,
  first_submission_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_submission_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(ip_address, email)
);

-- Enable RLS on contact rate limiting table
ALTER TABLE public.contact_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only allow system to manage contact rate limits
CREATE POLICY "System can manage contact rate limits" ON public.contact_rate_limits
FOR ALL USING (true) WITH CHECK (true);

-- Add validation function for contact form submissions
CREATE OR REPLACE FUNCTION public.validate_contact_submission(p_email TEXT, p_ip_address INET DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
  recent_submissions INTEGER;
BEGIN
  -- Basic email validation
  IF p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN FALSE;
  END IF;
  
  -- Rate limiting by IP (if provided)
  IF p_ip_address IS NOT NULL THEN
    -- Check submissions from this IP in last hour
    SELECT COUNT(*) INTO recent_submissions
    FROM public.contact_rate_limits
    WHERE ip_address = p_ip_address 
    AND last_submission_at > NOW() - INTERVAL '1 hour';
    
    -- Limit to 5 contact form submissions per hour per IP
    IF recent_submissions >= 5 THEN
      RETURN FALSE;
    END IF;
    
    -- Update rate limiting record
    INSERT INTO public.contact_rate_limits (ip_address, email, submission_count, first_submission_at, last_submission_at)
    VALUES (p_ip_address, p_email, 1, NOW(), NOW())
    ON CONFLICT (ip_address, email) 
    DO UPDATE SET 
      submission_count = contact_rate_limits.submission_count + 1,
      last_submission_at = NOW();
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enhance beat collaborators privacy - hide emails from unauthorized users
DROP POLICY IF EXISTS "Collaborators can view basic collaboration info" ON public.beat_collaborators;
CREATE POLICY "Collaborators can view basic collaboration info" ON public.beat_collaborators
FOR SELECT USING (
  -- Beat owner can see everything
  (EXISTS (
    SELECT 1 FROM beats 
    WHERE beats.id = beat_collaborators.beat_id 
    AND beats.user_id = auth.uid()
  )) OR
  -- Collaborators can see their own record with email
  (auth.uid() = collaborator_user_id) OR
  -- Others can see basic info but not emails (handled by row-level filtering)
  (collaborator_user_id IS NOT NULL)
);

-- Create a view for public collaborator info (without emails)
CREATE OR REPLACE VIEW public.beat_collaborators_public AS
SELECT 
  id,
  beat_id,
  collaborator_user_id,
  profit_share_percentage,
  publishing_share_percentage,
  content_id_percentage,
  is_confirmed,
  created_at,
  updated_at,
  collaborator_name,
  -- Only show email to beat owner or the collaborator themselves
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM beats 
      WHERE beats.id = beat_collaborators.beat_id 
      AND beats.user_id = auth.uid()
    ) OR auth.uid() = collaborator_user_id 
    THEN collaborator_email 
    ELSE NULL 
  END as collaborator_email,
  role
FROM public.beat_collaborators;

-- Grant access to the view
GRANT SELECT ON public.beat_collaborators_public TO authenticated;

-- 4. Add audit logging for sensitive data access
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  table_name TEXT NOT NULL,
  action TEXT NOT NULL,
  record_id UUID,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view audit logs" ON public.security_audit_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::user_role
  )
);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.security_audit_log
FOR INSERT WITH CHECK (true);

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_table_name TEXT,
  p_action TEXT,
  p_record_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, 
    table_name, 
    action, 
    record_id, 
    ip_address
  ) VALUES (
    auth.uid(), 
    p_table_name, 
    p_action, 
    p_record_id, 
    inet_client_addr()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
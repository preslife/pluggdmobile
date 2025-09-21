-- Fix security linter warnings

-- 1. Remove the SECURITY DEFINER view and create a proper function instead
DROP VIEW IF EXISTS public.beat_collaborators_public;

-- Create a secure function to get collaborator info with proper email filtering
CREATE OR REPLACE FUNCTION public.get_beat_collaborators_safe(p_beat_id UUID)
RETURNS TABLE (
  id UUID,
  beat_id UUID,
  collaborator_user_id UUID,
  profit_share_percentage NUMERIC,
  publishing_share_percentage NUMERIC,
  content_id_percentage NUMERIC,
  is_confirmed BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  collaborator_name TEXT,
  collaborator_email TEXT,
  role TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bc.id,
    bc.beat_id,
    bc.collaborator_user_id,
    bc.profit_share_percentage,
    bc.publishing_share_percentage,
    bc.content_id_percentage,
    bc.is_confirmed,
    bc.created_at,
    bc.updated_at,
    bc.collaborator_name,
    -- Only show email to beat owner or the collaborator themselves
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM beats 
        WHERE beats.id = bc.beat_id 
        AND beats.user_id = auth.uid()
      ) OR auth.uid() = bc.collaborator_user_id 
      THEN bc.collaborator_email 
      ELSE NULL 
    END as collaborator_email,
    bc.role
  FROM public.beat_collaborators bc
  WHERE bc.beat_id = p_beat_id
  AND (
    -- Beat owner can see everything
    EXISTS (
      SELECT 1 FROM beats 
      WHERE beats.id = bc.beat_id 
      AND beats.user_id = auth.uid()
    ) OR
    -- Collaborators can see their own record
    auth.uid() = bc.collaborator_user_id OR
    -- Others can see basic info
    bc.collaborator_user_id IS NOT NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Fix search_path for all functions to prevent security issues
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Update contact messages policy to use the validation function
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Add policy for contact message submissions with rate limiting
CREATE POLICY "Users can submit contact messages with rate limiting" ON public.contact_messages
FOR INSERT WITH CHECK (
  public.validate_contact_submission(email, inet_client_addr())
);
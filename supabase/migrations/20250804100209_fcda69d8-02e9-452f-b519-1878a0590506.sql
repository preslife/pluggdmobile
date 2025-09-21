-- Add fields to beats table for dual payment structure
ALTER TABLE public.beats 
ADD COLUMN uploaded_by_admin BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN producer_name TEXT;

-- Update existing admin-uploaded beats (if any) to set uploaded_by_admin = true
-- This identifies beats uploaded by admin users
UPDATE public.beats 
SET uploaded_by_admin = true 
WHERE user_id IN (
  SELECT user_id 
  FROM public.user_roles 
  WHERE role = 'admin'
);

-- Add comment for clarity
COMMENT ON COLUMN public.beats.uploaded_by_admin IS 'Indicates if beat was uploaded by admin (100% platform revenue) vs regular user (tier-based commission)';
COMMENT ON COLUMN public.beats.producer_name IS 'Producer name for attribution when uploaded by admin';
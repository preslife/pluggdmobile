-- Fix releases status constraint to ensure all valid statuses are included
-- This resolves the "violates check constraint" error

-- Drop existing constraint and recreate with correct values
ALTER TABLE public.releases 
DROP CONSTRAINT IF EXISTS releases_status_check;

ALTER TABLE public.releases 
ADD CONSTRAINT releases_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'live', 'scheduled'));

-- Update any invalid status values to submitted
UPDATE public.releases 
SET status = 'submitted' 
WHERE status NOT IN ('draft', 'submitted', 'approved', 'rejected', 'live', 'scheduled');
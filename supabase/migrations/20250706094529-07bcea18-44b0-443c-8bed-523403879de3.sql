-- Fix RLS policies for beats table to allow admins to see all beats
DROP POLICY IF EXISTS "Admins can view all beats" ON public.beats;

-- Create policy for admins to view all beats
CREATE POLICY "Admins can view all beats" 
ON public.beats 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 
    FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
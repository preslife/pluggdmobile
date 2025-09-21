-- Grant admin role to the current user
-- Note: This will work once you're authenticated and auth.uid() returns your user ID
INSERT INTO public.user_roles (user_id, role)
SELECT auth.uid(), 'admin'::user_role
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;
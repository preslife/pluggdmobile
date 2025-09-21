-- Assign admin role to the newly created user
INSERT INTO public.user_roles (user_id, role)
VALUES ('862d3297-de1d-4c02-bd8d-8fd2cbe70f45', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
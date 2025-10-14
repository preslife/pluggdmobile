-- Find user by email and assign admin role
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Get the user ID for admin@pluggd.fm
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@pluggd.fm';
    
    -- Only proceed if user exists
    IF admin_user_id IS NOT NULL THEN
        -- Insert admin role (ignore if already exists)
        INSERT INTO public.user_roles (user_id, role)
        VALUES (admin_user_id, 'admin')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Admin role assigned to user admin@pluggd.fm';
    ELSE
        RAISE NOTICE 'User admin@pluggd.fm not found. Please sign up first with these credentials.';
    END IF;
END $$;

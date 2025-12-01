-- Create D'yani's creator profile and initialize creator data
DO $$
DECLARE
    dyani_user_id UUID := 'd1234567-8901-2345-6789-012345678901'::UUID;
BEGIN
    -- Create D'yani's profile entry
    INSERT INTO public.profiles (
        user_id, 
        full_name, 
        username, 
        bio, 
        avatar_url, 
        user_type,
        created_at,
        updated_at
    ) VALUES (
        dyani_user_id,
        'D''yani',
        'dyani',
        'Rising R&B artist creating soulful music that connects hearts and minds. Known for powerful vocals and emotionally resonant songwriting.',
        '/uploads/695d06f7-2a64-4b9c-9cd1-34dd538fc6d9.png',
        'artist',
        now(),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username,
        bio = EXCLUDED.bio,
        avatar_url = EXCLUDED.avatar_url,
        user_type = EXCLUDED.user_type,
        updated_at = now();

    -- Initialize user stats for XP and badges
    INSERT INTO public.user_stats (
        user_id,
        total_points,
        level,
        beats_uploaded,
        beats_sold,
        collaborations_completed,
        created_at,
        updated_at
    ) VALUES (
        dyani_user_id,
        250,
        3,
        0,
        0,
        2,
        now(),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_points = EXCLUDED.total_points,
        level = EXCLUDED.level,
        collaborations_completed = EXCLUDED.collaborations_completed,
        updated_at = now();

    -- Update D'yani to be featured
    UPDATE public.artists 
    SET 
        is_featured = true,
        updated_at = now()
    WHERE name = 'D''yani';

END $$;
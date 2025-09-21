-- Drop duplicate tables that were created
DROP TABLE IF EXISTS public.community_posts CASCADE;
DROP TABLE IF EXISTS public.community_comments CASCADE;
DROP TABLE IF EXISTS public.community_likes CASCADE;

-- Add foreign key relationships for existing tables that need them
ALTER TABLE public.events 
ADD CONSTRAINT events_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.fan_subscriptions 
ADD CONSTRAINT fan_subscriptions_fan_id_fkey 
FOREIGN KEY (fan_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.fan_subscriptions 
ADD CONSTRAINT fan_subscriptions_creator_id_fkey 
FOREIGN KEY (creator_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Ensure posts table has the right structure for community posts
-- Add type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'posts' AND column_name = 'type') THEN
        ALTER TABLE public.posts ADD COLUMN type TEXT DEFAULT 'community';
    END IF;
END $$;

-- Ensure posts table has proper foreign key to profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'posts_user_id_fkey' 
        AND table_name = 'posts'
    ) THEN
        ALTER TABLE public.posts 
        ADD CONSTRAINT posts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure comments table has proper foreign key to profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'comments_user_id_fkey' 
        AND table_name = 'comments'
    ) THEN
        ALTER TABLE public.comments 
        ADD CONSTRAINT comments_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
    END IF;
END $$;
-- Simple migration to add array columns for credits
-- This avoids any complex operations that might trigger snippet errors

-- Add array columns to releases table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'releases' 
                   AND column_name = 'producers') THEN
        ALTER TABLE public.releases ADD COLUMN producers TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'releases' 
                   AND column_name = 'songwriters') THEN
        ALTER TABLE public.releases ADD COLUMN songwriters TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'releases' 
                   AND column_name = 'composers') THEN
        ALTER TABLE public.releases ADD COLUMN composers TEXT[];
    END IF;
END $$;

-- Add array columns to tracks table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'tracks' 
                   AND column_name = 'producers') THEN
        ALTER TABLE public.tracks ADD COLUMN producers TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'tracks' 
                   AND column_name = 'songwriters') THEN
        ALTER TABLE public.tracks ADD COLUMN songwriters TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'tracks' 
                   AND column_name = 'composers') THEN
        ALTER TABLE public.tracks ADD COLUMN composers TEXT[];
    END IF;
END $$;
-- =====================================================
-- STAGE 1: TABLES AND COLUMNS RESTORATION
-- Run this FIRST to establish all table structures and columns
-- =====================================================

-- =====================================================
-- RELEASES TABLE - ADD ALL MISSING COLUMNS
-- =====================================================

-- Migration 20250110000000: Add digital release date  
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS digital_release_date TIMESTAMPTZ;

-- Migration 20250110000001: Add UPC and distribution settings
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS upc_code TEXT,
ADD COLUMN IF NOT EXISTS distribution_settings JSONB DEFAULT '{}'::jsonb;

-- Migration 20250110000007: Add status and moderation workflow
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Migration 20250110000009: Add featured artists and ownership fields
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS featured_artists TEXT[],
ADD COLUMN IF NOT EXISTS owns_100_percent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distribution_rights_confirmed BOOLEAN DEFAULT FALSE;

-- Migration 20250110000010: Add comprehensive credits system
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS producer TEXT,
ADD COLUMN IF NOT EXISTS executive_producer TEXT,
ADD COLUMN IF NOT EXISTS songwriter TEXT,
ADD COLUMN IF NOT EXISTS composer TEXT,
ADD COLUMN IF NOT EXISTS mixing_engineer TEXT,
ADD COLUMN IF NOT EXISTS mastering_engineer TEXT,
ADD COLUMN IF NOT EXISTS recording_engineer TEXT,
ADD COLUMN IF NOT EXISTS additional_credits JSONB;

-- Add detailed genre classification
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS primary_genre TEXT,
ADD COLUMN IF NOT EXISTS sub_genre TEXT,
ADD COLUMN IF NOT EXISTS mood_tags TEXT[],
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

-- Migration 20250110000012: Add credit arrays
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS producers TEXT[],
ADD COLUMN IF NOT EXISTS songwriters TEXT[],
ADD COLUMN IF NOT EXISTS composers TEXT[];

-- Migration 20250110000014: Add ISRC and final fields
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS isrc_code TEXT;

-- Update existing releases to have 'live' status if currently null
UPDATE public.releases 
SET status = 'live' 
WHERE status IS NULL OR status = '';

-- Update existing releases to use primary_genre from genre
UPDATE public.releases 
SET primary_genre = genre 
WHERE primary_genre IS NULL AND genre IS NOT NULL;

-- =====================================================
-- RELEASE_DRAFTS TABLE - ADD ALL MISSING COLUMNS
-- =====================================================

-- Migration 20250110000001: Add download_url
ALTER TABLE public.release_drafts
ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Migration 20250110000002: Add comprehensive pricing and distribution fields
ALTER TABLE public.release_drafts 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pay_what_you_want BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS minimum_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS upc_code TEXT,
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS digital_release_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS distribution_settings JSONB DEFAULT '{}'::jsonb;

-- Migration 20250110000003: Add preview URL
ALTER TABLE public.release_drafts 
ADD COLUMN IF NOT EXISTS preview_url TEXT;

-- =====================================================
-- TRACKS TABLE - CREATE AND ADD ALL COLUMNS
-- =====================================================

-- Create tracks table with basic structure
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  track_number INTEGER NOT NULL,
  audio_url TEXT,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add all additional columns from various migrations
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS featured_artists TEXT[];
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS owns_100_percent BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS distribution_rights_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS producer TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS songwriter TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS composer TEXT;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS additional_credits JSONB;
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS producers TEXT[];
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS songwriters TEXT[];
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS composers TEXT[];
ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS isrc_code TEXT;

-- Add release_draft_id column if release_drafts table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'release_drafts') THEN
        ALTER TABLE public.tracks ADD COLUMN IF NOT EXISTS release_draft_id UUID REFERENCES public.release_drafts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================
-- NOTIFICATIONS TABLE - CREATE WITH ALL COLUMNS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COLLABORATORS TABLE - CREATE WITH ALL COLUMNS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('featured_artist', 'vocalist', 'producer', 'songwriter', 'composer', 'label', 'manager', 'other')),
  role_description TEXT,
  is_external BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SPLITS TABLE - CREATE WITH ALL COLUMNS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL CHECK (split_type IN ('master_recording', 'publishing', 'performance', 'mechanical')),
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMPLETION MESSAGE FOR STAGE 1
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE 'STAGE 1 COMPLETE: All tables and columns created/restored';
    RAISE NOTICE 'Next: Run STAGE_2_CONSTRAINTS_POLICIES.sql';
END $$;
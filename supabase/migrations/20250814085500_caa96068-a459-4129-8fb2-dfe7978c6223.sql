-- Create XP earning triggers for various user actions

-- Trigger for beat uploads
CREATE OR REPLACE FUNCTION public.award_beat_upload_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 15 XP for uploading a beat
  UPDATE public.user_stats 
  SET 
    total_points = total_points + 15,
    beats_uploaded = beats_uploaded + 1,
    level = FLOOR((total_points + 15) / 100) + 1,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  -- Create achievement record if this is their first upload
  IF (SELECT beats_uploaded FROM public.user_stats WHERE user_id = NEW.user_id) = 1 THEN
    INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, description, points_awarded)
    VALUES (NEW.user_id, 'first_upload', 'First Beat', 'Uploaded your first beat!', 25);
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger for release purchases
CREATE OR REPLACE FUNCTION public.award_purchase_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  seller_id UUID;
BEGIN
  -- Get the seller's user ID from releases table
  SELECT r.user_id INTO seller_id 
  FROM public.releases r 
  WHERE r.id = NEW.release_id;
  
  -- Award 10 XP to buyer
  UPDATE public.user_stats 
  SET 
    total_points = total_points + 10,
    beats_purchased = beats_purchased + 1,
    level = FLOOR((total_points + 10) / 100) + 1,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  -- Award 25 XP to seller
  IF seller_id IS NOT NULL THEN
    UPDATE public.user_stats 
    SET 
      total_points = total_points + 25,
      beats_sold = beats_sold + 1,
      level = FLOOR((total_points + 25) / 100) + 1,
      updated_at = now()
    WHERE user_id = seller_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Trigger for collaboration completion
CREATE OR REPLACE FUNCTION public.award_collaboration_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award XP when collaboration status changes to completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE public.user_stats 
    SET 
      total_points = total_points + 50,
      collaborations_completed = collaborations_completed + 1,
      level = FLOOR((total_points + 50) / 100) + 1,
      updated_at = now()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create triggers
CREATE TRIGGER award_beat_upload_xp_trigger
  AFTER INSERT ON public.beats
  FOR EACH ROW
  EXECUTE FUNCTION public.award_beat_upload_xp();

CREATE TRIGGER award_purchase_xp_trigger
  AFTER INSERT ON public.release_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.award_purchase_xp();

CREATE TRIGGER award_collaboration_xp_trigger
  AFTER UPDATE ON public.collaboration_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.award_collaboration_xp();

-- Create sample packs table for the store
CREATE TABLE public.sample_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_art_url TEXT,
  price NUMERIC DEFAULT 0,
  genre TEXT,
  bpm_range TEXT,
  sample_count INTEGER DEFAULT 0,
  download_url TEXT,
  preview_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT false,
  total_downloads INTEGER DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on sample_packs
ALTER TABLE public.sample_packs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sample_packs
CREATE POLICY "Sample packs are viewable by everyone" 
ON public.sample_packs 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own sample packs" 
ON public.sample_packs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sample packs" 
ON public.sample_packs 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sample ppacks" 
ON public.sample_packs 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create sample pack purchases table
CREATE TABLE public.sample_pack_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  sample_pack_id UUID REFERENCES public.sample_packs(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  download_expires_at TIMESTAMPTZ,
  stripe_payment_intent_id TEXT,
  download_url TEXT
);

-- Enable RLS on sample_pack_purchases
ALTER TABLE public.sample_pack_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for sample_pack_purchases
CREATE POLICY "Users can view their own sample pack purchases" 
ON public.sample_pack_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sample pack purchases" 
ON public.sample_pack_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Badge achievements system enhancement
CREATE TABLE public.badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_type TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  required_points INTEGER DEFAULT 0,
  required_count INTEGER DEFAULT 0,
  required_action TEXT, -- 'beats_uploaded', 'beats_sold', 'collaborations', etc.
  tier TEXT DEFAULT 'bronze', -- bronze, silver, gold, platinum
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert badge definitions
INSERT INTO public.badge_definitions (badge_type, name, description, required_points, required_count, required_action, tier) VALUES
('first_upload', 'First Beat', 'Uploaded your first beat', 0, 1, 'beats_uploaded', 'bronze'),
('beat_collector', 'Beat Collector', 'Uploaded 10 beats', 0, 10, 'beats_uploaded', 'bronze'),
('beat_master', 'Beat Master', 'Uploaded 50 beats', 0, 50, 'beats_uploaded', 'silver'),
('beat_legend', 'Beat Legend', 'Uploaded 100 beats', 0, 100, 'beats_uploaded', 'gold'),
('sales_starter', 'Sales Starter', 'Made your first sale', 0, 1, 'beats_sold', 'bronze'),
('top_seller', 'Top Seller', 'Made 25 sales', 0, 25, 'beats_sold', 'silver'),
('sales_king', 'Sales King', 'Made 100 sales', 0, 100, 'beats_sold', 'gold'),
('collaborator', 'Collaborator', 'Completed first collaboration', 0, 1, 'collaborations_completed', 'bronze'),
('team_player', 'Team Player', 'Completed 10 collaborations', 0, 10, 'collaborations_completed', 'silver'),
('xp_rookie', 'XP Rookie', 'Earned 500 XP', 500, 0, 'total_points', 'bronze'),
('xp_veteran', 'XP Veteran', 'Earned 2500 XP', 2500, 0, 'total_points', 'silver'),
('xp_legend', 'XP Legend', 'Earned 10000 XP', 10000, 0, 'total_points', 'gold');

-- Enhanced function to auto-award badges
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_stats_record RECORD;
  badge_def RECORD;
  current_value INTEGER;
BEGIN
  -- Get user stats
  SELECT * INTO user_stats_record 
  FROM public.user_stats 
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Check each badge definition
  FOR badge_def IN SELECT * FROM public.badge_definitions WHERE is_active = true
  LOOP
    -- Skip if user already has this badge
    IF EXISTS (
      SELECT 1 FROM public.user_achievements 
      WHERE user_id = p_user_id AND achievement_type = badge_def.badge_type
    ) THEN
      CONTINUE;
    END IF;
    
    -- Get current value for the required action
    CASE badge_def.required_action
      WHEN 'beats_uploaded' THEN current_value := user_stats_record.beats_uploaded;
      WHEN 'beats_sold' THEN current_value := user_stats_record.beats_sold;
      WHEN 'collaborations_completed' THEN current_value := user_stats_record.collaborations_completed;
      WHEN 'total_points' THEN current_value := user_stats_record.total_points;
      ELSE current_value := 0;
    END CASE;
    
    -- Check if requirements are met
    IF (badge_def.required_count > 0 AND current_value >= badge_def.required_count) OR
       (badge_def.required_points > 0 AND user_stats_record.total_points >= badge_def.required_points) THEN
      
      -- Award the badge
      INSERT INTO public.user_achievements (user_id, achievement_type, achievement_name, description, points_awarded)
      VALUES (p_user_id, badge_def.badge_type, badge_def.name, badge_def.description, 
              CASE badge_def.tier 
                WHEN 'bronze' THEN 25
                WHEN 'silver' THEN 50  
                WHEN 'gold' THEN 100
                WHEN 'platinum' THEN 200
                ELSE 25
              END);
    END IF;
  END LOOP;
END;
$function$;

-- Update XP award functions to check for badges
CREATE OR REPLACE FUNCTION public.award_beat_upload_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Award 15 XP for uploading a beat
  UPDATE public.user_stats 
  SET 
    total_points = total_points + 15,
    beats_uploaded = beats_uploaded + 1,
    level = FLOOR((total_points + 15) / 100) + 1,
    updated_at = now()
  WHERE user_id = NEW.user_id;
  
  -- Check and award badges
  PERFORM public.check_and_award_badges(NEW.user_id);
  
  RETURN NEW;
END;
$function$;
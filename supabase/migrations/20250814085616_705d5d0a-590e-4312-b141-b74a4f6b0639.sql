-- Fix search path issues and enable RLS on missing tables
-- Fix search path for functions
CREATE OR REPLACE FUNCTION public.check_and_award_badges(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

-- Enable RLS on badge_definitions table
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;

-- Badge definitions are viewable by everyone
CREATE POLICY "Badge definitions are viewable by everyone" 
ON public.badge_definitions 
FOR SELECT 
USING (true);

-- Only admins can manage badge definitions
CREATE POLICY "Only admins can manage badge definitions" 
ON public.badge_definitions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));
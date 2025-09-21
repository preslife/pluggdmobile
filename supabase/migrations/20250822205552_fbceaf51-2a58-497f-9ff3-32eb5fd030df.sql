-- Create function to award quest XP
CREATE OR REPLACE FUNCTION public.award_quest_xp(p_user_id uuid, p_xp_amount integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert or update user stats with quest XP
  INSERT INTO public.user_stats (user_id, total_points, updated_at)
  VALUES (p_user_id, p_xp_amount, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_points = user_stats.total_points + p_xp_amount,
    level = FLOOR((user_stats.total_points + p_xp_amount) / 100) + 1,
    updated_at = now();
    
  -- Check and award badges
  PERFORM public.check_and_award_badges(p_user_id);
END;
$$;
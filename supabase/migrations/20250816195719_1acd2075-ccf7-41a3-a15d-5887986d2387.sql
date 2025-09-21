-- Create trigger to automatically check and award badges when user stats are updated
CREATE OR REPLACE TRIGGER trigger_check_badges_on_stats_update
  AFTER INSERT OR UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges(NEW.user_id);

-- Create trigger to automatically check badges on achievements table updates  
CREATE OR REPLACE TRIGGER trigger_check_badges_on_achievement_insert
  AFTER INSERT ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges(NEW.user_id);

-- Add real-time support for gamification tables
ALTER TABLE public.user_stats REPLICA IDENTITY FULL;
ALTER TABLE public.user_achievements REPLICA IDENTITY FULL;
ALTER TABLE public.badge_definitions REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.badge_definitions;
-- Create trigger to automatically check and award badges when user stats are updated
CREATE OR REPLACE FUNCTION trigger_check_badges_wrapper()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trigger_check_badges_on_stats_update
  AFTER INSERT OR UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_badges_wrapper();

-- Add real-time support for gamification tables
ALTER TABLE public.user_stats REPLICA IDENTITY FULL;
ALTER TABLE public.user_achievements REPLICA IDENTITY FULL;
ALTER TABLE public.badge_definitions REPLICA IDENTITY FULL;
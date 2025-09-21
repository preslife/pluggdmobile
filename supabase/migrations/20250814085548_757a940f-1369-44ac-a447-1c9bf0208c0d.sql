-- Drop existing trigger and recreate with updated function
DROP TRIGGER IF EXISTS award_beat_upload_xp_trigger ON public.beats;

CREATE TRIGGER award_beat_upload_xp_trigger
  AFTER INSERT ON public.beats
  FOR EACH ROW
  EXECUTE FUNCTION public.award_beat_upload_xp();

-- Update other XP functions to check badges too
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
    
    -- Check badges for seller
    PERFORM public.check_and_award_badges(seller_id);
  END IF;
  
  -- Check badges for buyer
  PERFORM public.check_and_award_badges(NEW.user_id);
  
  RETURN NEW;
END;
$function$;

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
    
    -- Check and award badges
    PERFORM public.check_and_award_badges(NEW.user_id);
  END IF;
  
  RETURN NEW;
END;
$function$;
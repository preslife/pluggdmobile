-- Fix security warning by setting search_path for the trigger function
CREATE OR REPLACE FUNCTION trigger_check_badges_wrapper()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  PERFORM public.check_and_award_badges(NEW.user_id);
  RETURN NEW;
END;
$$;
-- Fix security warnings by properly recreating functions with search path
DROP TRIGGER IF EXISTS validate_content_splits_trigger ON public.content_splits;
DROP FUNCTION IF EXISTS public.validate_content_splits();
DROP FUNCTION IF EXISTS public.get_content_split_status(TEXT, UUID);

-- Create validation function for content splits with proper search path
CREATE OR REPLACE FUNCTION public.validate_content_splits()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_percent NUMERIC;
BEGIN
  -- Calculate total percentage for this content
  SELECT COALESCE(SUM(percent), 0) INTO total_percent
  FROM public.content_splits
  WHERE content_type = NEW.content_type 
  AND content_id = NEW.content_id
  AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
  
  -- Add the new/updated percentage
  total_percent := total_percent + NEW.percent;
  
  -- Check if total exceeds 100%
  IF total_percent > 100 THEN
    RAISE EXCEPTION 'Total split percentage cannot exceed 100 percent. Current total would be: %', total_percent;
  END IF;
  
  -- Update timestamp
  NEW.updated_at = now();
  
  RETURN NEW;
END;
$$;

-- Create function to get content split status with proper search path
CREATE OR REPLACE FUNCTION public.get_content_split_status(p_content_type TEXT, p_content_id UUID)
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_percent NUMERIC;
BEGIN
  SELECT COALESCE(SUM(percent), 0) INTO total_percent
  FROM public.content_splits
  WHERE content_type = p_content_type AND content_id = p_content_id;
  
  IF total_percent = 0 THEN
    RETURN 'not_set';
  ELSIF total_percent = 100 THEN
    RETURN 'complete';
  ELSE
    RETURN 'incomplete';
  END IF;
END;
$$;

-- Recreate trigger
CREATE TRIGGER validate_content_splits_trigger
  BEFORE INSERT OR UPDATE ON public.content_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_content_splits();
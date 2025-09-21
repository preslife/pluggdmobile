-- Fix security warnings by setting search_path for existing functions
-- Update create_moderation_item function with proper search_path
CREATE OR REPLACE FUNCTION public.create_moderation_item(
  p_item_type TEXT,
  p_item_id UUID,
  p_severity TEXT DEFAULT 'low',
  p_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  moderation_id UUID;
BEGIN
  INSERT INTO public.moderation_items (item_type, item_id, severity, reason)
  VALUES (p_item_type, p_item_id, p_severity, p_reason)
  RETURNING id INTO moderation_id;
  
  RETURN moderation_id;
END;
$$;

-- Fix the update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
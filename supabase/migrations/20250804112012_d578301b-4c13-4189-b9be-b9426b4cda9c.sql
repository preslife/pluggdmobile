-- Add licensing system fields to beats table
ALTER TABLE public.beats 
ADD COLUMN available_licenses JSONB DEFAULT '[]'::jsonb,
ADD COLUMN license_prices JSONB DEFAULT '{}'::jsonb;

-- Update file size limits and add stems support
COMMENT ON COLUMN public.beats.available_licenses IS 'Array of license types this beat offers: basic_lease, premium_lease, unlimited_lease, exclusive_rights';
COMMENT ON COLUMN public.beats.license_prices IS 'Custom pricing for each license type as key-value pairs';

-- Create licensing_options table for better structure
CREATE TABLE public.licensing_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  license_type TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(beat_id, license_type)
);

-- Enable RLS on licensing_options
ALTER TABLE public.licensing_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for licensing_options
CREATE POLICY "Licensing options are viewable by everyone" 
ON public.licensing_options 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Beat owners can manage licensing options" 
ON public.licensing_options 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.beats 
  WHERE beats.id = licensing_options.beat_id 
  AND beats.user_id = auth.uid()
));

-- Add trigger for updating updated_at
CREATE TRIGGER update_licensing_options_updated_at
  BEFORE UPDATE ON public.licensing_options
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add default license types for existing beats
INSERT INTO public.licensing_options (beat_id, license_type, price)
SELECT 
  id as beat_id,
  'basic_lease' as license_type,
  CASE 
    WHEN price > 0 THEN price 
    ELSE 25 
  END as price
FROM public.beats 
WHERE is_published = true;

-- Update beats table to mark stems as required for certain licenses
ALTER TABLE public.beats 
ADD COLUMN stems_required BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.beats.stems_required IS 'Whether this beat requires stems for premium licenses';
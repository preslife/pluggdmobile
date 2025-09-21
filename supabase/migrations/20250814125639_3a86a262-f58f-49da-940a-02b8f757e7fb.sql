-- Create sample pack purchases table for tracking downloads and payments
CREATE TABLE public.sample_pack_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sample_pack_id UUID NOT NULL REFERENCES public.sample_packs(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  download_expires_at TIMESTAMP WITH TIME ZONE,
  downloads_used INTEGER DEFAULT 0,
  download_limit INTEGER DEFAULT 3,
  stripe_payment_intent_id TEXT,
  download_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sample_pack_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own purchases" 
ON public.sample_pack_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" 
ON public.sample_pack_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can manage purchases" 
ON public.sample_pack_purchases 
FOR ALL 
USING (true);

-- Create storage bucket for sample pack files
INSERT INTO storage.buckets (id, name, public) VALUES ('sample-pack-files', 'sample-pack-files', false);

-- Create storage policies for sample pack files
CREATE POLICY "Sample pack files are accessible to purchasers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sample-pack-files' AND (
  EXISTS (
    SELECT 1 FROM public.sample_pack_purchases spp
    JOIN public.sample_packs sp ON sp.id = spp.sample_pack_id
    WHERE sp.download_url = storage.objects.name 
    AND spp.user_id = auth.uid()
  ) OR
  EXISTS (
    SELECT 1 FROM public.sample_packs sp
    WHERE sp.download_url = storage.objects.name 
    AND sp.user_id = auth.uid()
  )
));

CREATE POLICY "Users can upload their own sample pack files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sample-pack-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own sample pack files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'sample-pack-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own sample pack files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'sample-pack-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update sample_packs table to use pence for GBP
ALTER TABLE public.sample_packs ADD COLUMN price_pence INTEGER DEFAULT 0;
UPDATE public.sample_packs SET price_pence = (price * 100)::INTEGER WHERE price IS NOT NULL;

-- Add missing columns for better functionality
ALTER TABLE public.sample_packs ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
ALTER TABLE public.sample_packs ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
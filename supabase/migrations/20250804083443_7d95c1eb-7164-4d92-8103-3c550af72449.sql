-- Update subscription system for beat marketplace
-- Add commission rates to user subscriptions
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 15.00;

-- Update existing subscriptions with correct commission rates
UPDATE public.user_subscriptions 
SET commission_rate = CASE 
  WHEN tier = 'free' THEN 15.00
  WHEN tier = 'creator' THEN 10.00  
  WHEN tier = 'pro' THEN 5.00
  ELSE 15.00
END;

-- Update user_usage table for beat-focused limits
ALTER TABLE public.user_usage ADD COLUMN IF NOT EXISTS beats_uploaded_total INTEGER DEFAULT 0;

-- Create contract templates table for standardized licensing agreements
CREATE TABLE public.contract_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type TEXT NOT NULL CHECK (template_type IN ('basic_lease', 'premium_lease', 'unlimited_lease', 'exclusive_rights')),
  title TEXT NOT NULL,
  description TEXT,
  legal_text TEXT NOT NULL,
  price_range_min INTEGER NOT NULL,
  price_range_max INTEGER NOT NULL,
  features JSONB DEFAULT '[]'::jsonb,
  restrictions JSONB DEFAULT '[]'::jsonb,
  deliverables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(template_type)
);

-- Create licensing contracts table for signed agreements
CREATE TABLE public.licensing_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  template_type TEXT NOT NULL REFERENCES public.contract_templates(template_type),
  license_fee DECIMAL(10,2) NOT NULL,
  contract_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  legal_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'completed', 'cancelled')),
  signed_at TIMESTAMPTZ,
  producer_signature TEXT,
  artist_signature TEXT,
  producer_ip_address TEXT,
  artist_ip_address TEXT,
  contract_pdf_url TEXT,
  transaction_id TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create contract signatures tracking table
CREATE TABLE public.contract_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES public.licensing_contracts(id) ON DELETE CASCADE,
  signer_id UUID NOT NULL,
  signer_type TEXT NOT NULL CHECK (signer_type IN ('producer', 'artist')),
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

-- Enable RLS on new tables
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensing_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_signatures ENABLE ROW LEVEL SECURITY;

-- RLS policies for contract templates
CREATE POLICY "Contract templates are viewable by everyone"
  ON public.contract_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage contract templates"
  ON public.contract_templates FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::user_role
  ));

-- RLS policies for licensing contracts
CREATE POLICY "Users can view contracts they're party to"
  ON public.licensing_contracts FOR SELECT
  USING (auth.uid() = producer_id OR auth.uid() = artist_id);

CREATE POLICY "Users can create contracts for their beats"
  ON public.licensing_contracts FOR INSERT
  WITH CHECK (
    auth.uid() = artist_id AND 
    EXISTS (SELECT 1 FROM public.beats WHERE id = beat_id AND user_id = producer_id)
  );

CREATE POLICY "Contract parties can update their contracts"
  ON public.licensing_contracts FOR UPDATE
  USING (auth.uid() = producer_id OR auth.uid() = artist_id);

CREATE POLICY "Admins can view all contracts"
  ON public.licensing_contracts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::user_role
  ));

-- RLS policies for contract signatures
CREATE POLICY "Users can view signatures for their contracts"
  ON public.contract_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.licensing_contracts 
      WHERE id = contract_id AND (producer_id = auth.uid() OR artist_id = auth.uid())
    )
  );

CREATE POLICY "Users can create their own signatures"
  ON public.contract_signatures FOR INSERT
  WITH CHECK (auth.uid() = signer_id);

-- Insert the 4 standardized contract templates
INSERT INTO public.contract_templates (template_type, title, description, legal_text, price_range_min, price_range_max, features, restrictions, deliverables) VALUES 
(
  'basic_lease',
  'Basic Lease License',
  'Perfect for new artists getting started with beat licensing',
  'BASIC LEASE LICENSE AGREEMENT\n\nEFFECTIVE DATE: {purchase_date}\nLICENSOR: {producer_name} ("Producer")\nLICENSEE: {artist_name} ("Artist")\nCOMPOSITION: {beat_title} ("Beat")\nLICENSE FEE: £{amount} GBP\n\n1. GRANT OF LICENSE\n\nProducer hereby grants to Artist a non-exclusive, limited license to use the Beat in accordance with the terms and conditions set forth herein. This license permits Artist to:\n\na) Record vocals and/or instruments over the Beat to create one (1) new musical composition ("New Song")\nb) Reproduce the New Song for distribution and sale\nc) Publicly perform the New Song\nd) Create one (1) music video featuring the New Song for non-commercial use\ne) Upload the New Song to streaming platforms including but not limited to Spotify, Apple Music, SoundCloud, YouTube, and social media platforms\n\n2. USAGE LIMITATIONS\n\nThe rights granted herein are subject to the following limitations:\n\na) Distribution Cap: Artist may distribute and sell up to ten thousand (10,000) copies of the New Song in any format (physical, digital, streaming) combined across all platforms\nb) Streaming Cap: Total streams across all platforms may not exceed ten thousand (10,000)\nc) Video Monetization: Music videos may be uploaded to YouTube and social platforms but may NOT be monetized\nd) Radio Play: New Song may NOT be broadcast on terrestrial radio, satellite radio, or internet radio\ne) Commercial Use: New Song may NOT be used for commercial advertising, TV shows, films, or video games\nf) Live Performance: Limited to venues with capacity under 500 people\n\n[Additional legal terms continue...]',
  15,
  25,
  '["Record one new song", "Up to 10,000 streams/downloads", "Non-monetized music videos", "Live performances (under 500 capacity)", "Basic track information", "Producer credit required"]',
  '["No radio broadcast", "No monetized videos", "No commercial use", "Producer tag must remain", "2-year license term"]',
  '["High-quality MP3 (320kbps)", "BPM and key information", "Production credit details"]'
),
(
  'premium_lease',
  'Premium Lease License',
  'For serious artists ready for commercial releases',
  'PREMIUM LEASE LICENSE AGREEMENT\n\nEFFECTIVE DATE: {purchase_date}\nLICENSOR: {producer_name} ("Producer")\nLICENSEE: {artist_name} ("Artist")\nCOMPOSITION: {beat_title} ("Beat")\nLICENSE FEE: £{amount} GBP\n\n1. GRANT OF LICENSE\n\nProducer hereby grants to Artist a non-exclusive license to use the Beat for commercial purposes in accordance with the terms set forth herein...\n\n[Full legal text continues...]',
  35,
  50,
  '["Record multiple songs", "Up to 100,000 streams/downloads", "Monetized content allowed", "Radio broadcast rights", "Individual track stems", "Producer tag removal", "Commercial performances", "Limited sync licensing"]',
  '["Not for major label releases", "Sync budget under £10,000", "5-year license term"]',
  '["High-quality WAV files", "Individual track stems", "MIDI files", "Mixing notes", "BPM/key information"]'
),
(
  'unlimited_lease',
  'Unlimited Lease License',
  'Comprehensive commercial license for professional use',
  'UNLIMITED LEASE LICENSE AGREEMENT\n\nEFFECTIVE DATE: {purchase_date}\nLICENSOR: {producer_name} ("Producer")\nLICENSEE: {artist_name} ("Artist")\nCOMPOSITION: {beat_title} ("Beat")\nLICENSE FEE: £{amount} GBP\n\n1. COMPREHENSIVE GRANT OF LICENSE\n\nProducer hereby grants to Artist a non-exclusive, comprehensive license to use the Beat for unlimited commercial exploitation worldwide...\n\n[Full legal text continues...]',
  75,
  150,
  '["Unlimited streams/downloads", "Major label distribution", "High-value sync licensing", "International exploitation", "Complete stem package", "MIDI data included", "Perpetual license", "Producer tag removal", "Remix rights", "Commercial advertising use"]',
  '["Non-exclusive license", "Producer retains publishing rights"]',
  '["Premium WAV files (24-bit/48kHz)", "Complete multitrack stems", "MIDI files", "Production documentation", "Multiple format exports", "Alternative mixes"]'
),
(
  'exclusive_rights',
  'Exclusive Rights Purchase',
  'Complete ownership transfer of the beat',
  'EXCLUSIVE RIGHTS PURCHASE AGREEMENT\n\nEFFECTIVE DATE: {purchase_date}\nLICENSOR: {producer_name} ("Producer")\nPURCHASER: {artist_name} ("Purchaser")\nCOMPOSITION: {beat_title} ("Beat")\nPURCHASE PRICE: £{amount} GBP\n\n1. EXCLUSIVE GRANT AND ASSIGNMENT\n\nFor valuable consideration, Producer hereby grants, assigns, and transfers to Purchaser the EXCLUSIVE and irrevocable rights to the Beat...\n\n[Full legal text continues...]',
  300,
  2000,
  '["Complete ownership transfer", "Beat removed from all platforms", "All source files included", "Copyright registration rights", "100% publishing control", "Unlimited commercial use", "No future licensing by producer", "Custom terms negotiable"]',
  '["Existing non-exclusive licenses remain valid", "Producer credit required"]',
  '["All master files", "Complete multitrack package", "Source materials", "MIDI data", "Project files", "Documentation package", "Copyright assignment docs"]'
);

-- Create function to get tier limits including commission rates
CREATE OR REPLACE FUNCTION public.get_user_tier_limits(user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_tier subscription_tier;
  tier_limits jsonb;
BEGIN
  SELECT tier INTO user_tier
  FROM public.user_subscriptions
  WHERE user_subscriptions.user_id = $1
  AND status = 'active';
  
  user_tier := COALESCE(user_tier, 'free');
  
  tier_limits := CASE user_tier
    WHEN 'free' THEN jsonb_build_object(
      'beats_upload_limit', 10,
      'commission_rate', 15.00,
      'tier_name', 'FREE'
    )
    WHEN 'creator' THEN jsonb_build_object(
      'beats_upload_limit', 100, 
      'commission_rate', 10.00,
      'tier_name', 'PRO'
    )
    WHEN 'pro' THEN jsonb_build_object(
      'beats_upload_limit', -1,
      'commission_rate', 5.00,
      'tier_name', 'PREMIUM'
    )
    ELSE jsonb_build_object(
      'beats_upload_limit', 10,
      'commission_rate', 15.00,
      'tier_name', 'FREE'
    )
  END;
  
  RETURN tier_limits;
END;
$$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE TRIGGER update_contract_templates_updated_at
  BEFORE UPDATE ON public.contract_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_licensing_contracts_updated_at
  BEFORE UPDATE ON public.licensing_contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
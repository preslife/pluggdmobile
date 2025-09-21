-- Add new fields to beats table for enhanced upload
ALTER TABLE public.beats 
ADD COLUMN moods text[] DEFAULT '{}',
ADD COLUMN instruments text[] DEFAULT '{}',
ADD COLUMN stems_url text,
ADD COLUMN tagged_url text,
ADD COLUMN license_types jsonb DEFAULT '{}';

-- Create license_templates table for managing license types
CREATE TABLE public.license_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  license_type text NOT NULL,
  description text,
  terms text,
  price numeric NOT NULL DEFAULT 0,
  file_types text[] NOT NULL DEFAULT '{mp3}',
  usage_rights jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create beat_licenses table to link beats to license templates
CREATE TABLE public.beat_licenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  license_template_id uuid NOT NULL REFERENCES public.license_templates(id) ON DELETE CASCADE,
  price_override numeric,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create beat_collaborators table for managing collaborations
CREATE TABLE public.beat_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  beat_id uuid NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  collaborator_name text NOT NULL,
  collaborator_email text,
  collaborator_user_id uuid,
  role text NOT NULL DEFAULT 'collaborator',
  profit_share_percentage numeric NOT NULL DEFAULT 0,
  publishing_share_percentage numeric NOT NULL DEFAULT 0,
  content_id_percentage numeric NOT NULL DEFAULT 0,
  is_confirmed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create payout_records table for tracking payouts to producers
CREATE TABLE public.payout_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount numeric NOT NULL,
  payout_method text NOT NULL DEFAULT 'stripe',
  payout_status text NOT NULL DEFAULT 'pending',
  payout_reference text,
  beat_id uuid REFERENCES public.beats(id),
  purchase_id uuid REFERENCES public.purchases(id),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.license_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beat_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies for license_templates
CREATE POLICY "Users can manage their own license templates" ON public.license_templates
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "License templates are viewable by everyone" ON public.license_templates
FOR SELECT USING (is_active = true);

-- RLS Policies for beat_licenses
CREATE POLICY "Beat owners can manage beat licenses" ON public.beat_licenses
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.beats 
  WHERE beats.id = beat_licenses.beat_id 
  AND beats.user_id = auth.uid()
));

CREATE POLICY "Beat licenses are viewable by everyone" ON public.beat_licenses
FOR SELECT USING (is_active = true);

-- RLS Policies for beat_collaborators
CREATE POLICY "Beat owners can manage collaborators" ON public.beat_collaborators
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.beats 
  WHERE beats.id = beat_collaborators.beat_id 
  AND beats.user_id = auth.uid()
));

CREATE POLICY "Collaborators can view their own collaborations" ON public.beat_collaborators
FOR SELECT USING (
  auth.uid() = collaborator_user_id OR 
  EXISTS (
    SELECT 1 FROM public.beats 
    WHERE beats.id = beat_collaborators.beat_id 
    AND beats.user_id = auth.uid()
  )
);

-- RLS Policies for payout_records
CREATE POLICY "Users can view their own payout records" ON public.payout_records
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create payout records" ON public.payout_records
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all payout records" ON public.payout_records
FOR ALL USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'
));

-- Add indexes for performance
CREATE INDEX idx_license_templates_user_id ON public.license_templates(user_id);
CREATE INDEX idx_license_templates_active ON public.license_templates(is_active);
CREATE INDEX idx_beat_licenses_beat_id ON public.beat_licenses(beat_id);
CREATE INDEX idx_beat_licenses_template_id ON public.beat_licenses(license_template_id);
CREATE INDEX idx_beat_collaborators_beat_id ON public.beat_collaborators(beat_id);
CREATE INDEX idx_beat_collaborators_user_id ON public.beat_collaborators(collaborator_user_id);
CREATE INDEX idx_payout_records_user_id ON public.payout_records(user_id);
CREATE INDEX idx_payout_records_status ON public.payout_records(payout_status);

-- Add updated_at triggers
CREATE TRIGGER update_license_templates_updated_at
  BEFORE UPDATE ON public.license_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_beat_collaborators_updated_at
  BEFORE UPDATE ON public.beat_collaborators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Create download_events table for DRM-light functionality
CREATE TABLE public.download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_id UUID NOT NULL,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('beat', 'release', 'sample_pack')),
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.download_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own download events
CREATE POLICY "Users can view their own download events" 
ON public.download_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert download events
CREATE POLICY "System can insert download events" 
ON public.download_events 
FOR INSERT 
WITH CHECK (true);

-- Admins can view all download events
CREATE POLICY "Admins can view all download events" 
ON public.download_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));
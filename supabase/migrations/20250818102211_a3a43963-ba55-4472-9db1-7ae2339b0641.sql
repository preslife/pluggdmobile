-- Create webhook_endpoints table
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own webhook endpoints" 
ON public.webhook_endpoints 
FOR ALL 
USING (auth.uid() = user_id);

-- Create webhook_deliveries table
CREATE TABLE public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view deliveries for their endpoints" 
ON public.webhook_deliveries 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.webhook_endpoints 
  WHERE webhook_endpoints.id = webhook_deliveries.endpoint_id 
  AND webhook_endpoints.user_id = auth.uid()
));

-- Create smartlinks table
CREATE TABLE public.smartlinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  release_id UUID,
  beat_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smartlinks ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own smartlinks" 
ON public.smartlinks 
FOR ALL 
USING (auth.uid() = user_id);

CREATE POLICY "Smartlinks are viewable by everyone" 
ON public.smartlinks 
FOR SELECT 
USING (is_active = true);

-- Create updated_at trigger for webhook_endpoints
CREATE TRIGGER update_webhook_endpoints_updated_at
BEFORE UPDATE ON public.webhook_endpoints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for smartlinks
CREATE TRIGGER update_smartlinks_updated_at
BEFORE UPDATE ON public.smartlinks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
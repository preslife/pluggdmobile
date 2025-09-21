-- Create beat_sales table to track individual beat sales
CREATE TABLE public.beat_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beat_id UUID REFERENCES public.beats(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL,
  license_type TEXT NOT NULL DEFAULT 'basic',
  sale_price NUMERIC NOT NULL,
  commission_rate NUMERIC NOT NULL DEFAULT 15.00,
  producer_earnings NUMERIC NOT NULL,
  platform_fee NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  payout_status TEXT NOT NULL DEFAULT 'pending',
  payout_id UUID REFERENCES public.payout_records(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create producer_earnings table for aggregated earnings data
CREATE TABLE public.producer_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  pending_earnings NUMERIC NOT NULL DEFAULT 0,
  paid_earnings NUMERIC NOT NULL DEFAULT 0,
  beats_sold_count INTEGER NOT NULL DEFAULT 0,
  total_sales_volume NUMERIC NOT NULL DEFAULT 0,
  monthly_revenue NUMERIC NOT NULL DEFAULT 0,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(producer_id, date_recorded)
);

-- Enable RLS on both tables
ALTER TABLE public.beat_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producer_earnings ENABLE ROW LEVEL SECURITY;

-- RLS policies for beat_sales
CREATE POLICY "Producers can view their own beat sales" 
ON public.beat_sales FOR SELECT 
USING (auth.uid() = producer_id);

CREATE POLICY "Buyers can view their purchases" 
ON public.beat_sales FOR SELECT 
USING (auth.uid() = buyer_id);

CREATE POLICY "System can insert beat sales" 
ON public.beat_sales FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update beat sales" 
ON public.beat_sales FOR UPDATE 
USING (true);

CREATE POLICY "Admins can manage all beat sales" 
ON public.beat_sales FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- RLS policies for producer_earnings
CREATE POLICY "Producers can view their own earnings" 
ON public.producer_earnings FOR SELECT 
USING (auth.uid() = producer_id);

CREATE POLICY "System can manage producer earnings" 
ON public.producer_earnings FOR ALL 
USING (true);

CREATE POLICY "Admins can view all producer earnings" 
ON public.producer_earnings FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Function to update producer earnings aggregations
CREATE OR REPLACE FUNCTION public.update_producer_earnings()
RETURNS TRIGGER AS $$
DECLARE
  producer_uuid UUID;
  current_date DATE := CURRENT_DATE;
BEGIN
  -- Get producer_id from the operation
  IF TG_OP = 'INSERT' THEN
    producer_uuid := NEW.producer_id;
  ELSIF TG_OP = 'UPDATE' THEN
    producer_uuid := NEW.producer_id;
  ELSIF TG_OP = 'DELETE' THEN
    producer_uuid := OLD.producer_id;
  END IF;

  -- Calculate aggregated earnings for this producer
  INSERT INTO public.producer_earnings (
    producer_id,
    date_recorded,
    total_earnings,
    pending_earnings,
    paid_earnings,
    beats_sold_count,
    total_sales_volume,
    monthly_revenue,
    commission_earned
  )
  SELECT 
    producer_uuid,
    current_date,
    COALESCE(SUM(producer_earnings), 0) as total_earnings,
    COALESCE(SUM(CASE WHEN payout_status = 'pending' THEN producer_earnings ELSE 0 END), 0) as pending_earnings,
    COALESCE(SUM(CASE WHEN payout_status = 'paid' THEN producer_earnings ELSE 0 END), 0) as paid_earnings,
    COUNT(*) as beats_sold_count,
    COALESCE(SUM(sale_price), 0) as total_sales_volume,
    COALESCE(SUM(CASE WHEN DATE_TRUNC('month', created_at) = DATE_TRUNC('month', current_date) THEN producer_earnings ELSE 0 END), 0) as monthly_revenue,
    COALESCE(SUM(platform_fee), 0) as commission_earned
  FROM public.beat_sales 
  WHERE producer_id = producer_uuid
  ON CONFLICT (producer_id, date_recorded) 
  DO UPDATE SET
    total_earnings = EXCLUDED.total_earnings,
    pending_earnings = EXCLUDED.pending_earnings,
    paid_earnings = EXCLUDED.paid_earnings,
    beats_sold_count = EXCLUDED.beats_sold_count,
    total_sales_volume = EXCLUDED.total_sales_volume,
    monthly_revenue = EXCLUDED.monthly_revenue,
    commission_earned = EXCLUDED.commission_earned,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update producer earnings when beat sales change
CREATE TRIGGER update_producer_earnings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.beat_sales
  FOR EACH ROW EXECUTE FUNCTION public.update_producer_earnings();

-- Function to get producer earnings summary
CREATE OR REPLACE FUNCTION public.get_producer_earnings_summary(p_producer_id UUID)
RETURNS JSON AS $$
DECLARE
  earnings_summary JSON;
BEGIN
  SELECT json_build_object(
    'total_earnings', COALESCE(SUM(total_earnings), 0),
    'pending_earnings', COALESCE(SUM(pending_earnings), 0),
    'paid_earnings', COALESCE(SUM(paid_earnings), 0),
    'this_month_earnings', COALESCE(SUM(monthly_revenue), 0),
    'total_sales_count', COALESCE(SUM(beats_sold_count), 0),
    'total_sales_volume', COALESCE(SUM(total_sales_volume), 0)
  ) INTO earnings_summary
  FROM public.producer_earnings
  WHERE producer_id = p_producer_id;
  
  RETURN earnings_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX idx_beat_sales_producer_id ON public.beat_sales(producer_id);
CREATE INDEX idx_beat_sales_created_at ON public.beat_sales(created_at);
CREATE INDEX idx_beat_sales_payout_status ON public.beat_sales(payout_status);
CREATE INDEX idx_producer_earnings_producer_id ON public.producer_earnings(producer_id);
CREATE INDEX idx_producer_earnings_date ON public.producer_earnings(date_recorded);
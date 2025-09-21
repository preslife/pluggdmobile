-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.update_producer_earnings()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_producer_earnings_summary(p_producer_id UUID)
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
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
$$;
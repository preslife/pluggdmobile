-- Create content_splits table for unified royalty split management
CREATE TABLE public.content_splits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL CHECK (content_type IN ('beat', 'pack', 'release')),
  content_id UUID NOT NULL,
  payee_user_id UUID NOT NULL,
  percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_type, content_id, payee_user_id)
);

-- Enable RLS
ALTER TABLE public.content_splits ENABLE ROW LEVEL SECURITY;

-- Create policies for content splits
CREATE POLICY "Users can view splits for their content or if they are a payee" ON public.content_splits
FOR SELECT
USING (
  payee_user_id = auth.uid() OR
  (content_type = 'beat' AND EXISTS (SELECT 1 FROM beats WHERE id = content_id AND user_id = auth.uid())) OR
  (content_type = 'release' AND EXISTS (SELECT 1 FROM releases WHERE id = content_id AND user_id = auth.uid())) OR
  (content_type = 'pack' AND EXISTS (SELECT 1 FROM sample_packs WHERE id = content_id AND user_id = auth.uid()))
);

CREATE POLICY "Content owners can manage splits" ON public.content_splits
FOR ALL
USING (
  (content_type = 'beat' AND EXISTS (SELECT 1 FROM beats WHERE id = content_id AND user_id = auth.uid())) OR
  (content_type = 'release' AND EXISTS (SELECT 1 FROM releases WHERE id = content_id AND user_id = auth.uid())) OR
  (content_type = 'pack' AND EXISTS (SELECT 1 FROM sample_packs WHERE id = content_id AND user_id = auth.uid()))
);

-- Extend creator_metrics table with new analytics fields
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS sales_count INTEGER DEFAULT 0;
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS sales_revenue_cents INTEGER DEFAULT 0;
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS subs_active INTEGER DEFAULT 0;
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS subs_mrr_cents INTEGER DEFAULT 0;
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS battle_revenue_cents INTEGER DEFAULT 0;
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS event_revenue_cents INTEGER DEFAULT 0;
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS post_likes INTEGER DEFAULT 0;
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS post_comments INTEGER DEFAULT 0;
ALTER TABLE public.creator_metrics ADD COLUMN IF NOT EXISTS plays_count INTEGER DEFAULT 0;

-- Extend producer_payouts table for dispute handling
ALTER TABLE public.producer_payouts ADD COLUMN IF NOT EXISTS adjusted_amount_cents INTEGER;
ALTER TABLE public.producer_payouts ADD COLUMN IF NOT EXISTS admin_note TEXT;

-- Create validation function for content splits
CREATE OR REPLACE FUNCTION public.validate_content_splits()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create trigger for validation
CREATE TRIGGER validate_content_splits_trigger
  BEFORE INSERT OR UPDATE ON public.content_splits
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_content_splits();

-- Create function to get content split status
CREATE OR REPLACE FUNCTION public.get_content_split_status(p_content_type TEXT, p_content_id UUID)
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
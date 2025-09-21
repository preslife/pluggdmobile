-- P) Advanced PLUG Automation v2: Create plug_schedules table
CREATE TYPE automation_type AS ENUM ('scheduled_post', 'auto_reply', 'smart_drop');

CREATE TABLE public.plug_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  automation_type automation_type NOT NULL,
  config_json JSONB NOT NULL DEFAULT '{}',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Q) Battle Monetization: Extend battles table
ALTER TABLE public.battles 
ADD COLUMN entry_fee_cents INTEGER,
ADD COLUMN prize_pool_cents INTEGER DEFAULT 0;

-- Q) Battle Monetization: Create battle_transactions table  
CREATE TYPE transaction_type AS ENUM ('entry', 'payout');

CREATE TABLE public.battle_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES public.battles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount_cents INTEGER NOT NULL,
  type transaction_type NOT NULL,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- R) Event Streaming v2: Extend events table
ALTER TABLE public.events
ADD COLUMN stream_provider TEXT,
ADD COLUMN stream_url TEXT, 
ADD COLUMN playback_url TEXT;

-- S) Creator Revenue Dashboard: Extend creator_metrics table
ALTER TABLE public.creator_metrics
ADD COLUMN battle_revenue_cents INTEGER DEFAULT 0,
ADD COLUMN event_revenue_cents INTEGER DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.plug_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plug_schedules
CREATE POLICY "Users can manage their own schedules" ON public.plug_schedules
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for battle_transactions  
CREATE POLICY "Users can view their own transactions" ON public.battle_transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System can create transactions" ON public.battle_transactions
  FOR INSERT WITH CHECK (true);

-- Triggers
CREATE TRIGGER update_plug_schedules_updated_at
  BEFORE UPDATE ON public.plug_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
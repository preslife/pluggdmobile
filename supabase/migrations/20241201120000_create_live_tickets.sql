-- Create live_tickets table for ticketed live sessions
CREATE TABLE IF NOT EXISTS public.live_tickets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.session_rooms(id) ON DELETE CASCADE,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  price_cents integer NOT NULL DEFAULT 0,
  inventory integer NOT NULL DEFAULT 0,
  tickets_sold integer NOT NULL DEFAULT 0,
  max_per_user integer,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'sold_out', 'ended')),
  tiers text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_live_tickets_session_id ON public.live_tickets(session_id);
CREATE INDEX IF NOT EXISTS idx_live_tickets_host_id ON public.live_tickets(host_id);
CREATE INDEX IF NOT EXISTS idx_live_tickets_status ON public.live_tickets(status);

-- Create live_ticket_purchases table to track who bought tickets
CREATE TABLE IF NOT EXISTS public.live_ticket_purchases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid NOT NULL REFERENCES public.live_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1,
  amount_paid integer NOT NULL DEFAULT 0,
  stripe_payment_intent_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'cancelled')),
  purchased_at timestamp with time zone DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_ticket_id ON public.live_ticket_purchases(ticket_id);
CREATE INDEX IF NOT EXISTS idx_live_ticket_purchases_user_id ON public.live_ticket_purchases(user_id);

-- Enable RLS
ALTER TABLE public.live_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_ticket_purchases ENABLE ROW LEVEL SECURITY;

-- Policies for live_tickets
CREATE POLICY "Anyone can view active tickets" ON public.live_tickets
  FOR SELECT USING (status = 'active' OR host_id = auth.uid());

CREATE POLICY "Hosts can manage their own tickets" ON public.live_tickets
  FOR ALL USING (host_id = auth.uid());

-- Policies for live_ticket_purchases
CREATE POLICY "Users can view their own purchases" ON public.live_ticket_purchases
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create purchases for themselves" ON public.live_ticket_purchases
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Function to increment tickets_sold
CREATE OR REPLACE FUNCTION public.increment_tickets_sold()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    UPDATE public.live_tickets
    SET tickets_sold = tickets_sold + NEW.quantity
    WHERE id = NEW.ticket_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update tickets_sold on purchase
DROP TRIGGER IF EXISTS trg_increment_tickets_sold ON public.live_ticket_purchases;
CREATE TRIGGER trg_increment_tickets_sold
  AFTER INSERT OR UPDATE ON public.live_ticket_purchases
  FOR EACH ROW EXECUTE FUNCTION public.increment_tickets_sold();

COMMENT ON TABLE public.live_tickets IS 'Tickets for paid live streaming sessions';
COMMENT ON TABLE public.live_ticket_purchases IS 'Records of users who purchased live session tickets';


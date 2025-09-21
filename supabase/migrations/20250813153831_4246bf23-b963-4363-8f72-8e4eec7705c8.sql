-- Create table for commission chat messages
CREATE TABLE IF NOT EXISTS public.commission_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_id UUID NOT NULL REFERENCES public.commission_requests(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.commission_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Participants (requester or producer) can view messages for their commissions
CREATE POLICY IF NOT EXISTS "Participants can view commission messages"
ON public.commission_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.commission_requests cr
    WHERE cr.id = commission_id
      AND (cr.requester_id = auth.uid() OR cr.producer_id = auth.uid())
  )
);

-- Policy: Participants can send messages (must be the sender)
CREATE POLICY IF NOT EXISTS "Participants can insert commission messages"
ON public.commission_messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.commission_requests cr
    WHERE cr.id = commission_id
      AND (cr.requester_id = auth.uid() OR cr.producer_id = auth.uid())
  )
);

-- Optional: allow sender to delete their own messages
CREATE POLICY IF NOT EXISTS "Sender can delete own commission messages"
ON public.commission_messages
FOR DELETE
USING (sender_id = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_commission_messages_commission_id_created_at
ON public.commission_messages (commission_id, created_at);

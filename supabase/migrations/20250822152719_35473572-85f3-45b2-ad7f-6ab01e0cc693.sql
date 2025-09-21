-- Create contest_reminders table
CREATE TABLE public.contest_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reminded_at TIMESTAMP WITH TIME ZONE NULL,
  UNIQUE(contest_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.contest_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reminders"
ON public.contest_reminders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reminders"
ON public.contest_reminders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders"
ON public.contest_reminders
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for efficient queries
CREATE INDEX idx_contest_reminders_contest_id ON public.contest_reminders(contest_id);
CREATE INDEX idx_contest_reminders_user_id ON public.contest_reminders(user_id);
CREATE INDEX idx_contest_reminders_reminded_at ON public.contest_reminders(reminded_at);
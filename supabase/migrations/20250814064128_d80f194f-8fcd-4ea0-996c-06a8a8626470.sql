-- Create monthly challenges system
CREATE TABLE public.monthly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  theme TEXT,
  rules TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  voting_end_date DATE,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'voting', 'completed')),
  prize_description TEXT,
  winner_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.monthly_challenges ENABLE ROW LEVEL SECURITY;

-- RLS policies for monthly challenges
CREATE POLICY "Monthly challenges are viewable by everyone" 
ON public.monthly_challenges 
FOR SELECT 
USING (true);

CREATE POLICY "Only admins can manage monthly challenges" 
ON public.monthly_challenges 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_roles.user_id = auth.uid() 
  AND user_roles.role = 'admin'::user_role
));

-- Create challenge submissions table
CREATE TABLE public.challenge_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.monthly_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  beat_id UUID,
  submission_url TEXT,
  submission_title TEXT NOT NULL,
  submission_description TEXT,
  votes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenge submissions
CREATE POLICY "Challenge submissions are viewable by everyone" 
ON public.challenge_submissions 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create their own challenge submissions" 
ON public.challenge_submissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own challenge submissions" 
ON public.challenge_submissions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create challenge votes table
CREATE TABLE public.challenge_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.monthly_challenges(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, voter_id)
);

-- Enable RLS
ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenge votes
CREATE POLICY "Challenge votes are viewable by everyone" 
ON public.challenge_votes 
FOR SELECT 
USING (true);

CREATE POLICY "Users can vote in challenges" 
ON public.challenge_votes 
FOR INSERT 
WITH CHECK (auth.uid() = voter_id);

-- Function to update submission vote counts
CREATE OR REPLACE FUNCTION update_submission_votes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE challenge_submissions 
    SET votes_count = votes_count + 1 
    WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE challenge_submissions 
    SET votes_count = votes_count - 1 
    WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update vote counts
CREATE TRIGGER update_submission_votes_trigger
  AFTER INSERT OR DELETE ON challenge_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_submission_votes();

-- Function to auto-update challenge status
CREATE OR REPLACE FUNCTION update_challenge_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update status based on dates
  UPDATE monthly_challenges 
  SET status = CASE
    WHEN CURRENT_DATE < start_date THEN 'upcoming'
    WHEN CURRENT_DATE >= start_date AND CURRENT_DATE <= end_date THEN 'active'
    WHEN CURRENT_DATE > end_date AND CURRENT_DATE <= COALESCE(voting_end_date, end_date + INTERVAL '7 days') THEN 'voting'
    ELSE 'completed'
  END
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update status on insert/update
CREATE TRIGGER auto_update_challenge_status
  AFTER INSERT OR UPDATE ON monthly_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_challenge_status();

-- Add indexes for performance
CREATE INDEX idx_challenge_submissions_challenge_id ON challenge_submissions(challenge_id);
CREATE INDEX idx_challenge_submissions_user_id ON challenge_submissions(user_id);
CREATE INDEX idx_challenge_votes_challenge_id ON challenge_votes(challenge_id);
CREATE INDEX idx_challenge_votes_submission_id ON challenge_votes(submission_id);
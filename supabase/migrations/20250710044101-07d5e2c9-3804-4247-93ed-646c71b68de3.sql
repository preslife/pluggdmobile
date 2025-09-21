-- Create user achievements table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  points_awarded INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user stats table for gamification
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  beats_uploaded INTEGER DEFAULT 0,
  beats_purchased INTEGER DEFAULT 0,
  beats_sold INTEGER DEFAULT 0,
  collaborations_completed INTEGER DEFAULT 0,
  days_active INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_active_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contests table
CREATE TABLE public.contests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  contest_type TEXT NOT NULL CHECK (contest_type IN ('weekly_challenge', 'monthly_contest', 'community_vote')),
  genre TEXT,
  theme TEXT,
  rules TEXT,
  prize_description TEXT,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  voting_end_date TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'voting', 'completed')),
  max_submissions INTEGER DEFAULT 1,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contest submissions table
CREATE TABLE public.contest_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  submission_title TEXT,
  submission_description TEXT,
  votes_count INTEGER DEFAULT 0,
  rank INTEGER,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contest_id, user_id, beat_id)
);

-- Create contest votes table
CREATE TABLE public.contest_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  submission_id UUID NOT NULL REFERENCES public.contest_submissions(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(contest_id, submission_id, voter_id)
);

-- Enable RLS
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contest_votes ENABLE ROW LEVEL SECURITY;

-- User achievements policies
CREATE POLICY "Users can view their own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view others' achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "System can create achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);

-- User stats policies
CREATE POLICY "Users can view their own stats" ON public.user_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view others' stats" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "System can manage stats" ON public.user_stats FOR ALL USING (true);

-- Contest policies
CREATE POLICY "Everyone can view active contests" ON public.contests FOR SELECT USING (true);
CREATE POLICY "Admins can manage contests" ON public.contests FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Contest submission policies
CREATE POLICY "Users can view all submissions" ON public.contest_submissions FOR SELECT USING (true);
CREATE POLICY "Users can create their own submissions" ON public.contest_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own submissions" ON public.contest_submissions FOR UPDATE USING (auth.uid() = user_id);

-- Contest vote policies
CREATE POLICY "Users can view all votes" ON public.contest_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.contest_votes FOR INSERT WITH CHECK (auth.uid() = voter_id);

-- Add triggers for timestamps
CREATE TRIGGER update_user_stats_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contests_updated_at
BEFORE UPDATE ON public.contests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update user stats
CREATE OR REPLACE FUNCTION public.update_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update stats when beats are uploaded
  IF TG_TABLE_NAME = 'beats' AND TG_OP = 'INSERT' THEN
    INSERT INTO public.user_stats (user_id, beats_uploaded)
    VALUES (NEW.user_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      beats_uploaded = user_stats.beats_uploaded + 1,
      total_points = user_stats.total_points + 10,
      updated_at = now();
  END IF;

  -- Update stats when purchases are made
  IF TG_TABLE_NAME = 'purchases' AND TG_OP = 'INSERT' THEN
    -- Update buyer stats
    INSERT INTO public.user_stats (user_id, beats_purchased)
    VALUES (NEW.buyer_id, 1)
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      beats_purchased = user_stats.beats_purchased + 1,
      total_points = user_stats.total_points + 5,
      updated_at = now();
      
    -- Update seller stats
    INSERT INTO public.user_stats (user_id, beats_sold)
    SELECT NEW.user_id, 1
    FROM public.beats 
    WHERE id = NEW.beat_id
    ON CONFLICT (user_id) 
    DO UPDATE SET 
      beats_sold = user_stats.beats_sold + 1,
      total_points = user_stats.total_points + 15,
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating stats
CREATE TRIGGER update_stats_on_beat_upload
AFTER INSERT ON public.beats
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats();

CREATE TRIGGER update_stats_on_purchase
AFTER INSERT ON public.purchases
FOR EACH ROW
EXECUTE FUNCTION public.update_user_stats();
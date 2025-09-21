-- Phase 2: Battles System Database Schema (adjusted)

-- Battles table
CREATE TABLE public.battles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'live', 'finished')),
  created_by UUID NOT NULL,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Battle entries (submissions)
CREATE TABLE public.battle_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Battle rounds
CREATE TABLE public.battle_rounds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Battle matchups
CREATE TABLE public.battle_matchups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  entry_a_id UUID NOT NULL REFERENCES public.battle_entries(id) ON DELETE CASCADE,
  entry_b_id UUID NOT NULL REFERENCES public.battle_entries(id) ON DELETE CASCADE,
  winner_entry_id UUID REFERENCES public.battle_entries(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Battle votes
CREATE TABLE public.battle_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  battle_id UUID NOT NULL REFERENCES public.battles(id) ON DELETE CASCADE,
  matchup_id UUID NOT NULL REFERENCES public.battle_matchups(id) ON DELETE CASCADE,
  voter_user_id UUID NOT NULL,
  entry_id UUID NOT NULL REFERENCES public.battle_entries(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(voter_user_id, matchup_id)
);

-- Add content gating columns to existing tables
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS perk_access TEXT DEFAULT 'public' CHECK (perk_access IN ('public', 'subscribers', 'tier:pro', 'tier:premium'));

-- RLS Policies for battles
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_matchups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_votes ENABLE ROW LEVEL SECURITY;

-- Battles policies
CREATE POLICY "Everyone can view battles" ON public.battles FOR SELECT USING (true);
CREATE POLICY "Admins can manage battles" ON public.battles FOR ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'::user_role)
);

-- Battle entries policies
CREATE POLICY "Everyone can view battle entries" ON public.battle_entries FOR SELECT USING (true);
CREATE POLICY "Users can create their own entries" ON public.battle_entries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Battle rounds policies
CREATE POLICY "Everyone can view battle rounds" ON public.battle_rounds FOR SELECT USING (true);
CREATE POLICY "System can manage rounds" ON public.battle_rounds FOR ALL USING (true);

-- Battle matchups policies
CREATE POLICY "Everyone can view battle matchups" ON public.battle_matchups FOR SELECT USING (true);
CREATE POLICY "System can manage matchups" ON public.battle_matchups FOR ALL USING (true);

-- Battle votes policies
CREATE POLICY "Everyone can view battle votes" ON public.battle_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.battle_votes FOR INSERT WITH CHECK (auth.uid() = voter_user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_battles_updated_at 
  BEFORE UPDATE ON public.battles 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for battle audio if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('battle-audio', 'battle-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for battle audio
CREATE POLICY "Anyone can view battle audio" ON storage.objects FOR SELECT USING (bucket_id = 'battle-audio');
CREATE POLICY "Users can upload battle audio" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'battle-audio' AND auth.uid()::text = (storage.foldername(name))[1]
);
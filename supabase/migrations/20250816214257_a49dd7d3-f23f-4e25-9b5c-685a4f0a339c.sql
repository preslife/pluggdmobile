-- Phase 1 & 2: Fix Critical RLS Recursion Issues and Security (Fixed)

-- Create security definer functions to break circular dependencies
CREATE OR REPLACE FUNCTION public.get_user_session_role(p_session_id uuid, p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role text;
  is_host boolean;
BEGIN
  -- Check if user is the host
  SELECT (host_id = p_user_id) INTO is_host
  FROM sessions 
  WHERE id = p_session_id;
  
  IF is_host THEN
    RETURN 'host';
  END IF;
  
  -- Check if user is a member and get their role
  SELECT role INTO user_role
  FROM session_members
  WHERE session_id = p_session_id AND user_id = p_user_id;
  
  RETURN COALESCE(user_role, 'none');
END;
$$;

CREATE OR REPLACE FUNCTION public.can_access_session(p_session_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  session_public boolean;
  user_role text;
BEGIN
  -- Get session visibility
  SELECT is_public INTO session_public
  FROM sessions 
  WHERE id = p_session_id;
  
  -- If session is public, anyone can view
  IF session_public THEN
    RETURN true;
  END IF;
  
  -- Check user's role in the session
  user_role := public.get_user_session_role(p_session_id, p_user_id);
  
  RETURN user_role != 'none';
END;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members and hosts can view members" ON session_members;
DROP POLICY IF EXISTS "Members can view messages" ON session_messages;
DROP POLICY IF EXISTS "Members can create messages" ON session_messages;

-- Create new secure policies using security definer functions
CREATE POLICY "Members and hosts can view members"
ON session_members FOR SELECT
USING (public.can_access_session(session_id, auth.uid()));

CREATE POLICY "Members can view messages"
ON session_messages FOR SELECT
USING (public.can_access_session(session_id, auth.uid()));

CREATE POLICY "Members can create messages"
ON session_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  public.get_user_session_role(session_id, auth.uid()) != 'none'
);

-- Fix profiles table RLS - make it properly restricted
DROP POLICY IF EXISTS "Anyone can view public profiles" ON profiles;
CREATE POLICY "Users can view profiles when authenticated"
ON profiles FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Secure beat collaborators financial data
DROP POLICY IF EXISTS "Collaborators can view their own collaborations" ON beat_collaborators;
CREATE POLICY "Collaborators can view basic collaboration info"
ON beat_collaborators FOR SELECT
USING (
  auth.uid() = collaborator_user_id OR 
  EXISTS (
    SELECT 1 FROM beats 
    WHERE beats.id = beat_collaborators.beat_id 
    AND beats.user_id = auth.uid()
  )
);

-- Ensure proper contest data exists
INSERT INTO contests (
  title,
  description,
  contest_type,
  genre,
  start_date,
  end_date,
  voting_end_date,
  status,
  prize_description,
  theme,
  rules
) VALUES 
(
  'Beat Battle February 2025',
  'Monthly beat making competition - show us your best trap beats!',
  'beat_battle',
  'trap',
  now() + interval '1 day',
  now() + interval '14 days',
  now() + interval '21 days',
  'upcoming',
  '£500 cash prize + featured placement',
  'Dark Trap Vibes',
  'Submit original beats only. Max 3 minutes length. One submission per user.'
),
(
  'Lo-Fi Challenge March 2025',
  'Create the most chill lo-fi hip hop beat',
  'beat_battle',
  'lo-fi',
  now() + interval '15 days',
  now() + interval '28 days',
  now() + interval '35 days',
  'upcoming',
  '£300 cash prize + sample pack bundle',
  'Midnight Study Sessions',
  'Lo-fi hip hop only. BPM between 60-90. Include vinyl crackle.'
)
ON CONFLICT (title) DO NOTHING;

-- Add sample badge definitions if missing
INSERT INTO badge_definitions (
  badge_type,
  name,
  description,
  required_action,
  required_count,
  required_points,
  tier,
  is_active
) VALUES 
('first_beat', 'First Beat', 'Upload your first beat', 'beats_uploaded', 1, 0, 'bronze', true),
('beat_master', 'Beat Master', 'Upload 10 beats', 'beats_uploaded', 10, 0, 'silver', true),
('sales_starter', 'First Sale', 'Make your first beat sale', 'beats_sold', 1, 0, 'bronze', true),
('point_collector', 'Point Collector', 'Earn 100 total points', 'total_points', 0, 100, 'bronze', true),
('collaboration_king', 'Collaboration King', 'Complete 5 collaborations', 'collaborations_completed', 5, 0, 'gold', true)
ON CONFLICT (badge_type) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  required_action = EXCLUDED.required_action,
  required_count = EXCLUDED.required_count,
  required_points = EXCLUDED.required_points,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active;
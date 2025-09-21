-- Clear old contest data and create fresh 2025 contests
DELETE FROM contest_votes;
DELETE FROM contest_submissions;
DELETE FROM contests;

-- Update monthly challenges to 2025 dates
UPDATE monthly_challenges 
SET 
  start_date = '2025-01-15',
  end_date = '2025-01-31',
  voting_end_date = '2025-02-07',
  status = 'active'
WHERE id = 'de74f23b-e55f-4aa9-b4da-a1809076feac';

UPDATE monthly_challenges 
SET 
  start_date = '2025-02-01',
  end_date = '2025-02-28',
  voting_end_date = '2025-03-07',
  status = 'upcoming'
WHERE id = '8d44f7e4-138a-4f6b-aacb-225ac6d5cbd5';

-- Create new active contests for 2025
INSERT INTO contests (title, description, contest_type, start_date, end_date, voting_end_date, status, theme, prize_description, rules) VALUES
('Winter Beat Challenge 2025', 'Create a winter-themed beat using any genre', 'beat_making', '2025-01-15 00:00:00+00', '2025-01-31 23:59:59+00', '2025-02-07 23:59:59+00', 'active', 'Winter Vibes', 'Featured placement + £200 cash prize', 'Original compositions only, maximum 4 minutes'),
('Spring Collaboration Contest', 'Team up with another producer for this contest', 'collaboration', '2025-03-01 00:00:00+00', '2025-03-31 23:59:59+00', '2025-04-07 23:59:59+00', 'upcoming', 'Fresh Start', 'Studio time + distribution deal', 'Must be collaborative work between 2+ producers'),
('Producer Remix Battle', 'Remix provided stems into your own creation', 'remix', '2025-02-15 00:00:00+00', '2025-02-28 23:59:59+00', '2025-03-07 23:59:59+00', 'upcoming', 'Remix Masters', 'Equipment voucher + playlist placement', 'Use only provided stems, add your own elements');

-- Manually award badges for users who qualify
INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, points_awarded)
SELECT 
  us.user_id,
  'first_upload',
  'First Beat',
  'Uploaded your first beat',
  25
FROM user_stats us
WHERE us.beats_uploaded >= 1
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua 
  WHERE ua.user_id = us.user_id 
  AND ua.achievement_type = 'first_upload'
);

INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, points_awarded)
SELECT 
  us.user_id,
  'sales_starter',
  'Sales Starter', 
  'Made your first sale',
  25
FROM user_stats us
WHERE us.beats_sold >= 1
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua 
  WHERE ua.user_id = us.user_id 
  AND ua.achievement_type = 'sales_starter'
);

INSERT INTO user_achievements (user_id, achievement_type, achievement_name, description, points_awarded)
SELECT 
  us.user_id,
  'collaborator',
  'Collaborator',
  'Completed first collaboration', 
  25
FROM user_stats us
WHERE us.collaborations_completed >= 1
AND NOT EXISTS (
  SELECT 1 FROM user_achievements ua 
  WHERE ua.user_id = us.user_id 
  AND ua.achievement_type = 'collaborator'
);
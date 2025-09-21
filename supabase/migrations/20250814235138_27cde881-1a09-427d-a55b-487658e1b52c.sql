-- Fix the infinite recursion trigger issue first
DROP TRIGGER IF EXISTS monthly_challenges_update_status ON monthly_challenges;

-- Drop the problematic function 
DROP FUNCTION IF EXISTS update_challenge_status();

-- Clean up fake data only
DELETE FROM artists WHERE name IN ('NOVA BEATS', 'Luna Waves', 'BASSLINE KING');
DELETE FROM sample_packs WHERE title IN ('Trap Essentials Vol. 1', 'Lo-Fi Dreams', 'Future Bass Vibes');
-- Remove fake artists and sample packs, add minimal monthly challenges
DELETE FROM artists WHERE name IN ('NOVA BEATS', 'Luna Waves', 'BASSLINE KING');
DELETE FROM sample_packs WHERE title IN ('Trap Essentials Vol. 1', 'Lo-Fi Dreams', 'Future Bass Vibes');

-- Add minimal monthly challenges for UI functionality
INSERT INTO monthly_challenges (title, description, theme, start_date, end_date, voting_end_date, status, prize_description, rules) VALUES
('Producer Challenge #1', 'Create a beat using only vintage samples', 'Vintage Vibes', '2024-01-15', '2024-02-15', '2024-02-22', 'active', 'Featured placement + £100 cash prize', 'Original compositions only, maximum 3 minutes length'),
('Beat Battle February', 'Monthly beat battle competition', 'Open Genre', '2024-02-01', '2024-02-28', '2024-03-07', 'voting', 'Winner gets studio time + distribution deal', 'All genres welcome, collaborative entries allowed');
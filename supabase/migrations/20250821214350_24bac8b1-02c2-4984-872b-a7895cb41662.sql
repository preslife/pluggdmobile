-- Add sample data for Community Hub sections

-- Add sample announcements
INSERT INTO public.announcements (text, is_live, starts_at, ends_at) VALUES
('🎵 Welcome to the new Community Hub! Discover new music and connect with creators.', true, now() - interval '1 day', now() + interval '7 days'),
('🏆 Beat Battle February 2025 is now live! Submit your best tracks and compete for prizes.', true, now() - interval '2 hours', now() + interval '30 days'),
('📚 New mastering course now available - check out the Courses section!', true, now() - interval '1 hour', now() + interval '14 days');

-- Add sample daily prompt
INSERT INTO public.daily_prompts (text, tag, cta_text, cta_href, starts_at, ends_at) VALUES
('What''s your favorite technique for creating ambient textures in your productions? Share your tips and tricks!', 'Production', 'Share Your Tips', '/forum/daily', now() - interval '2 hours', now() + interval '22 hours');

-- Add sample quests
INSERT INTO public.quests (title, xp, is_active) VALUES
('Upload Your First Beat', 50, true),
('Complete Your Profile', 25, true),
('Join a Collaboration', 100, true),
('Get 10 Plays on a Track', 75, true),
('Leave Feedback on 5 Beats', 40, true),
('Win a Contest', 200, true);

-- Add sample radio state
INSERT INTO public.radio_state (listeners, now_track_id) VALUES
(247, null);

-- Add sample campaigns
INSERT INTO public.campaigns (owner_id, title, goal, raised, ends_at, slug, cover_url) VALUES
((SELECT user_id FROM profiles LIMIT 1), 'Support Local Music Studio', 5000, 2350, now() + interval '45 days', 'support-local-music-studio', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800'),
((SELECT user_id FROM profiles LIMIT 1), 'New Album Production Fund', 3000, 1200, now() + interval '30 days', 'new-album-production-fund', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800'),
((SELECT user_id FROM profiles LIMIT 1), 'Community Music Festival', 10000, 6500, now() + interval '60 days', 'community-music-festival', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800');
-- Create missing storage buckets for Community Hub (fixed approach)

-- Create contests bucket for contest cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('contests', 'contests', true)
ON CONFLICT (id) DO NOTHING;

-- Create campaigns bucket for campaign cover images  
INSERT INTO storage.buckets (id, name, public)
VALUES ('campaigns', 'campaigns', true)
ON CONFLICT (id) DO NOTHING;

-- Create events bucket for event cover images
INSERT INTO storage.buckets (id, name, public)
VALUES ('events', 'events', true)
ON CONFLICT (id) DO NOTHING;

-- Since the buckets are public, they should automatically allow read access
-- The main Community Hub functionality is now complete
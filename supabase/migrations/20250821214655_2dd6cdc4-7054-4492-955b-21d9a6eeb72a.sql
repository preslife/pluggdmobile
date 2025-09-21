-- Create missing storage buckets for Community Hub

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

-- Add storage policies for the new buckets
-- Contests bucket policies
INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression)
VALUES (
  'Public read access for contest covers',
  'contests', 
  'SELECT',
  'public',
  'allow',
  'true'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression)
VALUES (
  'Admins can upload contest covers',
  'contests',
  'INSERT', 
  'authenticated',
  'allow',
  'EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = ''admin''::user_role)'
) ON CONFLICT (name, bucket_id) DO NOTHING;

-- Campaigns bucket policies  
INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression)
VALUES (
  'Public read access for campaign covers',
  'campaigns',
  'SELECT',
  'public', 
  'allow',
  'true'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression)
VALUES (
  'Users can upload their own campaign covers',
  'campaigns',
  'INSERT',
  'authenticated',
  'allow', 
  'true'
) ON CONFLICT (name, bucket_id) DO NOTHING;

-- Events bucket policies
INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression)  
VALUES (
  'Public read access for event covers',
  'events',
  'SELECT',
  'public',
  'allow',
  'true'
) ON CONFLICT (name, bucket_id) DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression)
VALUES (
  'Users can upload event covers',
  'events', 
  'INSERT',
  'authenticated',
  'allow',
  'true'
) ON CONFLICT (name, bucket_id) DO NOTHING;
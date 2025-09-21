-- Create test user profile for testing
INSERT INTO public.profiles (user_id, username, full_name, bio, created_at, updated_at)
VALUES (
  'test-user-id-12345', 
  'testuser', 
  'Test User', 
  'A test user for development and testing purposes. Feel free to explore all features!',
  now(),
  now()
)
ON CONFLICT (user_id) DO NOTHING;
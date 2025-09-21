-- Create test user profile for testing with proper UUID
INSERT INTO public.profiles (user_id, username, full_name, bio, created_at, updated_at)
VALUES (
  '12345678-1234-1234-1234-123456789012', 
  'testuser', 
  'Test User', 
  'A test user for development and testing purposes. Feel free to explore all features!',
  now(),
  now()
)
ON CONFLICT (user_id) DO NOTHING;
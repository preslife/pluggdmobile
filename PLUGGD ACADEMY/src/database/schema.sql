-- Pluggd Academy Database Schema for Supabase
-- Run this in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'admin', 'instructor');
CREATE TYPE course_difficulty AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TYPE notification_type AS ENUM ('achievement', 'social', 'learning', 'system');

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role user_role DEFAULT 'student',
  profile JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);

-- Courses table
CREATE TABLE courses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  instructor_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content_blocks JSONB DEFAULT '[]',
  difficulty course_difficulty DEFAULT 'beginner',
  duration_hours INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  tags TEXT[] DEFAULT '{}',
  enrollment_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE enrollments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  completed_at TIMESTAMP WITH TIME ZONE,
  quiz_scores JSONB DEFAULT '[]',
  time_spent_minutes INTEGER DEFAULT 0,
  last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- Achievements table
CREATE TABLE achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  description TEXT,
  points_earned INTEGER DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussions table
CREATE TABLE discussions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  replies_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discussion replies table
CREATE TABLE discussion_replies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  discussion_id UUID REFERENCES discussions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User analytics table
CREATE TABLE user_analytics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  session_data JSONB DEFAULT '{}',
  learning_metrics JSONB DEFAULT '{}',
  ai_insights JSONB DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications table
CREATE TABLE notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE quizzes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  questions JSONB NOT NULL,
  passing_score INTEGER DEFAULT 70,
  time_limit_minutes INTEGER,
  attempts_allowed INTEGER DEFAULT 3,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz attempts table
CREATE TABLE quiz_attempts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  score INTEGER,
  passed BOOLEAN,
  time_taken_minutes INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study groups table
CREATE TABLE study_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  member_count INTEGER DEFAULT 1,
  max_members INTEGER DEFAULT 10,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study group members table
CREATE TABLE study_group_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id UUID REFERENCES study_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Course reviews table
CREATE TABLE course_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(course_id, user_id)
);

-- Learning paths table
CREATE TABLE learning_paths (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  course_ids UUID[],
  difficulty course_difficulty DEFAULT 'beginner',
  estimated_hours INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User learning path progress table
CREATE TABLE learning_path_progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  learning_path_id UUID REFERENCES learning_paths(id) ON DELETE CASCADE,
  current_course_index INTEGER DEFAULT 0,
  completed_courses UUID[] DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, learning_path_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_published ON courses(is_published);
CREATE INDEX idx_courses_difficulty ON courses(difficulty);
CREATE INDEX idx_enrollments_user ON enrollments(user_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_progress ON enrollments(progress);
CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_discussions_course ON discussions(course_id);
CREATE INDEX idx_discussions_user ON discussions(user_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_quiz_attempts_user ON quiz_attempts(user_id);
CREATE INDEX idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussions_updated_at BEFORE UPDATE ON discussions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discussion_replies_updated_at BEFORE UPDATE ON discussion_replies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_analytics_updated_at BEFORE UPDATE ON user_analytics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quizzes_updated_at BEFORE UPDATE ON quizzes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_course_reviews_updated_at BEFORE UPDATE ON course_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_learning_paths_updated_at BEFORE UPDATE ON learning_paths FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_path_progress ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Public courses are visible to everyone, private to enrolled users
CREATE POLICY "Published courses are public" ON courses FOR SELECT USING (is_published = true);
CREATE POLICY "Instructors can manage their courses" ON courses FOR ALL USING (auth.uid() = instructor_id);

-- Users can see their own enrollments
CREATE POLICY "Users can see own enrollments" ON enrollments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can enroll in courses" ON enrollments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own enrollment progress" ON enrollments FOR UPDATE USING (auth.uid() = user_id);

-- Users can see their own achievements
CREATE POLICY "Users can see own achievements" ON achievements FOR SELECT USING (auth.uid() = user_id);

-- Discussion policies
CREATE POLICY "Course discussions are public" ON discussions FOR SELECT USING (true);
CREATE POLICY "Enrolled users can create discussions" ON discussions FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT user_id FROM enrollments WHERE course_id = discussions.course_id)
);
CREATE POLICY "Users can update own discussions" ON discussions FOR UPDATE USING (auth.uid() = user_id);

-- Notifications are private to users
CREATE POLICY "Users can see own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Insert sample data
INSERT INTO users (id, email, role, profile) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'admin@pluggdacademy.com', 'admin', '{"name": "Admin User", "bio": "Platform Administrator"}'),
  ('550e8400-e29b-41d4-a716-446655440001', 'instructor@pluggdacademy.com', 'instructor', '{"name": "Dr. Sarah Wilson", "bio": "Senior Software Engineer & Instructor"}'),
  ('550e8400-e29b-41d4-a716-446655440002', 'student@pluggdacademy.com', 'student', '{"name": "Alex Johnson", "bio": "Aspiring Developer"}');

INSERT INTO courses (title, description, instructor_id, difficulty, duration_hours, is_published) VALUES 
  ('React Fundamentals', 'Learn the basics of React development', '550e8400-e29b-41d4-a716-446655440001', 'beginner', 10, true),
  ('Advanced JavaScript', 'Deep dive into JavaScript concepts', '550e8400-e29b-41d4-a716-446655440001', 'intermediate', 15, true),
  ('UI/UX Design Principles', 'Learn modern design principles', '550e8400-e29b-41d4-a716-446655440001', 'beginner', 8, true);

-- Create storage buckets (run in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('course-content', 'course-content', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false);

-- Storage policies (run after creating buckets)
-- CREATE POLICY "Course content is publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'course-content');
-- CREATE POLICY "Instructors can upload course content" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'course-content' AND auth.role() = 'instructor');
-- CREATE POLICY "Users can upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
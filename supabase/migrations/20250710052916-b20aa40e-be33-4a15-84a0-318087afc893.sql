
-- Create comprehensive LMS database structure

-- Course materials table for storing uploaded content
CREATE TABLE public.course_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('markdown', 'html', 'video', 'pdf', 'quiz')),
  content_data JSONB NOT NULL DEFAULT '{}',
  file_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_free BOOLEAN NOT NULL DEFAULT false,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Course certificates table
CREATE TABLE public.course_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  certificate_url TEXT,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  certificate_data JSONB NOT NULL DEFAULT '{}',
  UNIQUE(course_id, user_id)
);

-- Course reviews and ratings
CREATE TABLE public.course_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(course_id, user_id)
);

-- Quiz results table
CREATE TABLE public.quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  lesson_id TEXT NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  max_score DECIMAL(5,2) NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.course_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for course_materials
CREATE POLICY "Course materials viewable by everyone for published courses" ON public.course_materials
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_materials.course_id 
    AND courses.is_published = true
  )
);

CREATE POLICY "Admins can manage all course materials" ON public.course_materials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

CREATE POLICY "Instructors can manage their course materials" ON public.course_materials
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = course_materials.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

-- RLS Policies for course_certificates
CREATE POLICY "Users can view their own certificates" ON public.course_certificates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create certificates" ON public.course_certificates
FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all certificates" ON public.course_certificates
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- RLS Policies for course_reviews
CREATE POLICY "Reviews are viewable by everyone" ON public.course_reviews
FOR SELECT USING (true);

CREATE POLICY "Users can create their own reviews" ON public.course_reviews
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.course_reviews
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.course_reviews
FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for quiz_results
CREATE POLICY "Users can view their own quiz results" ON public.quiz_results
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quiz results" ON public.quiz_results
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Instructors can view quiz results for their courses" ON public.quiz_results
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.courses 
    WHERE courses.id = quiz_results.course_id 
    AND courses.instructor_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all quiz results" ON public.quiz_results
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'
  )
);

-- Storage buckets for course content
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('course-materials', 'course-materials', false),
  ('course-thumbnails', 'course-thumbnails', true),
  ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for course materials
CREATE POLICY "Authenticated users can view course materials" ON storage.objects
FOR SELECT USING (
  bucket_id = 'course-materials' AND auth.role() = 'authenticated'
);

CREATE POLICY "Admins and instructors can upload course materials" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-materials' AND 
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin') OR
    auth.role() = 'authenticated'
  )
);

-- Storage policies for course thumbnails
CREATE POLICY "Course thumbnails are publicly viewable" ON storage.objects
FOR SELECT USING (bucket_id = 'course-thumbnails');

CREATE POLICY "Admins and instructors can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'course-thumbnails' AND 
  (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_roles.user_id = auth.uid() AND user_roles.role = 'admin') OR
    auth.role() = 'authenticated'
  )
);

-- Storage policies for certificates
CREATE POLICY "Users can view their own certificates" ON storage.objects
FOR SELECT USING (
  bucket_id = 'certificates' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "System can create certificates" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'certificates');

-- Function to generate course certificates
CREATE OR REPLACE FUNCTION public.generate_course_certificate(
  p_course_id UUID,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  certificate_id UUID;
  course_title TEXT;
  user_name TEXT;
BEGIN
  -- Get course and user details
  SELECT title INTO course_title FROM public.courses WHERE id = p_course_id;
  SELECT full_name INTO user_name FROM public.profiles WHERE user_id = p_user_id;
  
  -- Create certificate record
  INSERT INTO public.course_certificates (course_id, user_id, certificate_data)
  VALUES (
    p_course_id, 
    p_user_id,
    jsonb_build_object(
      'course_title', course_title,
      'user_name', COALESCE(user_name, 'Student'),
      'completion_date', now()
    )
  )
  ON CONFLICT (course_id, user_id) 
  DO UPDATE SET 
    issued_at = now(),
    certificate_data = jsonb_build_object(
      'course_title', course_title,
      'user_name', COALESCE(user_name, 'Student'),
      'completion_date', now()
    )
  RETURNING id INTO certificate_id;
  
  RETURN certificate_id;
END;
$$;

-- Indexes for better performance
CREATE INDEX idx_course_materials_course_id ON public.course_materials(course_id);
CREATE INDEX idx_course_materials_lesson_id ON public.course_materials(lesson_id);
CREATE INDEX idx_course_certificates_user_id ON public.course_certificates(user_id);
CREATE INDEX idx_course_reviews_course_id ON public.course_reviews(course_id);
CREATE INDEX idx_quiz_results_user_course ON public.quiz_results(user_id, course_id);

-- Update triggers for updated_at columns
CREATE TRIGGER update_course_materials_updated_at
  BEFORE UPDATE ON public.course_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_course_reviews_updated_at
  BEFORE UPDATE ON public.course_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

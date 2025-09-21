-- Add file upload columns to contests table
ALTER TABLE public.contests 
ADD COLUMN cover_image_url TEXT,
ADD COLUMN resource_files JSONB DEFAULT '[]'::jsonb,
ADD COLUMN additional_images JSONB DEFAULT '[]'::jsonb;

-- Create contest_files table for better file management
CREATE TABLE public.contest_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'audio', 'document', 'other'
  file_size BIGINT,
  description TEXT,
  is_downloadable BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for contest_files
ALTER TABLE public.contest_files ENABLE ROW LEVEL SECURITY;

-- Create policies for contest_files
CREATE POLICY "Contest files are viewable by everyone"
ON public.contest_files
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage contest files"
ON public.contest_files
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_contest_files_updated_at
  BEFORE UPDATE ON public.contest_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
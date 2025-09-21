-- Create enum for user types
CREATE TYPE public.user_type AS ENUM ('artist', 'producer', 'industry');

-- Create enum for directory submission status
CREATE TYPE public.submission_status AS ENUM ('pending', 'approved', 'rejected');

-- Add user_type and avatar to profiles table
ALTER TABLE public.profiles 
ADD COLUMN user_type public.user_type DEFAULT 'artist',
ADD COLUMN avatar_url text;

-- Create directory_submissions table
CREATE TABLE public.directory_submissions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title text NOT NULL,
    bio text NOT NULL,
    location text,
    experience text,
    genres text[] DEFAULT '{}',
    hourly_rate text,
    credits text[] DEFAULT '{}',
    website_url text,
    social_links jsonb DEFAULT '{}',
    status public.submission_status DEFAULT 'pending',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    approved_at timestamp with time zone,
    approved_by uuid REFERENCES auth.users(id)
);

-- Create approved_directory_profiles table for approved profiles
CREATE TABLE public.approved_directory_profiles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    submission_id uuid NOT NULL REFERENCES public.directory_submissions(id) ON DELETE CASCADE,
    title text NOT NULL,
    bio text NOT NULL,
    location text,
    experience text,
    genres text[] DEFAULT '{}',
    hourly_rate text,
    credits text[] DEFAULT '{}',
    website_url text,
    social_links jsonb DEFAULT '{}',
    rating numeric DEFAULT 0,
    reviews_count integer DEFAULT 0,
    verified boolean DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.directory_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_directory_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for directory_submissions
CREATE POLICY "Users can view their own submissions"
ON public.directory_submissions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own submissions"
ON public.directory_submissions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending submissions"
ON public.directory_submissions
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- RLS policies for approved_directory_profiles
CREATE POLICY "Approved profiles are viewable by everyone"
ON public.approved_directory_profiles
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_directory_submissions_updated_at
BEFORE UPDATE ON public.directory_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_approved_directory_profiles_updated_at
BEFORE UPDATE ON public.approved_directory_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
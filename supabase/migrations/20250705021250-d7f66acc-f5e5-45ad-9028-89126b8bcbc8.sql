-- Add foreign key from approved_directory_profiles to profiles
ALTER TABLE public.approved_directory_profiles 
ADD CONSTRAINT approved_directory_profiles_user_id_profiles_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
-- Add foreign key relationship between beats and profiles via user_id
ALTER TABLE public.beats 
ADD CONSTRAINT beats_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add foreign key relationship between posts and profiles via user_id  
ALTER TABLE public.posts 
ADD CONSTRAINT posts_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
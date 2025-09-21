-- Add user_id column to releases table to link releases to creators
ALTER TABLE public.releases 
ADD COLUMN user_id UUID REFERENCES public.profiles(user_id);

-- Update the "MUSE EP" release to be linked to D'yani's user account
UPDATE public.releases 
SET user_id = 'c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f'
WHERE artist = 'D''YANI' AND title = 'MUSE EP';

-- Update RLS policies for releases to allow creators to manage their own releases
DROP POLICY IF EXISTS "Only admins can manage releases" ON public.releases;
DROP POLICY IF EXISTS "Releases are viewable by everyone" ON public.releases;

-- New policies for releases
CREATE POLICY "Releases are viewable by everyone" 
ON public.releases 
FOR SELECT 
USING (true);

CREATE POLICY "Creators can manage their own releases" 
ON public.releases 
FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all releases" 
ON public.releases 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));
-- Add foreign key from bookings client_user_id to profiles  
ALTER TABLE public.bookings
ADD CONSTRAINT bookings_client_user_id_fkey
FOREIGN KEY (client_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add foreign key from bookings professional_user_id to profiles
ALTER TABLE public.bookings  
ADD CONSTRAINT bookings_professional_user_id_fkey
FOREIGN KEY (professional_user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
-- Remove the foreign key constraint that links profiles to auth.users
-- This allows creating client profiles without requiring authentication
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;
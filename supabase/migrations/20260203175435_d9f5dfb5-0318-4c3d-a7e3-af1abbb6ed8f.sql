-- Add is_active column to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- Add policy for super_admin to manage all profiles
DROP POLICY IF EXISTS "Super admin can manage all profiles" ON public.profiles;

CREATE POLICY "Super admin can manage all profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
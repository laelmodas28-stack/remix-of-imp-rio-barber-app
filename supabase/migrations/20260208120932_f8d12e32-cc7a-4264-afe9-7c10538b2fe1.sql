
-- Fix: Drop the overly permissive "Public can view barbershops" policy (USING true)
-- The other policies already cover legitimate access:
--   "Public can view active barbershops for booking" (is_active = true)
--   "Authenticated users can view basic barbershop data" (active OR owner OR admin OR super_admin)
--   "Super admin can manage all barbershops" (ALL)
DROP POLICY IF EXISTS "Public can view barbershops" ON public.barbershops;

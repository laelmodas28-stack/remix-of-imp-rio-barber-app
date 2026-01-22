-- Drop the old policies that check profiles.role directly
DROP POLICY IF EXISTS "Admins can insert barbershop info" ON public.barbershop_info;
DROP POLICY IF EXISTS "Admins can update barbershop info" ON public.barbershop_info;

-- Create new policies using the proper has_role() security definer function
CREATE POLICY "Admins can insert barbershop info" 
ON public.barbershop_info 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update barbershop info" 
ON public.barbershop_info 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));
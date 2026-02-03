-- Allow super_admin to update any barbershop
DROP POLICY IF EXISTS "Super admin can manage all barbershops" ON public.barbershops;

CREATE POLICY "Super admin can manage all barbershops"
ON public.barbershops
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));
-- Allow barbershop admins to update client profiles
CREATE POLICY "Admins can update barbershop client profiles"
ON public.profiles FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM barbershop_clients bc
    JOIN user_roles ur ON ur.barbershop_id = bc.barbershop_id
    WHERE bc.user_id = profiles.user_id
      AND ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'super_admin')
  )
);
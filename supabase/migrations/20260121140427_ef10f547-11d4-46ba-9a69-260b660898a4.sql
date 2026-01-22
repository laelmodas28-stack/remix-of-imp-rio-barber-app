-- Add policy for admins to update barbershop_clients
CREATE POLICY "Admin pode atualizar clientes"
ON public.barbershop_clients
FOR UPDATE
USING (is_barbershop_admin(auth.uid(), barbershop_id));
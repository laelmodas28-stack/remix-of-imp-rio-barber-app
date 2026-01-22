-- Add policy for admins to insert clients into barbershop_clients
CREATE POLICY "Admin pode cadastrar clientes"
ON public.barbershop_clients
FOR INSERT
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));
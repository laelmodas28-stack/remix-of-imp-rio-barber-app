-- Add policy for admins to insert bookings
CREATE POLICY "Admin pode criar agendamentos"
ON public.bookings
FOR INSERT
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));
-- Allow edge functions (service role) to insert notification logs
-- The existing SELECT policy already allows admins to view logs
-- We need an INSERT policy for the service role to log notifications

CREATE POLICY "Service role pode inserir logs de notificação"
ON public.notification_logs
FOR INSERT
WITH CHECK (true);

-- Also allow admins to insert logs manually if needed
CREATE POLICY "Admin pode inserir logs de notificação"
ON public.notification_logs
FOR INSERT
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));
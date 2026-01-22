-- Fix 1: Add SET search_path = public to vulnerable SECURITY DEFINER functions

-- Fix update_updated_at_column()
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_subscription_updated_at()
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix expire_subscriptions()
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE client_subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$;

-- Fix 2: Add RLS policy for professionals to view their assigned bookings
CREATE POLICY "Professionals can view their bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM public.professionals 
    WHERE user_id = auth.uid()
  )
);
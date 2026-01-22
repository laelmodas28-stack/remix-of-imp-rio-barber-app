-- 1. Fix notification_settings RLS policy to restrict admin contact info
DROP POLICY IF EXISTS "Everyone can view notification settings" ON notification_settings;

CREATE POLICY "Admins can view own notification settings"
ON notification_settings
FOR SELECT
USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- 2. Create registration_codes table for secure barbershop registration
CREATE TABLE public.registration_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on registration_codes
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage registration codes
CREATE POLICY "Admins can manage registration codes"
ON public.registration_codes
FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Anyone can check if a code exists (for validation during registration)
CREATE POLICY "Public can validate codes"
ON public.registration_codes
FOR SELECT
USING (NOT is_used AND (expires_at IS NULL OR expires_at > now()));

-- Insert some initial registration codes
INSERT INTO public.registration_codes (code, expires_at) VALUES
  ('IMPERIO2024', now() + interval '30 days'),
  ('BARBER2024', now() + interval '30 days'),
  ('ADMIN2024', now() + interval '30 days');
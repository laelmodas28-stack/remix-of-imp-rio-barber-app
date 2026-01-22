-- Create storage bucket for professional photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'professional-photos',
  'professional-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
);

-- Create storage bucket for barbershop branding
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barbershop-branding',
  'barbershop-branding',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png']
);

-- RLS policies for professional photos
CREATE POLICY "Anyone can view professional photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'professional-photos');

CREATE POLICY "Admins can upload professional photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'professional-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update professional photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'professional-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete professional photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'professional-photos' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- RLS policies for barbershop branding
CREATE POLICY "Anyone can view barbershop branding"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbershop-branding');

CREATE POLICY "Admins can upload barbershop branding"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barbershop-branding' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update barbershop branding"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barbershop-branding' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete barbershop branding"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barbershop-branding' AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- Insert default barbershop info
INSERT INTO public.barbershop_info (name, logo_url)
VALUES ('IMPÉRIO BARBER', '/imperio-logo.webp')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS policies for barbershop_info updates
CREATE POLICY "Admins can update barbershop info"
ON public.barbershop_info FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can insert barbershop info"
ON public.barbershop_info FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
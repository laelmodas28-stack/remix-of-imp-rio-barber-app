-- Fix profiles table RLS - users can only see their own profile, admins can see profiles for their barbershop
DROP POLICY IF EXISTS "Perfis são visíveis publicamente" ON public.profiles;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- Barbershop admins can view profiles of users in their barbershop
CREATE POLICY "Admins can view barbershop client profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbershop_clients bc
    JOIN public.user_roles ur ON ur.barbershop_id = bc.barbershop_id
    WHERE bc.user_id = profiles.user_id
    AND ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
  )
);

-- Fix storage bucket policies to use user_roles table instead of non-existent profiles.role column
-- Drop existing broken policies
DROP POLICY IF EXISTS "Admins can upload professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload barbershop branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update barbershop branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete barbershop branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload service images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update service images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete service images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload tutorial videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update tutorial videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete tutorial videos" ON storage.objects;

-- Recreate storage policies using user_roles table
-- Professional photos bucket
CREATE POLICY "Admins can upload professional photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'professional-photos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update professional photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'professional-photos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete professional photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'professional-photos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Barbershop branding bucket
CREATE POLICY "Admins can upload barbershop branding"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barbershop-branding' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update barbershop branding"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barbershop-branding' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete barbershop branding"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barbershop-branding' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Service images bucket
CREATE POLICY "Admins can upload service images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update service images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete service images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'service-images' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Gallery bucket
CREATE POLICY "Admins can upload gallery images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update gallery images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'gallery' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete gallery images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'gallery' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

-- Tutorial videos bucket
CREATE POLICY "Admins can upload tutorial videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tutorial-videos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can update tutorial videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tutorial-videos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Admins can delete tutorial videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tutorial-videos' AND
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
  )
);
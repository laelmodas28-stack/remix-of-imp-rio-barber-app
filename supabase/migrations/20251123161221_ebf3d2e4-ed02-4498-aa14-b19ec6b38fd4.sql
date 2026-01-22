-- Remover policies existentes e recriar
DROP POLICY IF EXISTS "Admins can upload professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload barbershop branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update barbershop branding" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete barbershop branding" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view barbershop branding" ON storage.objects;

-- Criar policies para professional-photos
CREATE POLICY "Admins can upload professional photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'professional-photos' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update professional photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'professional-photos' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete professional photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'professional-photos' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Anyone can view professional photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'professional-photos');

-- Criar policies para barbershop-branding
CREATE POLICY "Admins can upload barbershop branding"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'barbershop-branding' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update barbershop branding"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'barbershop-branding' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete barbershop branding"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'barbershop-branding' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Anyone can view barbershop branding"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'barbershop-branding');
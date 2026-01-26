-- Drop old policies that use incorrect role check
DROP POLICY IF EXISTS "Admins can delete professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload professional photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view professional photos" ON storage.objects;

-- Recreate with correct user_roles check
CREATE POLICY "Anyone can view professional photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'professional-photos');

CREATE POLICY "Admins can upload professional photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'professional-photos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can update professional photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'professional-photos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

CREATE POLICY "Admins can delete professional photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'professional-photos'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);
-- Drop and recreate policies to include admins via user_roles
DROP POLICY IF EXISTS "Barbershop owners can upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Barbershop owners can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Barbershop owners can delete branding" ON storage.objects;

-- Allow barbershop owners OR admins to upload branding
CREATE POLICY "Barbershop owners can upload branding"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barbershop-branding' 
  AND auth.role() = 'authenticated'
  AND (
    -- Owner can upload
    EXISTS (
      SELECT 1 FROM public.barbershops 
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
    OR
    -- Admin via user_roles can upload
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.barbershop_id::text = (storage.foldername(name))[1]
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  )
);

-- Allow owners or admins to update their branding
CREATE POLICY "Barbershop owners can update branding"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barbershop-branding'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.barbershops 
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.barbershop_id::text = (storage.foldername(name))[1]
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  )
);

-- Allow owners or admins to delete their branding
CREATE POLICY "Barbershop owners can delete branding"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barbershop-branding'
  AND auth.role() = 'authenticated'
  AND (
    EXISTS (
      SELECT 1 FROM public.barbershops 
      WHERE id::text = (storage.foldername(name))[1]
      AND owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.barbershop_id::text = (storage.foldername(name))[1]
      AND ur.user_id = auth.uid()
      AND ur.role = 'admin'
    )
  )
);
-- Create barbershop-branding bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('barbershop-branding', 'barbershop-branding', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Barbershop branding is publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Barbershop owners can upload branding" ON storage.objects;
DROP POLICY IF EXISTS "Barbershop owners can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Barbershop owners can delete branding" ON storage.objects;

-- Allow public read access to branding assets
CREATE POLICY "Barbershop branding is publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbershop-branding');

-- Allow authenticated users to upload to their barbershop folder
-- The folder structure is: {barbershop_id}/filename
CREATE POLICY "Barbershop owners can upload branding"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barbershop-branding' 
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

-- Allow owners to update their branding
CREATE POLICY "Barbershop owners can update branding"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barbershop-branding'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

-- Allow owners to delete their branding
CREATE POLICY "Barbershop owners can delete branding"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barbershop-branding'
  AND auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.barbershops 
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);
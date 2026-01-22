-- Criar bucket para imagens de serviços
INSERT INTO storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
VALUES ('service-images', 'service-images', true, ARRAY['image/jpeg', 'image/jpg', 'image/png'], 5242880)
ON CONFLICT (id) DO NOTHING;

-- Criar policies para service-images
CREATE POLICY "Admins can upload service images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'service-images' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update service images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'service-images' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete service images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'service-images' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Anyone can view service images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'service-images');
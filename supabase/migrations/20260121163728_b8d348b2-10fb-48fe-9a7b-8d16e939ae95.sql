-- Create storage bucket for barbershop assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'barbershop-assets',
  'barbershop-assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Allow anyone to view public assets
CREATE POLICY "Public assets are viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'barbershop-assets');

-- Allow barbershop admins to upload assets
CREATE POLICY "Admins can upload barbershop assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'barbershop-assets' AND
  auth.uid() IS NOT NULL
);

-- Allow barbershop admins to update their assets
CREATE POLICY "Admins can update barbershop assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'barbershop-assets' AND
  auth.uid() IS NOT NULL
);

-- Allow barbershop admins to delete their assets
CREATE POLICY "Admins can delete barbershop assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'barbershop-assets' AND
  auth.uid() IS NOT NULL
);
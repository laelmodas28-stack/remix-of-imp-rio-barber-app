-- Create storage bucket for tutorial videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-videos', 'tutorial-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view tutorial videos
CREATE POLICY "Tutorial videos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorial-videos');

-- Allow barbershop admins to upload tutorial videos
CREATE POLICY "Admins can upload tutorial videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tutorial-videos' 
  AND auth.uid() IS NOT NULL
);

-- Allow barbershop admins to update their tutorial videos
CREATE POLICY "Admins can update tutorial videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tutorial-videos' 
  AND auth.uid() IS NOT NULL
);

-- Allow barbershop admins to delete their tutorial videos
CREATE POLICY "Admins can delete tutorial videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tutorial-videos' 
  AND auth.uid() IS NOT NULL
);
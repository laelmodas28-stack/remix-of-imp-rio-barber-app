-- Tabela para armazenar tutoriais com imagens
CREATE TABLE public.tutorial_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL,
  tutorial_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  step_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(barbershop_id, tutorial_id)
);

-- Enable RLS
ALTER TABLE public.tutorial_images ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admins can manage tutorial images"
ON public.tutorial_images
FOR ALL
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Everyone can view tutorial images"
ON public.tutorial_images
FOR SELECT
USING (true);

-- Storage bucket para imagens de tutorial
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-images', 'tutorial-images', true)
ON CONFLICT (id) DO NOTHING;

-- Política de storage para upload
CREATE POLICY "Admins can upload tutorial images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'tutorial-images' AND
  auth.uid() IS NOT NULL
);

-- Política de storage para visualização pública
CREATE POLICY "Public can view tutorial images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'tutorial-images');

-- Trigger para updated_at
CREATE TRIGGER update_tutorial_images_updated_at
BEFORE UPDATE ON public.tutorial_images
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
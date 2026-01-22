-- FASE 2: SISTEMA DE GALERIA/PORTFÓLIO
-- Criar tabela para galeria de fotos da barbearia
CREATE TABLE IF NOT EXISTS public.gallery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  title TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_gallery_barbershop ON public.gallery(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_gallery_order ON public.gallery(barbershop_id, display_order);

-- Trigger de updated_at
CREATE TRIGGER update_gallery_updated_at
  BEFORE UPDATE ON public.gallery
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.gallery ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver fotos da galeria
CREATE POLICY "Everyone can view gallery"
ON public.gallery
FOR SELECT
TO authenticated
USING (true);

-- Donos da barbearia podem gerenciar galeria
CREATE POLICY "Barbershop owners can manage gallery"
ON public.gallery
FOR ALL
TO authenticated
USING (
  barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  barbershop_id IN (
    SELECT id FROM public.barbershops WHERE owner_id = auth.uid()
  )
);

-- Criar bucket de storage para galeria
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies para o bucket de galeria
CREATE POLICY "Gallery images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Barbershop owners can upload to gallery"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'gallery' 
  AND auth.uid() IN (SELECT owner_id FROM public.barbershops)
);

CREATE POLICY "Barbershop owners can update their gallery"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'gallery'
  AND auth.uid() IN (SELECT owner_id FROM public.barbershops)
);

CREATE POLICY "Barbershop owners can delete their gallery"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'gallery'
  AND auth.uid() IN (SELECT owner_id FROM public.barbershops)
);
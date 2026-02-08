
-- Fix gallery table: replace overly permissive SELECT with scoped policies
DROP POLICY IF EXISTS "Everyone can view gallery" ON public.gallery;

-- Admin can manage own gallery (already exists, but ensure it's correct)
DROP POLICY IF EXISTS "Barbershop owners can manage gallery" ON public.gallery;

CREATE POLICY "Barbershop admin manages own gallery"
ON public.gallery
FOR ALL
TO authenticated
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

-- Public can view gallery only for a specific barbershop (needed for public barbershop pages)
CREATE POLICY "Public can view barbershop gallery"
ON public.gallery
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbershops b
    WHERE b.id = gallery.barbershop_id AND b.is_active = true
  )
);

-- Fix gallery_images table similarly
DROP POLICY IF EXISTS "Galeria é visível publicamente" ON public.gallery_images;
DROP POLICY IF EXISTS "Admin pode gerenciar galeria" ON public.gallery_images;

CREATE POLICY "Barbershop admin manages own gallery_images"
ON public.gallery_images
FOR ALL
TO authenticated
USING (is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Public can view barbershop gallery_images"
ON public.gallery_images
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbershops b
    WHERE b.id = gallery_images.barbershop_id AND b.is_active = true
  )
);

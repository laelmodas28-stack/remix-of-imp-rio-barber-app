-- Adicionar políticas RLS para admins gerenciarem profissionais
CREATE POLICY "Admins can update professionals"
ON public.professionals
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can insert professionals"
ON public.professionals
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::app_role
  )
);

-- Adicionar políticas RLS para admins gerenciarem serviços
CREATE POLICY "Admins can update services"
ON public.services
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::app_role
  )
);

CREATE POLICY "Admins can insert services"
ON public.services
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::app_role
  )
);
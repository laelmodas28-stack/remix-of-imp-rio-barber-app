-- Migração 2: Criar função e políticas

-- Criar função is_super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'super_admin'
  )
$$;

-- Atribuir role super_admin ao dono original da plataforma (IMPÉRIO BARBER)
INSERT INTO public.user_roles (user_id, role, barbershop_id)
SELECT 
  'cfeb58e0-f333-4c53-ba38-da0997cb2196'::uuid,
  'super_admin'::app_role,
  id
FROM public.barbershops 
WHERE owner_id = 'cfeb58e0-f333-4c53-ba38-da0997cb2196'::uuid
ON CONFLICT (user_id, barbershop_id, role) DO NOTHING;

-- Atualizar RLS de registration_codes
DROP POLICY IF EXISTS "Admins can manage registration codes" ON public.registration_codes;

CREATE POLICY "Only super admin can manage registration codes"
ON public.registration_codes
FOR ALL
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));
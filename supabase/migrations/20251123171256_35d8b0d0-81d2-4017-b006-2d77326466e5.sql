-- FASE 1: BASE MULTI-TENANT
-- Criar tabela de barbearias
CREATE TABLE IF NOT EXISTS public.barbershops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#D4AF37', -- Dourado Premium padrão
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  description TEXT,
  phone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar trigger de updated_at
CREATE TRIGGER update_barbershops_updated_at
  BEFORE UPDATE ON public.barbershops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar coluna barbershop_id nas tabelas existentes
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_professionals_barbershop ON public.professionals(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_services_barbershop ON public.services(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_bookings_barbershop ON public.bookings(barbershop_id);
CREATE INDEX IF NOT EXISTS idx_barbershops_owner ON public.barbershops(owner_id);

-- Migrar dados existentes da barbershop_info para barbershops
-- Primeiro, vamos buscar o primeiro admin para ser o dono da barbearia default
INSERT INTO public.barbershops (name, logo_url, description, phone, whatsapp, instagram, address, owner_id)
SELECT 
  COALESCE(bi.name, 'IMPÉRIO BARBER'),
  bi.logo_url,
  bi.description,
  bi.phone,
  bi.whatsapp,
  bi.instagram,
  bi.address,
  COALESCE(
    (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1),
    (SELECT id FROM public.profiles LIMIT 1)
  )
FROM public.barbershop_info bi
LIMIT 1;

-- Associar todos os registros existentes à barbearia criada
UPDATE public.professionals 
SET barbershop_id = (SELECT id FROM public.barbershops LIMIT 1)
WHERE barbershop_id IS NULL;

UPDATE public.services 
SET barbershop_id = (SELECT id FROM public.barbershops LIMIT 1)
WHERE barbershop_id IS NULL;

UPDATE public.bookings 
SET barbershop_id = (SELECT id FROM public.barbershops LIMIT 1)
WHERE barbershop_id IS NULL;

-- Tornar barbershop_id obrigatório após a migração
ALTER TABLE public.professionals ALTER COLUMN barbershop_id SET NOT NULL;
ALTER TABLE public.services ALTER COLUMN barbershop_id SET NOT NULL;
ALTER TABLE public.bookings ALTER COLUMN barbershop_id SET NOT NULL;

-- POLÍTICAS RLS PARA BARBERSHOPS
ALTER TABLE public.barbershops ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ver barbearias ativas
CREATE POLICY "Everyone can view barbershops"
ON public.barbershops
FOR SELECT
TO authenticated
USING (true);

-- Donos podem atualizar sua própria barbearia
CREATE POLICY "Owners can update their barbershop"
ON public.barbershops
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- Usuários podem criar barbearias
CREATE POLICY "Users can create barbershops"
ON public.barbershops
FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- ATUALIZAR POLÍTICAS RLS EXISTENTES PARA ISOLAR POR BARBEARIA

-- PROFESSIONALS: Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "Everyone can view active professionals" ON public.professionals;
DROP POLICY IF EXISTS "Admins can update professionals" ON public.professionals;
DROP POLICY IF EXISTS "Admins can insert professionals" ON public.professionals;

-- Qualquer um pode ver profissionais ativos
CREATE POLICY "Everyone can view active professionals"
ON public.professionals
FOR SELECT
TO authenticated
USING (is_active = true);

-- Donos da barbearia podem gerenciar profissionais
CREATE POLICY "Barbershop owners can manage professionals"
ON public.professionals
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

-- SERVICES: Remover políticas antigas e criar novas
DROP POLICY IF EXISTS "Everyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Admins can update services" ON public.services;
DROP POLICY IF EXISTS "Admins can insert services" ON public.services;

-- Qualquer um pode ver serviços ativos
CREATE POLICY "Everyone can view active services"
ON public.services
FOR SELECT
TO authenticated
USING (is_active = true);

-- Donos da barbearia podem gerenciar serviços
CREATE POLICY "Barbershop owners can manage services"
ON public.services
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

-- BOOKINGS: Atualizar políticas para incluir isolamento por barbearia
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;

-- Clientes podem ver seus próprios agendamentos
CREATE POLICY "Users can view own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

-- Clientes podem criar agendamentos
CREATE POLICY "Users can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

-- Clientes podem atualizar seus próprios agendamentos
CREATE POLICY "Users can update own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (client_id = auth.uid());

-- Donos da barbearia podem ver e gerenciar todos os agendamentos da sua barbearia
CREATE POLICY "Barbershop owners can manage bookings"
ON public.bookings
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

-- FUNCTION: Criar barbearia automaticamente quando um novo usuário com role admin é criado
CREATE OR REPLACE FUNCTION public.create_barbershop_for_new_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Criar barbearia apenas se o usuário for admin
  IF NEW.role = 'admin' THEN
    INSERT INTO public.barbershops (
      name,
      owner_id,
      description
    ) VALUES (
      'Minha Barbearia',
      NEW.id,
      'Descrição da barbearia'
    );
  END IF;
  RETURN NEW;
END;
$$;

-- TRIGGER: Criar barbearia quando um novo perfil admin é criado
DROP TRIGGER IF EXISTS on_admin_profile_created ON public.profiles;
CREATE TRIGGER on_admin_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_barbershop_for_new_owner();
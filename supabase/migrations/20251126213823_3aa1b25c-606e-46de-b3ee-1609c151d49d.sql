-- FASE 1: CORREÇÕES CRÍTICAS DE MULTI-TENANT E SEGURANÇA

-- 1. Criar enum de roles (se não existir)
DO $$ BEGIN
  CREATE TYPE app_role AS ENUM ('admin', 'barber', 'client');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Criar tabela user_roles (CRÍTICO: roles não devem estar na tabela profiles)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, barbershop_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Criar função security definer para checar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Criar função para checar se usuário é admin de uma barbearia específica
CREATE OR REPLACE FUNCTION public.is_barbershop_admin(_user_id uuid, _barbershop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND barbershop_id = _barbershop_id
      AND role = 'admin'
  )
$$;

-- 5. Migrar campos de barbershop_info para barbershops
ALTER TABLE public.barbershops
ADD COLUMN IF NOT EXISTS opening_time time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS closing_time time DEFAULT '19:00:00',
ADD COLUMN IF NOT EXISTS opening_days text[] DEFAULT ARRAY['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
ADD COLUMN IF NOT EXISTS tiktok text,
ADD COLUMN IF NOT EXISTS description text;

-- 6. Criar tabela para gestão de clientes por barbearia
CREATE TABLE IF NOT EXISTS public.barbershop_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  first_visit date DEFAULT CURRENT_DATE,
  last_visit date,
  total_visits integer DEFAULT 0,
  notes text,
  phone text,
  email text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(barbershop_id, client_id)
);

ALTER TABLE public.barbershop_clients ENABLE ROW LEVEL SECURITY;

-- 7. Vincular notification_settings corretamente ao barbershop
ALTER TABLE public.notification_settings
DROP CONSTRAINT IF EXISTS notification_settings_barbershop_id_fkey,
ADD CONSTRAINT notification_settings_barbershop_id_fkey 
  FOREIGN KEY (barbershop_id) 
  REFERENCES public.barbershops(id) 
  ON DELETE CASCADE;

-- 8. Trigger para auto-registrar clientes quando fazem agendamento
CREATE OR REPLACE FUNCTION public.register_client_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Inserir ou atualizar cliente na barbearia
  INSERT INTO public.barbershop_clients (
    barbershop_id,
    client_id,
    last_visit,
    total_visits
  )
  VALUES (
    NEW.barbershop_id,
    NEW.client_id,
    NEW.booking_date,
    1
  )
  ON CONFLICT (barbershop_id, client_id)
  DO UPDATE SET
    last_visit = NEW.booking_date,
    total_visits = barbershop_clients.total_visits + 1,
    updated_at = now();
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_register_client ON public.bookings;
CREATE TRIGGER trigger_register_client
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.register_client_on_booking();

-- 9. Trigger para criar configuração de notificação ao criar barbearia
CREATE OR REPLACE FUNCTION public.create_notification_settings_for_barbershop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_settings (
    barbershop_id,
    enabled,
    send_to_client,
    send_whatsapp,
    custom_message
  )
  VALUES (
    NEW.id,
    true,
    true,
    false,
    'Olá {nome}! Seu agendamento foi confirmado para {data} às {hora}. Serviço: {servico}. Profissional: {profissional}. Aguardamos você!'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_create_notification_settings ON public.barbershops;
CREATE TRIGGER trigger_create_notification_settings
  AFTER INSERT ON public.barbershops
  FOR EACH ROW
  EXECUTE FUNCTION public.create_notification_settings_for_barbershop();

-- 10. Trigger para criar role de admin ao criar barbearia
CREATE OR REPLACE FUNCTION public.assign_admin_role_on_barbershop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role, barbershop_id)
  VALUES (NEW.owner_id, 'admin', NEW.id)
  ON CONFLICT (user_id, barbershop_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_admin_role ON public.barbershops;
CREATE TRIGGER trigger_assign_admin_role
  AFTER INSERT ON public.barbershops
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_admin_role_on_barbershop();

-- 11. ATUALIZAR RLS POLICIES - Barbershop Clients
DROP POLICY IF EXISTS "Barbershop admins can manage clients" ON public.barbershop_clients;
CREATE POLICY "Barbershop admins can manage clients"
  ON public.barbershop_clients
  FOR ALL
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
  WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

DROP POLICY IF EXISTS "Clients can view their own data" ON public.barbershop_clients;
CREATE POLICY "Clients can view their own data"
  ON public.barbershop_clients
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

-- 12. ATUALIZAR RLS POLICIES - User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 13. ATUALIZAR RLS POLICIES - Barbershops (usar nova função)
DROP POLICY IF EXISTS "Owners can update their barbershop" ON public.barbershops;
CREATE POLICY "Owners can update their barbershop"
  ON public.barbershops
  FOR UPDATE
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), id));

-- 14. ATUALIZAR RLS POLICIES - Notification Settings
DROP POLICY IF EXISTS "Barbershop owners can manage notification settings" ON public.notification_settings;
CREATE POLICY "Barbershop owners can manage notification settings"
  ON public.notification_settings
  FOR ALL
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
  WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 15. ATUALIZAR RLS POLICIES - Professionals
DROP POLICY IF EXISTS "Barbershop owners can manage professionals" ON public.professionals;
CREATE POLICY "Barbershop owners can manage professionals"
  ON public.professionals
  FOR ALL
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
  WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 16. ATUALIZAR RLS POLICIES - Services
DROP POLICY IF EXISTS "Barbershop owners can manage services" ON public.services;
CREATE POLICY "Barbershop owners can manage services"
  ON public.services
  FOR ALL
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
  WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 17. ATUALIZAR RLS POLICIES - Gallery
DROP POLICY IF EXISTS "Barbershop owners can manage gallery" ON public.gallery;
CREATE POLICY "Barbershop owners can manage gallery"
  ON public.gallery
  FOR ALL
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
  WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 18. ATUALIZAR RLS POLICIES - Bookings
DROP POLICY IF EXISTS "Barbershop owners can manage bookings" ON public.bookings;
CREATE POLICY "Barbershop owners can manage bookings"
  ON public.bookings
  FOR ALL
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
  WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 19. Migrar roles existentes de profiles para user_roles (se houver)
INSERT INTO public.user_roles (user_id, role, barbershop_id)
SELECT 
  p.id,
  p.role,
  b.id as barbershop_id
FROM public.profiles p
LEFT JOIN public.barbershops b ON b.owner_id = p.id
WHERE p.role = 'admin'
ON CONFLICT (user_id, barbershop_id, role) DO NOTHING;

-- Também inserir role client para todos os usuários
INSERT INTO public.user_roles (user_id, role, barbershop_id)
SELECT 
  id,
  'client'::app_role,
  NULL
FROM public.profiles
WHERE role = 'client'
ON CONFLICT DO NOTHING;
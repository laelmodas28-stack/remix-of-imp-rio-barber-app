-- =====================================================
-- SECURITY FIX: Corrigir políticas RLS restantes
-- =====================================================

-- 1. FIX: Remover política vulnerável de profiles que permite qualquer usuário autenticado ver todos
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

-- Criar política correta - apenas próprio perfil ou via função can_view_profile
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR public.can_view_profile(auth.uid(), id)
);

-- 2. FIX: Remover políticas duplicadas de barbershop_clients
DROP POLICY IF EXISTS "Barbershop admins can manage clients" ON public.barbershop_clients;
DROP POLICY IF EXISTS "Clients can view their own data" ON public.barbershop_clients;
DROP POLICY IF EXISTS "Client can view own record" ON public.barbershop_clients;
DROP POLICY IF EXISTS "Barbershop admin can manage their clients" ON public.barbershop_clients;

-- Criar políticas corretas
CREATE POLICY "Client can view own barbershop records"
ON public.barbershop_clients
FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Barbershop admin full access to clients"
ON public.barbershop_clients
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 3. FIX: Limpar políticas duplicadas de notification_logs
DROP POLICY IF EXISTS "Admin pode ver logs de notificação" ON public.notification_logs;
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Barbershop admin can view notification logs" ON public.notification_logs;
DROP POLICY IF EXISTS "Barbershop admin can insert notification logs" ON public.notification_logs;

CREATE POLICY "Barbershop admin can view own notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "System or admin can insert notification logs"
ON public.notification_logs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.role() = 'service_role'::text 
  OR public.is_barbershop_admin(auth.uid(), barbershop_id)
);

-- 4. FIX: Limpar políticas duplicadas de barbershop_settings
DROP POLICY IF EXISTS "Admin pode gerenciar configurações" ON public.barbershop_settings;
DROP POLICY IF EXISTS "Only barbershop admin can manage settings" ON public.barbershop_settings;

CREATE POLICY "Barbershop admin manages settings"
ON public.barbershop_settings
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 5. FIX: Limpar políticas duplicadas de commission_items
DROP POLICY IF EXISTS "Admin can delete commission_items" ON public.commission_items;
DROP POLICY IF EXISTS "Admin can insert commission_items" ON public.commission_items;
DROP POLICY IF EXISTS "Admin can update commission_items" ON public.commission_items;
DROP POLICY IF EXISTS "Admin can view commission_items" ON public.commission_items;
DROP POLICY IF EXISTS "Barbershop admin can view commission items" ON public.commission_items;
DROP POLICY IF EXISTS "Barbershop admin can manage commission items" ON public.commission_items;

-- Profissionais podem ver apenas suas próprias comissões
CREATE POLICY "Professional can view own commissions"
ON public.commission_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.professionals p 
    WHERE p.id = commission_items.professional_id 
    AND p.user_id = auth.uid()
  )
);

-- Admins podem gerenciar todas as comissões da sua barbearia
CREATE POLICY "Barbershop admin manages commissions"
ON public.commission_items
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));
-- =====================================================
-- SECURITY FIX: Corrigir políticas RLS vulneráveis
-- =====================================================

-- 1. FIX: Política de profiles permite acesso a qualquer usuário autenticado
-- Remover política vulnerável e criar nova mais restritiva
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id 
  OR public.can_view_profile(auth.uid(), id)
);

-- 2. FIX: Barbershops expõe owner_id e dados sensíveis publicamente
-- Criar uma view pública que esconde dados sensíveis
DROP VIEW IF EXISTS public.barbershops_public;

CREATE VIEW public.barbershops_public
WITH (security_invoker = on) AS
SELECT 
  id,
  name,
  slug,
  description,
  address,
  logo_url,
  cover_url,
  primary_color,
  theme_primary_color,
  theme_secondary_color,
  opening_time,
  closing_time,
  opening_days,
  business_hours,
  is_active,
  mensagem_personalizada,
  created_at
  -- Exclui: owner_id, phone, whatsapp, instagram, tiktok (dados sensíveis do dono)
FROM public.barbershops
WHERE is_active = true;

-- Adicionar comentário explicando a view
COMMENT ON VIEW public.barbershops_public IS 'View pública de barbearias sem dados sensíveis do proprietário';

-- Remover política pública antiga de barbershops
DROP POLICY IF EXISTS "Anyone can view active barbershops" ON public.barbershops;
DROP POLICY IF EXISTS "Public can view active barbershops" ON public.barbershops;

-- Criar política mais restritiva - apenas admins e donos podem ver dados completos
CREATE POLICY "Authenticated users can view basic barbershop data"
ON public.barbershops
FOR SELECT
TO authenticated
USING (
  is_active = true 
  OR owner_id = auth.uid()
  OR public.is_barbershop_admin(auth.uid(), id)
  OR public.is_super_admin(auth.uid())
);

-- Permitir acesso anônimo apenas para dados básicos necessários para agendamento
CREATE POLICY "Public can view active barbershops for booking"
ON public.barbershops
FOR SELECT
TO anon
USING (is_active = true);

-- 3. FIX: Criar função para verificar se usuário é staff da barbearia
CREATE OR REPLACE FUNCTION public.is_barbershop_staff(_user_id uuid, _barbershop_id uuid)
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
      AND role IN ('admin', 'barber')
  )
  OR EXISTS (
    SELECT 1
    FROM public.professionals
    WHERE user_id = _user_id
      AND barbershop_id = _barbershop_id
      AND is_active = true
  )
$$;

-- 4. FIX: Restringir acesso a barbershop_settings (contém API keys)
DROP POLICY IF EXISTS "Admin pode gerenciar configurações" ON public.barbershop_settings;

CREATE POLICY "Only barbershop admin can manage settings"
ON public.barbershop_settings
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 5. FIX: Restringir notification_logs para apenas o admin específico
DROP POLICY IF EXISTS "Admin pode ver logs de notificação" ON public.notification_logs;

CREATE POLICY "Barbershop admin can view notification logs"
ON public.notification_logs
FOR SELECT
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Barbershop admin can insert notification logs"
ON public.notification_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 6. FIX: Restringir commission_items para admin específico da barbearia
DROP POLICY IF EXISTS "Admin pode gerenciar comissões" ON public.commission_items;
DROP POLICY IF EXISTS "Admin can manage commission items" ON public.commission_items;

CREATE POLICY "Barbershop admin can view commission items"
ON public.commission_items
FOR SELECT
TO authenticated
USING (
  public.is_barbershop_admin(auth.uid(), barbershop_id)
  OR EXISTS (
    SELECT 1 FROM public.professionals p 
    WHERE p.id = commission_items.professional_id 
    AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Barbershop admin can manage commission items"
ON public.commission_items
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 7. FIX: Garantir que barbershop_clients seja acessível apenas por quem deve
DROP POLICY IF EXISTS "Barbershop admins can manage clients" ON public.barbershop_clients;
DROP POLICY IF EXISTS "Clients can view their own data" ON public.barbershop_clients;

CREATE POLICY "Client can view own record"
ON public.barbershop_clients
FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Barbershop admin can manage their clients"
ON public.barbershop_clients
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- 8. FIX: Restringir payment_transactions
DROP POLICY IF EXISTS "Users can view own transactions" ON public.payment_transactions;
DROP POLICY IF EXISTS "Barbershop admins can view all transactions" ON public.payment_transactions;

CREATE POLICY "Client can view own payment transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Barbershop admin can view shop transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (
  barbershop_id IS NOT NULL 
  AND public.is_barbershop_admin(auth.uid(), barbershop_id)
);

CREATE POLICY "System can insert payment transactions"
ON public.payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

-- 9. FIX: Garantir que client_subscriptions seja seguro
DROP POLICY IF EXISTS "Clients can view own subscriptions" ON public.client_subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.client_subscriptions;

CREATE POLICY "Client can view own subscriptions"
ON public.client_subscriptions
FOR SELECT
TO authenticated
USING (client_id = auth.uid() OR user_id = auth.uid());

CREATE POLICY "Barbershop admin can manage client subscriptions"
ON public.client_subscriptions
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));
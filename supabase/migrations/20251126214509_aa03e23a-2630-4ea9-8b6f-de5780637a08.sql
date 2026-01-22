-- FASE 3: SISTEMA DE ASSINATURAS

-- Criar tabela de planos de assinatura
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  price decimal(10,2) NOT NULL,
  duration_days integer NOT NULL DEFAULT 30,
  services_included uuid[] DEFAULT ARRAY[]::uuid[],
  max_services_per_month integer,
  discount_percentage decimal(5,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de assinaturas de clientes
CREATE TABLE IF NOT EXISTS public.client_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  services_used_this_month integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(client_id, plan_id, start_date)
);

-- Criar tabela de histórico de uso de assinaturas
CREATE TABLE IF NOT EXISTS public.subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.client_subscriptions(id) ON DELETE CASCADE NOT NULL,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  used_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Subscription Plans
DROP POLICY IF EXISTS "Everyone can view active plans" ON public.subscription_plans;
CREATE POLICY "Everyone can view active plans"
  ON public.subscription_plans
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "Barbershop admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Barbershop admins can manage plans"
  ON public.subscription_plans
  FOR ALL
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
  WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- RLS Policies - Client Subscriptions
DROP POLICY IF EXISTS "Clients can view own subscriptions" ON public.client_subscriptions;
CREATE POLICY "Clients can view own subscriptions"
  ON public.client_subscriptions
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Clients can create subscriptions" ON public.client_subscriptions;
CREATE POLICY "Clients can create subscriptions"
  ON public.client_subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "Barbershop admins can manage subscriptions" ON public.client_subscriptions;
CREATE POLICY "Barbershop admins can manage subscriptions"
  ON public.client_subscriptions
  FOR ALL
  TO authenticated
  USING (public.is_barbershop_admin(auth.uid(), barbershop_id))
  WITH CHECK (public.is_barbershop_admin(auth.uid(), barbershop_id));

-- RLS Policies - Subscription Usage
DROP POLICY IF EXISTS "Users can view own usage" ON public.subscription_usage;
CREATE POLICY "Users can view own usage"
  ON public.subscription_usage
  FOR SELECT
  TO authenticated
  USING (
    subscription_id IN (
      SELECT id FROM public.client_subscriptions WHERE client_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert usage" ON public.subscription_usage;
CREATE POLICY "System can insert usage"
  ON public.subscription_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (
    subscription_id IN (
      SELECT id FROM public.client_subscriptions WHERE client_id = auth.uid()
    )
  );

-- Função para verificar se cliente tem assinatura ativa
CREATE OR REPLACE FUNCTION public.has_active_subscription(_client_id uuid, _barbershop_id uuid, _service_id uuid)
RETURNS TABLE (
  has_subscription boolean,
  subscription_id uuid,
  can_use boolean,
  services_remaining integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id uuid;
  v_plan_id uuid;
  v_services_included uuid[];
  v_max_services integer;
  v_services_used integer;
  v_can_use boolean := false;
  v_services_remaining integer := 0;
BEGIN
  -- Buscar assinatura ativa
  SELECT cs.id, cs.plan_id, cs.services_used_this_month
  INTO v_subscription_id, v_plan_id, v_services_used
  FROM client_subscriptions cs
  WHERE cs.client_id = _client_id
    AND cs.barbershop_id = _barbershop_id
    AND cs.status = 'active'
    AND cs.end_date >= CURRENT_DATE
  LIMIT 1;

  -- Se não tem assinatura ativa
  IF v_subscription_id IS NULL THEN
    RETURN QUERY SELECT false, NULL::uuid, false, 0;
    RETURN;
  END IF;

  -- Buscar detalhes do plano
  SELECT sp.services_included, sp.max_services_per_month
  INTO v_services_included, v_max_services
  FROM subscription_plans sp
  WHERE sp.id = v_plan_id;

  -- Verificar se o serviço está incluído no plano
  IF _service_id = ANY(v_services_included) THEN
    -- Verificar se ainda tem serviços disponíveis no mês
    IF v_max_services IS NULL OR v_services_used < v_max_services THEN
      v_can_use := true;
      v_services_remaining := COALESCE(v_max_services - v_services_used, 999);
    END IF;
  END IF;

  RETURN QUERY SELECT true, v_subscription_id, v_can_use, v_services_remaining;
END;
$$;

-- Trigger para atualizar contador de serviços usados
CREATE OR REPLACE FUNCTION public.update_subscription_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id uuid;
BEGIN
  -- Buscar assinatura ativa do cliente para esta barbearia
  SELECT cs.id INTO v_subscription_id
  FROM client_subscriptions cs
  JOIN subscription_plans sp ON sp.id = cs.plan_id
  WHERE cs.client_id = NEW.client_id
    AND cs.barbershop_id = NEW.barbershop_id
    AND cs.status = 'active'
    AND cs.end_date >= NEW.booking_date
    AND NEW.service_id = ANY(sp.services_included)
  LIMIT 1;

  -- Se tem assinatura ativa com este serviço incluído
  IF v_subscription_id IS NOT NULL THEN
    -- Incrementar contador de uso
    UPDATE client_subscriptions
    SET services_used_this_month = services_used_this_month + 1
    WHERE id = v_subscription_id;

    -- Registrar uso
    INSERT INTO subscription_usage (subscription_id, booking_id)
    VALUES (v_subscription_id, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_subscription_usage ON public.bookings;
CREATE TRIGGER trigger_update_subscription_usage
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  WHEN (NEW.status != 'cancelled')
  EXECUTE FUNCTION public.update_subscription_usage();

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_subscription_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_subscription_plans_updated_at ON public.subscription_plans;
CREATE TRIGGER trigger_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

DROP TRIGGER IF EXISTS trigger_client_subscriptions_updated_at ON public.client_subscriptions;
CREATE TRIGGER trigger_client_subscriptions_updated_at
  BEFORE UPDATE ON public.client_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscription_updated_at();

-- Função para expirar assinaturas automaticamente
CREATE OR REPLACE FUNCTION public.expire_subscriptions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE client_subscriptions
  SET status = 'expired'
  WHERE status = 'active'
    AND end_date < CURRENT_DATE;
END;
$$;
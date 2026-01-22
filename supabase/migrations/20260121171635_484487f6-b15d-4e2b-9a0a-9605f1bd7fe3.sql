-- Create barbershop_subscriptions table for platform-level subscription management
CREATE TABLE public.barbershop_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL DEFAULT 'trial', -- trial, basic, professional, enterprise
  status TEXT NOT NULL DEFAULT 'active', -- active, suspended, cancelled
  trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(barbershop_id)
);

-- Enable RLS
ALTER TABLE public.barbershop_subscriptions ENABLE ROW LEVEL SECURITY;

-- Super admin can manage all subscriptions
CREATE POLICY "Super admin pode gerenciar assinaturas de barbearias"
ON public.barbershop_subscriptions
FOR ALL
USING (has_role(auth.uid(), 'super_admin'));

-- Barbershop admins can view their own subscription
CREATE POLICY "Admin da barbearia pode ver sua assinatura"
ON public.barbershop_subscriptions
FOR SELECT
USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- Create trigger for updated_at
CREATE TRIGGER update_barbershop_subscriptions_updated_at
BEFORE UPDATE ON public.barbershop_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity_logs table for platform-level logging
CREATE TABLE public.platform_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL, -- barbershop_created, subscription_changed, barbershop_suspended, etc.
  entity_type TEXT NOT NULL, -- barbershop, subscription, user
  entity_id UUID,
  performed_by UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;

-- Only super admins can see and create logs
CREATE POLICY "Super admin pode ver logs"
ON public.platform_activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin pode criar logs"
ON public.platform_activity_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'));
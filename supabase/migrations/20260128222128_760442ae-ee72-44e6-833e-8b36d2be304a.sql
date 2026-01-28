-- Add ASAAS payment fields to barbershop_subscriptions
ALTER TABLE public.barbershop_subscriptions 
ADD COLUMN IF NOT EXISTS asaas_customer_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_payment_id TEXT,
ADD COLUMN IF NOT EXISTS asaas_payment_link TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_value NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_barbershop_subscriptions_asaas_payment 
ON barbershop_subscriptions(asaas_payment_id);

-- Create platform_plans table for system subscription plans
CREATE TABLE IF NOT EXISTS public.platform_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY', -- MONTHLY, YEARLY
  features JSONB DEFAULT '[]'::jsonb,
  max_professionals INTEGER,
  max_services INTEGER,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

-- Everyone can view active plans
CREATE POLICY "Anyone can view active platform plans"
ON public.platform_plans FOR SELECT
USING (is_active = true);

-- Only super_admin can manage plans
CREATE POLICY "Super admin can manage platform plans"
ON public.platform_plans FOR ALL
TO authenticated
USING (is_super_admin(auth.uid()));

-- Insert default platform plans
INSERT INTO platform_plans (name, description, price, billing_cycle, features, max_professionals, max_services, sort_order) VALUES
('Básico', 'Ideal para barbearias iniciantes', 49.90, 'MONTHLY', 
 '["Até 2 profissionais", "Até 10 serviços", "Agendamento online", "Notificações WhatsApp"]'::jsonb, 
 2, 10, 1),
('Profissional', 'Para barbearias em crescimento', 99.90, 'MONTHLY', 
 '["Até 5 profissionais", "Serviços ilimitados", "Agendamento online", "Notificações WhatsApp", "Relatórios avançados", "Gestão de comissões"]'::jsonb, 
 5, NULL, 2),
('Premium', 'Recursos completos para sua barbearia', 199.90, 'MONTHLY', 
 '["Profissionais ilimitados", "Serviços ilimitados", "Agendamento online", "Notificações WhatsApp", "Relatórios avançados", "Gestão de comissões", "Multi-unidades", "Suporte prioritário"]'::jsonb, 
 NULL, NULL, 3)
ON CONFLICT DO NOTHING;

-- Trigger for updated_at
CREATE OR REPLACE TRIGGER update_platform_plans_updated_at
BEFORE UPDATE ON platform_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
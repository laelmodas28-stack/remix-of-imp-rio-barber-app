-- Tabela para armazenar taxas de comissão por profissional
CREATE TABLE public.professional_commissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 50.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(professional_id, barbershop_id)
);

-- Tabela para registrar pagamentos de comissão
CREATE TABLE public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for professional_commissions
CREATE POLICY "Admins can manage commissions"
ON public.professional_commissions
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(barbershop_id, auth.uid()));

CREATE POLICY "Professionals can view their own commission rate"
ON public.professional_commissions
FOR SELECT
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- RLS Policies for commission_payments
CREATE POLICY "Admins can manage commission payments"
ON public.commission_payments
FOR ALL
TO authenticated
USING (public.is_barbershop_admin(barbershop_id, auth.uid()));

CREATE POLICY "Professionals can view their own payments"
ON public.commission_payments
FOR SELECT
TO authenticated
USING (
  professional_id IN (
    SELECT id FROM public.professionals WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_professional_commissions_updated_at
BEFORE UPDATE ON public.professional_commissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_commission_payments_updated_at
BEFORE UPDATE ON public.commission_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
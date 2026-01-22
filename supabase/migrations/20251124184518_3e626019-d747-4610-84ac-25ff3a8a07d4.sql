-- Create notification_settings table
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  custom_message text DEFAULT 'Olá {nome}! Seu agendamento foi confirmado para {data} às {hora}. Serviço: {servico}. Profissional: {profissional}. Aguardamos você!',
  admin_email text,
  admin_whatsapp text,
  send_to_client boolean DEFAULT true,
  send_whatsapp boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view notification settings"
  ON public.notification_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Barbershop owners can manage notification settings"
  ON public.notification_settings
  FOR ALL
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

-- Trigger for updated_at
CREATE TRIGGER update_notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
-- =====================================================
-- SERVICE ADDONS TABLE (for add-ons to services)
-- =====================================================
CREATE TABLE public.service_addons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Addons são visíveis publicamente"
  ON public.service_addons FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin pode gerenciar addons"
  ON public.service_addons FOR ALL
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE TRIGGER update_service_addons_updated_at
  BEFORE UPDATE ON public.service_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- CLIENT SEGMENTS/TAGS TABLE
-- =====================================================
CREATE TABLE public.client_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar segmentos"
  ON public.client_segments FOR ALL
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- =====================================================
-- CLIENT SEGMENT ASSIGNMENTS (many-to-many)
-- =====================================================
CREATE TABLE public.client_segment_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.barbershop_clients(id) ON DELETE CASCADE,
  segment_id UUID NOT NULL REFERENCES public.client_segments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(client_id, segment_id)
);

ALTER TABLE public.client_segment_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar atribuições de segmentos"
  ON public.client_segment_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.client_segments cs
      WHERE cs.id = segment_id AND is_barbershop_admin(auth.uid(), cs.barbershop_id)
    )
  );

-- =====================================================
-- NOTIFICATION TEMPLATES TABLE
-- =====================================================
CREATE TABLE public.notification_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'whatsapp', -- whatsapp, email, sms
  trigger_event TEXT NOT NULL, -- booking_confirmed, booking_reminder, booking_cancelled, etc.
  subject TEXT, -- for emails
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar templates"
  ON public.notification_templates FOR ALL
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE TRIGGER update_notification_templates_updated_at
  BEFORE UPDATE ON public.notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- NOTIFICATION LOGS TABLE
-- =====================================================
CREATE TABLE public.notification_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.notification_templates(id) ON DELETE SET NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recipient_contact TEXT NOT NULL, -- phone or email
  channel TEXT NOT NULL, -- whatsapp, email, sms
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sent, delivered, failed
  content TEXT,
  error_message TEXT,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ver logs de notificação"
  ON public.notification_logs FOR SELECT
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- =====================================================
-- WAITING LIST TABLE
-- =====================================================
CREATE TABLE public.waiting_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, contacted, scheduled, cancelled
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar lista de espera"
  ON public.waiting_list FOR ALL
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE TRIGGER update_waiting_list_updated_at
  BEFORE UPDATE ON public.waiting_list
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- BARBERSHOP SETTINGS/PREFERENCES TABLE
-- =====================================================
CREATE TABLE public.barbershop_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL UNIQUE REFERENCES public.barbershops(id) ON DELETE CASCADE,
  booking_advance_days INTEGER DEFAULT 30, -- how many days in advance clients can book
  booking_cancellation_hours INTEGER DEFAULT 2, -- minimum hours before to cancel
  auto_confirm_bookings BOOLEAN DEFAULT false,
  send_booking_reminders BOOLEAN DEFAULT true,
  reminder_hours_before INTEGER DEFAULT 24,
  allow_online_payments BOOLEAN DEFAULT false,
  require_deposit BOOLEAN DEFAULT false,
  deposit_percentage NUMERIC DEFAULT 0,
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.barbershop_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode gerenciar configurações"
  ON public.barbershop_settings FOR ALL
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE TRIGGER update_barbershop_settings_updated_at
  BEFORE UPDATE ON public.barbershop_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- IMPORT LOGS TABLE
-- =====================================================
CREATE TABLE public.import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id UUID NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  import_type TEXT NOT NULL, -- clients, services, professionals
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  total_records INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  error_details JSONB,
  created_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin pode ver logs de importação"
  ON public.import_logs FOR ALL
  USING (is_barbershop_admin(auth.uid(), barbershop_id));
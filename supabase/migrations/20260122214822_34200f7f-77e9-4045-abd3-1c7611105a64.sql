-- =====================================================
-- MIGRAÇÃO: Alinhar schema com especificação completa
-- =====================================================

-- 1. Adicionar colunas faltantes em bookings
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS price numeric;

-- Copiar dados de total_price para price se existir
UPDATE public.bookings SET price = total_price WHERE price IS NULL AND total_price IS NOT NULL;

-- 2. Adicionar colunas faltantes em barbershops
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS theme_primary_color text DEFAULT '#D4AF37';
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS theme_secondary_color text DEFAULT '#1a1a1a';
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS business_hours jsonb DEFAULT '{}'::jsonb;

-- Copiar primary_color para theme_primary_color
UPDATE public.barbershops SET theme_primary_color = primary_color WHERE theme_primary_color IS NULL AND primary_color IS NOT NULL;

-- 3. Adicionar colunas faltantes em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_id uuid;

-- Copiar full_name para name se existir
UPDATE public.profiles SET name = full_name WHERE name IS NULL AND full_name IS NOT NULL;
UPDATE public.profiles SET user_id = id WHERE user_id IS NULL;

-- 4. Adicionar colunas faltantes em professionals
ALTER TABLE public.professionals ADD COLUMN IF NOT EXISTS commission_percentage numeric DEFAULT 50.00;

-- 5. Criar tabela service_addons
CREATE TABLE IF NOT EXISTS public.service_addons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 15,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 6. Adicionar coluna user_id em barbershop_clients se não existir
ALTER TABLE public.barbershop_clients ADD COLUMN IF NOT EXISTS user_id uuid;
UPDATE public.barbershop_clients SET user_id = client_id WHERE user_id IS NULL;

-- 7. Criar tabela professional_availability
CREATE TABLE IF NOT EXISTS public.professional_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 8. Criar tabela professional_time_blocks
CREATE TABLE IF NOT EXISTS public.professional_time_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  block_type text NOT NULL DEFAULT 'break',
  title text NOT NULL DEFAULT 'Bloqueio',
  notes text,
  block_date date,
  day_of_week integer,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  is_recurring boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 9. Criar tabela client_segments
CREATE TABLE IF NOT EXISTS public.client_segments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 10. Criar tabela client_segment_assignments
CREATE TABLE IF NOT EXISTS public.client_segment_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  segment_id uuid NOT NULL REFERENCES public.client_segments(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 11. Adicionar colunas faltantes em subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS benefits text[] DEFAULT '{}'::text[];
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly';
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS original_price numeric;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS max_professionals integer;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS is_highlighted boolean DEFAULT false;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS highlight_label text;
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- 12. Adicionar colunas faltantes em client_subscriptions
ALTER TABLE public.client_subscriptions ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.client_subscriptions ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;
ALTER TABLE public.client_subscriptions ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;
ALTER TABLE public.client_subscriptions ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE public.client_subscriptions ADD COLUMN IF NOT EXISTS transaction_id text;
ALTER TABLE public.client_subscriptions ADD COLUMN IF NOT EXISTS mercadopago_preference_id text;

-- Copiar dados existentes
UPDATE public.client_subscriptions SET user_id = client_id WHERE user_id IS NULL;
UPDATE public.client_subscriptions SET started_at = start_date::timestamp with time zone WHERE started_at IS NULL AND start_date IS NOT NULL;
UPDATE public.client_subscriptions SET expires_at = end_date::timestamp with time zone WHERE expires_at IS NULL AND end_date IS NOT NULL;

-- 13. Criar tabela barbershop_subscriptions
CREATE TABLE IF NOT EXISTS public.barbershop_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  plan_type text NOT NULL DEFAULT 'trial',
  status text NOT NULL DEFAULT 'active',
  trial_started_at timestamp with time zone DEFAULT now(),
  trial_ends_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
  subscription_started_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,
  notes text,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 14. Criar tabela barbershop_settings
CREATE TABLE IF NOT EXISTS public.barbershop_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL UNIQUE REFERENCES public.barbershops(id) ON DELETE CASCADE,
  timezone text DEFAULT 'America/Sao_Paulo',
  booking_advance_days integer DEFAULT 30,
  booking_cancellation_hours integer DEFAULT 2,
  auto_confirm_bookings boolean DEFAULT false,
  send_booking_confirmation boolean DEFAULT true,
  send_booking_reminder boolean DEFAULT true,
  send_booking_reminders boolean DEFAULT true,
  reminder_hours_before integer DEFAULT 24,
  whatsapp_enabled boolean DEFAULT false,
  whatsapp_send_booking_confirmation boolean DEFAULT true,
  whatsapp_send_booking_reminder boolean DEFAULT true,
  n8n_webhook_url text,
  n8n_whatsapp_webhook_url text,
  evolution_api_url text,
  evolution_api_key text,
  evolution_instance_name text,
  allow_online_payments boolean DEFAULT false,
  require_deposit boolean DEFAULT false,
  deposit_percentage numeric DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 15. Criar tabela gallery_images
CREATE TABLE IF NOT EXISTS public.gallery_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text,
  order_index integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 16. Adicionar coluna is_read em notifications se não existir
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;
UPDATE public.notifications SET is_read = read WHERE is_read IS NULL AND read IS NOT NULL;

-- 17. Criar tabela notification_templates
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'whatsapp',
  trigger_event text NOT NULL,
  subject text,
  content text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 18. Criar tabela notification_logs
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  template_id uuid,
  recipient_id uuid,
  recipient_contact text NOT NULL,
  channel text NOT NULL,
  content text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 19. Criar tabela waiting_list
CREATE TABLE IF NOT EXISTS public.waiting_list (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_id uuid,
  client_name text NOT NULL,
  client_phone text,
  service_id uuid,
  professional_id uuid,
  preferred_date date,
  preferred_time_start time without time zone,
  preferred_time_end time without time zone,
  status text NOT NULL DEFAULT 'waiting',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 20. Criar tabela import_logs
CREATE TABLE IF NOT EXISTS public.import_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid NOT NULL REFERENCES public.barbershops(id) ON DELETE CASCADE,
  import_type text NOT NULL,
  filename text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  total_records integer DEFAULT 0,
  success_count integer DEFAULT 0,
  error_count integer DEFAULT 0,
  error_details jsonb,
  created_by uuid,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 21. Adicionar colunas faltantes em tutorial_videos
ALTER TABLE public.tutorial_videos ADD COLUMN IF NOT EXISTS thumbnail_url text;
ALTER TABLE public.tutorial_videos ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

-- 22. Criar tabela payment_transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barbershop_id uuid REFERENCES public.barbershops(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  plan_id uuid,
  subscription_id uuid,
  amount numeric NOT NULL,
  status text DEFAULT 'pending',
  payment_method text,
  preference_id text,
  transaction_id text,
  mercadopago_status text,
  raw_response jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 23. Criar tabela platform_activity_logs
CREATE TABLE IF NOT EXISTS public.platform_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  performed_by uuid,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- HABILITAR RLS NAS NOVAS TABELAS
-- =====================================================

ALTER TABLE public.service_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_time_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_segment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbershop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_activity_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PARA NOVAS TABELAS
-- =====================================================

-- service_addons
CREATE POLICY "Addons são visíveis publicamente" ON public.service_addons FOR SELECT USING (is_active = true);
CREATE POLICY "Admin pode gerenciar addons" ON public.service_addons FOR ALL USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- professional_availability
CREATE POLICY "Disponibilidade é visível publicamente" ON public.professional_availability FOR SELECT USING (true);
CREATE POLICY "Admin pode gerenciar disponibilidade" ON public.professional_availability FOR ALL USING (
  EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_availability.professional_id AND is_barbershop_admin(auth.uid(), p.barbershop_id))
);

-- professional_time_blocks
CREATE POLICY "Bloqueios são visíveis publicamente" ON public.professional_time_blocks FOR SELECT USING (true);
CREATE POLICY "Admin pode gerenciar bloqueios" ON public.professional_time_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM professionals p WHERE p.id = professional_time_blocks.professional_id AND is_barbershop_admin(auth.uid(), p.barbershop_id))
);

-- client_segments
CREATE POLICY "Admin pode gerenciar segmentos" ON public.client_segments FOR ALL USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- client_segment_assignments
CREATE POLICY "Admin pode gerenciar atribuições de segmentos" ON public.client_segment_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM client_segments cs WHERE cs.id = client_segment_assignments.segment_id AND is_barbershop_admin(auth.uid(), cs.barbershop_id))
);

-- barbershop_subscriptions
CREATE POLICY "Admin da barbearia pode ver sua assinatura" ON public.barbershop_subscriptions FOR SELECT USING (is_barbershop_admin(auth.uid(), barbershop_id));
CREATE POLICY "Super admin pode gerenciar assinaturas de barbearias" ON public.barbershop_subscriptions FOR ALL USING (has_role(auth.uid(), 'super_admin'::app_role));

-- barbershop_settings
CREATE POLICY "Admin pode gerenciar configurações" ON public.barbershop_settings FOR ALL USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- gallery_images
CREATE POLICY "Galeria é visível publicamente" ON public.gallery_images FOR SELECT USING (true);
CREATE POLICY "Admin pode gerenciar galeria" ON public.gallery_images FOR ALL USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- notification_templates
CREATE POLICY "Admin pode gerenciar templates" ON public.notification_templates FOR ALL USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- notification_logs
CREATE POLICY "Admin pode ver logs de notificação" ON public.notification_logs FOR SELECT USING (is_barbershop_admin(auth.uid(), barbershop_id));
CREATE POLICY "Sistema pode inserir logs" ON public.notification_logs FOR INSERT WITH CHECK (true);

-- waiting_list
CREATE POLICY "Admin pode gerenciar lista de espera" ON public.waiting_list FOR ALL USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- import_logs
CREATE POLICY "Admin pode ver logs de importação" ON public.import_logs FOR ALL USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- payment_transactions
CREATE POLICY "Users can view their own transactions" ON public.payment_transactions FOR SELECT USING (auth.uid() = client_id);
CREATE POLICY "Users can insert transactions" ON public.payment_transactions FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update own transactions" ON public.payment_transactions FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Barbershop admins can view transactions" ON public.payment_transactions FOR SELECT USING (is_barbershop_admin(auth.uid(), barbershop_id));
CREATE POLICY "Admins can update transactions" ON public.payment_transactions FOR UPDATE USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- platform_activity_logs
CREATE POLICY "Super admin pode ver logs" ON public.platform_activity_logs FOR SELECT USING (has_role(auth.uid(), 'super_admin'::app_role));
CREATE POLICY "Super admin pode criar logs" ON public.platform_activity_logs FOR INSERT WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));
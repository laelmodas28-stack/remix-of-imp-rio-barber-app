-- Adicionar campos para SMS e Push Notifications na tabela notification_settings
ALTER TABLE public.notification_settings
ADD COLUMN IF NOT EXISTS send_sms boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS sms_provider text,
ADD COLUMN IF NOT EXISTS sms_api_key text,
ADD COLUMN IF NOT EXISTS sms_from_number text,
ADD COLUMN IF NOT EXISTS push_enabled boolean DEFAULT false;

-- Adicionar comentários
COMMENT ON COLUMN public.notification_settings.send_sms IS 'Se deve enviar SMS para o cliente';
COMMENT ON COLUMN public.notification_settings.sms_provider IS 'Provedor de SMS (vonage, messagebird, twilio-alternative, etc)';
COMMENT ON COLUMN public.notification_settings.sms_api_key IS 'API key do provedor de SMS';
COMMENT ON COLUMN public.notification_settings.sms_from_number IS 'Número de origem para SMS';
COMMENT ON COLUMN public.notification_settings.push_enabled IS 'Se notificações push estão habilitadas';
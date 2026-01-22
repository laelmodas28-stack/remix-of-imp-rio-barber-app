-- Add separate webhook URL for WhatsApp notifications
ALTER TABLE public.barbershop_settings 
ADD COLUMN IF NOT EXISTS n8n_whatsapp_webhook_url TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.barbershop_settings.n8n_whatsapp_webhook_url IS 'Webhook URL for WhatsApp notifications via n8n';
COMMENT ON COLUMN public.barbershop_settings.n8n_webhook_url IS 'Webhook URL for email notifications via n8n';
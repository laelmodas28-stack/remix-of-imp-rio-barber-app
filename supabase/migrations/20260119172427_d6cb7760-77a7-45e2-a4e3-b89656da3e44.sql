-- Add Evolution API configuration fields to barbershop_settings
ALTER TABLE public.barbershop_settings 
ADD COLUMN IF NOT EXISTS evolution_api_url TEXT,
ADD COLUMN IF NOT EXISTS evolution_api_key TEXT,
ADD COLUMN IF NOT EXISTS evolution_instance_name TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS whatsapp_send_booking_confirmation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS whatsapp_send_booking_reminder BOOLEAN DEFAULT true;
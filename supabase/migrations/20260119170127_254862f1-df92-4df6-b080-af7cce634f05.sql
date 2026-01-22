-- Add n8n webhook URL to barbershop_settings
ALTER TABLE public.barbershop_settings 
ADD COLUMN IF NOT EXISTS n8n_webhook_url TEXT,
ADD COLUMN IF NOT EXISTS send_booking_confirmation BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS send_booking_reminder BOOLEAN DEFAULT true;
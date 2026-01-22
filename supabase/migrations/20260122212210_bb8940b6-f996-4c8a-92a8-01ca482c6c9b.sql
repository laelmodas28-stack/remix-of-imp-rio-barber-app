-- Add is_active column to barbershops table for super admin management
ALTER TABLE public.barbershops 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
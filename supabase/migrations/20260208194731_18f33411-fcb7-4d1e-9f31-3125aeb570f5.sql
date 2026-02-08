-- Add benefits column to subscription_plans table for custom benefits text
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS benefits TEXT[] DEFAULT '{}';
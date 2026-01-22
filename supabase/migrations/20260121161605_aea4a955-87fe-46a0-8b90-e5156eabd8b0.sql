-- Add new fields to subscription_plans table for the new pricing model
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS max_professionals integer DEFAULT null,
ADD COLUMN IF NOT EXISTS billing_period text DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS original_price numeric,
ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_highlighted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS highlight_label text,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add comment to clarify max_professionals: null means unlimited
COMMENT ON COLUMN subscription_plans.max_professionals IS 'Maximum professionals allowed. NULL means unlimited.';
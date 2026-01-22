-- Add payment fields to client_subscriptions
ALTER TABLE client_subscriptions 
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS transaction_id text,
  ADD COLUMN IF NOT EXISTS mercadopago_preference_id text;

-- Create payment transactions table for logging
CREATE TABLE IF NOT EXISTS payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES client_subscriptions(id) ON DELETE CASCADE,
  barbershop_id uuid REFERENCES barbershops(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  plan_id uuid REFERENCES subscription_plans(id) ON DELETE SET NULL,
  transaction_id text,
  preference_id text,
  payment_method text,
  amount decimal(10,2) NOT NULL,
  status text DEFAULT 'pending',
  mercadopago_status text,
  raw_response jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for payment_transactions
CREATE POLICY "Users can view their own transactions"
  ON payment_transactions FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Barbershop admins can view transactions"
  ON payment_transactions FOR SELECT
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Users can insert transactions"
  ON payment_transactions FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Users can update own transactions"
  ON payment_transactions FOR UPDATE
  USING (auth.uid() = client_id);

CREATE POLICY "Admins can update transactions"
  ON payment_transactions FOR UPDATE
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- Add RLS policy for client_subscriptions INSERT (missing)
CREATE POLICY "Usuários podem criar assinaturas"
  ON client_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add RLS policy for client_subscriptions UPDATE
CREATE POLICY "Sistema pode atualizar assinaturas"
  ON client_subscriptions FOR UPDATE
  USING (auth.uid() = user_id OR is_barbershop_admin(auth.uid(), barbershop_id));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_client ON payment_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_barbershop ON payment_transactions(barbershop_id);
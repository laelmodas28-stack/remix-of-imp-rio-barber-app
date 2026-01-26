-- Create enums for commission system
CREATE TYPE commission_source_type AS ENUM ('APPOINTMENT', 'ORDER', 'INVOICE', 'OTHER');
CREATE TYPE commission_payment_status AS ENUM ('PENDING', 'PAID');

-- commission_items table - granular commission records per booking
CREATE TABLE public.commission_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  source_type commission_source_type NOT NULL DEFAULT 'APPOINTMENT',
  occurred_at TIMESTAMPTZ NOT NULL,
  gross_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  applied_commission_rate NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status commission_payment_status NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- commission_rate_history table - audit trail for rate changes
CREATE TABLE public.commission_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  old_rate_percent NUMERIC(5,2),
  new_rate_percent NUMERIC(5,2) NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changed_by_user_id UUID NOT NULL
);

-- commission_payment_logs table - bulk payment audit records
CREATE TABLE public.commission_payment_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  barbershop_id UUID NOT NULL REFERENCES barbershops(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES professionals(id) ON DELETE SET NULL,
  commission_item_ids UUID[] NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_by_user_id UUID NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_commission_items_barbershop ON commission_items(barbershop_id);
CREATE INDEX idx_commission_items_professional ON commission_items(professional_id);
CREATE INDEX idx_commission_items_occurred_at ON commission_items(occurred_at);
CREATE INDEX idx_commission_items_payment_status ON commission_items(payment_status);
CREATE INDEX idx_commission_items_booking ON commission_items(booking_id);
CREATE INDEX idx_commission_rate_history_professional ON commission_rate_history(professional_id);
CREATE INDEX idx_commission_payment_logs_barbershop ON commission_payment_logs(barbershop_id);

-- Enable RLS
ALTER TABLE commission_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_rate_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_payment_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for commission_items
CREATE POLICY "Admin can view commission_items"
  ON commission_items FOR SELECT
  TO authenticated
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Admin can insert commission_items"
  ON commission_items FOR INSERT
  TO authenticated
  WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Admin can update commission_items"
  ON commission_items FOR UPDATE
  TO authenticated
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Admin can delete commission_items"
  ON commission_items FOR DELETE
  TO authenticated
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

-- RLS Policies for commission_rate_history
CREATE POLICY "Admin can view commission_rate_history"
  ON commission_rate_history FOR SELECT
  TO authenticated
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Admin can insert commission_rate_history"
  ON commission_rate_history FOR INSERT
  TO authenticated
  WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

-- RLS Policies for commission_payment_logs
CREATE POLICY "Admin can view commission_payment_logs"
  ON commission_payment_logs FOR SELECT
  TO authenticated
  USING (is_barbershop_admin(auth.uid(), barbershop_id));

CREATE POLICY "Admin can insert commission_payment_logs"
  ON commission_payment_logs FOR INSERT
  TO authenticated
  WITH CHECK (is_barbershop_admin(auth.uid(), barbershop_id));

-- Trigger to update updated_at on commission_items
CREATE TRIGGER update_commission_items_updated_at
  BEFORE UPDATE ON commission_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to create commission_item when booking is completed
CREATE OR REPLACE FUNCTION public.create_commission_item_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_commission_rate NUMERIC(5,2);
  v_gross_amount NUMERIC(10,2);
  v_commission_amount NUMERIC(10,2);
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get the current commission rate for the professional
    SELECT COALESCE(pc.commission_rate, p.commission_percentage, 0)
    INTO v_commission_rate
    FROM professionals p
    LEFT JOIN professional_commissions pc ON pc.professional_id = p.id AND pc.barbershop_id = NEW.barbershop_id
    WHERE p.id = NEW.professional_id;

    -- Calculate amounts
    v_gross_amount := COALESCE(NEW.total_price, NEW.price, 0);
    v_commission_amount := v_gross_amount * (v_commission_rate / 100);

    -- Insert the commission item
    INSERT INTO commission_items (
      barbershop_id,
      professional_id,
      booking_id,
      source_type,
      occurred_at,
      gross_amount,
      applied_commission_rate,
      commission_amount,
      payment_status
    ) VALUES (
      NEW.barbershop_id,
      NEW.professional_id,
      NEW.id,
      'APPOINTMENT',
      COALESCE(NEW.booking_date::timestamptz, now()),
      v_gross_amount,
      v_commission_rate,
      v_commission_amount,
      'PENDING'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on bookings table
CREATE TRIGGER create_commission_on_booking_complete
  AFTER INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION create_commission_item_on_booking();
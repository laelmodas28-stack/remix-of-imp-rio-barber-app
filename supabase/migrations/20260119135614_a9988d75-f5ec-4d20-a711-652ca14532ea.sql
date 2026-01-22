-- Create table for professional time blocks (breaks, appointments, etc.)
CREATE TABLE public.professional_time_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Bloqueio',
  block_type TEXT NOT NULL DEFAULT 'break' CHECK (block_type IN ('break', 'lunch', 'appointment', 'other')),
  -- For recurring blocks (weekly)
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6), -- Only for recurring
  -- For specific date blocks
  block_date DATE, -- Only for non-recurring
  -- Time range
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_time_blocks ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage blocks
CREATE POLICY "Admin pode gerenciar bloqueios"
ON public.professional_time_blocks
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.id = professional_time_blocks.professional_id
    AND is_barbershop_admin(auth.uid(), p.barbershop_id)
  )
);

-- Policy: Public can view blocks (for booking validation)
CREATE POLICY "Bloqueios são visíveis publicamente"
ON public.professional_time_blocks
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_professional_time_blocks_updated_at
BEFORE UPDATE ON public.professional_time_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for efficient queries
CREATE INDEX idx_time_blocks_professional ON public.professional_time_blocks(professional_id);
CREATE INDEX idx_time_blocks_date ON public.professional_time_blocks(block_date) WHERE block_date IS NOT NULL;
CREATE INDEX idx_time_blocks_recurring ON public.professional_time_blocks(professional_id, day_of_week) WHERE is_recurring = true;
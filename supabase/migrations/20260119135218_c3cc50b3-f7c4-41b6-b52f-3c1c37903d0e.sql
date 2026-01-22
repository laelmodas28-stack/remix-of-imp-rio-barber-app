-- Create table for professional availability (working hours by day of week)
CREATE TABLE public.professional_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(professional_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.professional_availability ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage availability
CREATE POLICY "Admin pode gerenciar disponibilidade"
ON public.professional_availability
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM professionals p
    WHERE p.id = professional_availability.professional_id
    AND is_barbershop_admin(auth.uid(), p.barbershop_id)
  )
);

-- Policy: Public can view availability (for booking)
CREATE POLICY "Disponibilidade é visível publicamente"
ON public.professional_availability
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_professional_availability_updated_at
BEFORE UPDATE ON public.professional_availability
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
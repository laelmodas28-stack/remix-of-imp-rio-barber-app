-- Adicionar coluna is_official
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_barbershops_is_official ON public.barbershops(is_official) WHERE is_official = true;

-- Marcar Imperio Barber como oficial (por nome ou slug)
UPDATE public.barbershops 
SET is_official = true
WHERE (LOWER(name) LIKE '%império%' OR LOWER(name) LIKE '%imperio%' OR slug = 'imperio-barber')
AND is_official = false;

-- Se não encontrou por nome, marcar a primeira barbearia criada como oficial
UPDATE public.barbershops 
SET is_official = true
WHERE id = (
  SELECT id FROM public.barbershops 
  ORDER BY created_at ASC 
  LIMIT 1
)
AND NOT EXISTS (
  SELECT 1 FROM public.barbershops WHERE is_official = true
);

-- Garantir que apenas uma barbearia seja oficial
DO $$
DECLARE
  official_count INTEGER;
  first_official_id UUID;
BEGIN
  SELECT COUNT(*) INTO official_count FROM public.barbershops WHERE is_official = true;
  
  IF official_count > 1 THEN
    -- Pegar o ID da primeira barbearia oficial criada
    SELECT id INTO first_official_id 
    FROM public.barbershops 
    WHERE is_official = true 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Desmarcar as outras
    UPDATE public.barbershops 
    SET is_official = false
    WHERE is_official = true 
    AND id != first_official_id;
  END IF;
END $$;
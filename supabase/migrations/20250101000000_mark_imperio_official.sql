-- Marcar Imperio Barber como barbearia oficial
-- A barbearia oficial é acessível diretamente na raiz "/" sem precisar de slug

-- Adicionar coluna is_official
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_barbershops_is_official ON public.barbershops(is_official) WHERE is_official = true;

-- Marcar Imperio Barber como oficial (por nome ou slug)
UPDATE public.barbershops 
SET is_official = true
WHERE LOWER(name) LIKE '%império%' OR LOWER(name) LIKE '%imperio%' OR slug = 'imperio-barber'
LIMIT 1;

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
BEGIN
  SELECT COUNT(*) INTO official_count FROM public.barbershops WHERE is_official = true;
  
  IF official_count > 1 THEN
    -- Se houver mais de uma, manter apenas a primeira criada
    UPDATE public.barbershops 
    SET is_official = false
    WHERE is_official = true 
    AND id NOT IN (
      SELECT id FROM public.barbershops 
      WHERE is_official = true 
      ORDER BY created_at ASC 
      LIMIT 1
    );
  END IF;
END $$;


-- Script para marcar Imperio Barber como barbearia oficial
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Adicionar coluna is_official se não existir
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS is_official BOOLEAN DEFAULT false;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_barbershops_is_official ON public.barbershops(is_official) WHERE is_official = true;

-- 3. Garantir que apenas uma barbearia seja oficial (remover outras se houver)
UPDATE public.barbershops 
SET is_official = false
WHERE is_official = true;

-- 4. Marcar Imperio Barber como oficial (por nome ou slug)
UPDATE public.barbershops 
SET is_official = true
WHERE LOWER(name) LIKE '%império%' 
   OR LOWER(name) LIKE '%imperio%' 
   OR slug = 'imperio-barber'
LIMIT 1;

-- 5. Se não encontrou Imperio Barber, marcar a primeira barbearia criada como oficial
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

-- 6. Verificar resultado
SELECT id, name, slug, is_official, created_at 
FROM public.barbershops 
WHERE is_official = true;


-- =============================================
-- Sistema de URLs Individuais para Barbearias
-- =============================================

-- Passo 1: Adicionar coluna slug
ALTER TABLE public.barbershops ADD COLUMN IF NOT EXISTS slug TEXT;

-- Passo 2: Criar função para gerar slug a partir do nome
CREATE OR REPLACE FUNCTION public.generate_barbershop_slug(name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  base_slug TEXT;
BEGIN
  -- Normalizar: lowercase, remover acentos, substituir espaços por hífens
  base_slug := LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(name, '[àáâãäå]', 'a', 'gi'),
              '[èéêë]', 'e', 'gi'
            ),
            '[ìíîï]', 'i', 'gi'
          ),
          '[òóôõö]', 'o', 'gi'
        ),
        '[ùúûü]', 'u', 'gi'
      ),
      '[ç]', 'c', 'gi'
    )
  );
  
  -- Substituir caracteres não alfanuméricos por hífen
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '-', 'g');
  
  -- Remover hífens no início e fim
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  RETURN base_slug;
END;
$$;

-- Passo 3: Gerar slugs para barbearias existentes
UPDATE public.barbershops 
SET slug = public.generate_barbershop_slug(name)
WHERE slug IS NULL;

-- Passo 4: Garantir slugs únicos (adicionar sufixo numérico se necessário)
DO $$
DECLARE
  r RECORD;
  new_slug TEXT;
  counter INT;
BEGIN
  FOR r IN 
    SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at) as rn
    FROM public.barbershops
    WHERE slug IN (SELECT slug FROM public.barbershops GROUP BY slug HAVING COUNT(*) > 1)
  LOOP
    IF r.rn > 1 THEN
      counter := r.rn;
      new_slug := r.slug || '-' || counter;
      
      -- Verificar se o novo slug já existe
      WHILE EXISTS (SELECT 1 FROM public.barbershops WHERE slug = new_slug) LOOP
        counter := counter + 1;
        new_slug := r.slug || '-' || counter;
      END LOOP;
      
      UPDATE public.barbershops SET slug = new_slug WHERE id = r.id;
    END IF;
  END LOOP;
END;
$$;

-- Passo 5: Tornar coluna NOT NULL e UNIQUE
ALTER TABLE public.barbershops ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_barbershops_slug ON public.barbershops(slug);

-- Passo 6: Criar trigger para gerar slug automaticamente
CREATE OR REPLACE FUNCTION public.set_barbershop_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 1;
BEGIN
  -- Se slug não foi fornecido ou está vazio, gerar a partir do nome
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug := generate_barbershop_slug(NEW.name);
    final_slug := base_slug;
    
    -- Garantir unicidade
    WHILE EXISTS (SELECT 1 FROM barbershops WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
      counter := counter + 1;
      final_slug := base_slug || '-' || counter;
    END LOOP;
    
    NEW.slug := final_slug;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger
DROP TRIGGER IF EXISTS trigger_set_barbershop_slug ON public.barbershops;
CREATE TRIGGER trigger_set_barbershop_slug
BEFORE INSERT OR UPDATE ON public.barbershops
FOR EACH ROW
EXECUTE FUNCTION public.set_barbershop_slug();
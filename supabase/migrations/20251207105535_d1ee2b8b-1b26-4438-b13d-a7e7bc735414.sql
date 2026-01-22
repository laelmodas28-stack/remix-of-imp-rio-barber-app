-- 1. Corrigir política de notificações para restringir inserções
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

CREATE POLICY "Service role can insert notifications" ON notifications
FOR INSERT WITH CHECK (
  -- Permitir service_role OU usuários inserindo notificações para si mesmos
  auth.role() = 'service_role' OR user_id = auth.uid()
);

-- 2. Corrigir search_path na função generate_barbershop_slug
CREATE OR REPLACE FUNCTION public.generate_barbershop_slug(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $function$
DECLARE
  base_slug TEXT;
BEGIN
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
  
  base_slug := REGEXP_REPLACE(base_slug, '[^a-z0-9]+', '-', 'g');
  base_slug := TRIM(BOTH '-' FROM base_slug);
  
  RETURN base_slug;
END;
$function$;
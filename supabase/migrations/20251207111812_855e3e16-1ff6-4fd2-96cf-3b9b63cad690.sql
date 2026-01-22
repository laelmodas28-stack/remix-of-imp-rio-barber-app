-- Remover política antiga que só permite autenticados
DROP POLICY IF EXISTS "Everyone can view barbershops" ON public.barbershops;

-- Criar política que permite leitura pública (sem necessidade de login)
CREATE POLICY "Public can view barbershops" 
ON public.barbershops 
FOR SELECT 
USING (true);
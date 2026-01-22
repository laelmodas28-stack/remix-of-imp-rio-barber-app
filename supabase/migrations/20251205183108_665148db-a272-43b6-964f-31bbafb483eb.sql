-- =============================================
-- CORREÇÃO DE SEGURANÇA CRÍTICA: Tabela profiles
-- =============================================

-- Passo 1: Criar função SECURITY DEFINER para verificar acesso a perfis
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- Pode ver próprio perfil
    _viewer_id = _profile_id
    OR
    -- Ou é admin de uma barbearia onde o perfil é cliente
    EXISTS (
      SELECT 1 
      FROM barbershop_clients bc
      INNER JOIN user_roles ur ON ur.barbershop_id = bc.barbershop_id
      WHERE bc.client_id = _profile_id
        AND ur.user_id = _viewer_id
        AND ur.role = 'admin'
    )
    OR
    -- Ou é super_admin
    EXISTS (
      SELECT 1 
      FROM user_roles 
      WHERE user_id = _viewer_id 
        AND role = 'super_admin'
    )
$$;

-- Passo 2: Remover política vulnerável que expõe todos os perfis publicamente
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;

-- Passo 3: Criar nova política restritiva
-- Apenas usuários autenticados podem ver perfis autorizados
CREATE POLICY "Users can view authorized profiles"
ON profiles
FOR SELECT
TO authenticated
USING (can_view_profile(auth.uid(), id));
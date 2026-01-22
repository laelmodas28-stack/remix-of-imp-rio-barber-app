
-- Remover FK de user_roles para auth.users para permitir dados de teste
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;

-- Remover FK de barbershops.owner_id para profiles
ALTER TABLE public.barbershops DROP CONSTRAINT IF EXISTS barbershops_owner_id_fkey;

-- Remove a política que expõe códigos de registro válidos ao público
-- A validação de códigos é feita server-side na edge function register-barbershop
-- usando SERVICE_ROLE_KEY, então esta política não é necessária
DROP POLICY IF EXISTS "Public can validate codes" ON registration_codes;
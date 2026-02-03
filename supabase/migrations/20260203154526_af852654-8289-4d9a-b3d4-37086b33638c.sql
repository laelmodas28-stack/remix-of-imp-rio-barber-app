-- Fix overly permissive RLS policies that use WITH CHECK (true) for non-SELECT operations

-- 1. Fix notification_logs INSERT policy - should only allow authenticated users or service role
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON notification_logs;
CREATE POLICY "Sistema pode inserir logs" ON notification_logs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR
    (auth.uid() IS NOT NULL AND is_barbershop_admin(auth.uid(), barbershop_id))
  );

-- 2. Fix profiles INSERT policy - should only allow the auth trigger or the user themselves
DROP POLICY IF EXISTS "Allow insert profiles" ON profiles;
CREATE POLICY "Allow insert profiles" ON profiles
  FOR INSERT
  WITH CHECK (
    auth.role() = 'service_role'
    OR
    auth.uid() = id
  );
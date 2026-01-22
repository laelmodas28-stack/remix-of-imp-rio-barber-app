-- Fix create_client_profile function to use correct column name
CREATE OR REPLACE FUNCTION public.create_client_profile(p_name text, p_email text DEFAULT NULL::text, p_phone text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  -- Generate a new UUID for this client
  v_user_id := gen_random_uuid();
  
  -- Insert the profile with correct column name
  INSERT INTO public.profiles (user_id, name, email, phone)
  VALUES (v_user_id, p_name, p_email, p_phone);
  
  RETURN v_user_id;
END;
$function$;
-- Create a function for admins to create client profiles (bypasses RLS)
CREATE OR REPLACE FUNCTION public.create_client_profile(
  p_name TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Generate a new UUID for this client
  v_user_id := gen_random_uuid();
  
  -- Insert the profile
  INSERT INTO public.profiles (user_id, full_name, email, phone)
  VALUES (v_user_id, p_name, p_email, p_phone);
  
  RETURN v_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_client_profile TO authenticated;
-- Enable realtime for notifications table
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create a policy to allow system to insert notifications
CREATE POLICY "Sistema pode criar notificações" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create a function to create notifications for booking events
CREATE OR REPLACE FUNCTION public.create_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_barbershop_name TEXT;
  v_client_name TEXT;
  v_service_name TEXT;
  v_professional_name TEXT;
  v_admin_users UUID[];
  v_admin_id UUID;
BEGIN
  -- Get barbershop name
  SELECT name INTO v_barbershop_name FROM barbershops WHERE id = NEW.barbershop_id;
  
  -- Get client name
  SELECT name INTO v_client_name FROM profiles WHERE user_id = NEW.client_id;
  
  -- Get service name
  SELECT name INTO v_service_name FROM services WHERE id = NEW.service_id;
  
  -- Get professional name
  SELECT name INTO v_professional_name FROM professionals WHERE id = NEW.professional_id;
  
  -- Get all admin users for this barbershop
  SELECT ARRAY_AGG(user_id) INTO v_admin_users
  FROM user_roles 
  WHERE barbershop_id = NEW.barbershop_id AND role = 'admin';
  
  -- Create notification for each admin
  IF v_admin_users IS NOT NULL THEN
    FOREACH v_admin_id IN ARRAY v_admin_users
    LOOP
      -- New booking notification
      IF TG_OP = 'INSERT' THEN
        INSERT INTO notifications (user_id, barbershop_id, title, message, type)
        VALUES (
          v_admin_id,
          NEW.barbershop_id,
          'Novo Agendamento',
          COALESCE(v_client_name, 'Cliente') || ' agendou ' || COALESCE(v_service_name, 'serviço') || ' com ' || COALESCE(v_professional_name, 'profissional') || ' em ' || TO_CHAR(NEW.booking_date, 'DD/MM') || ' às ' || TO_CHAR(NEW.booking_time, 'HH24:MI'),
          'booking'
        );
      -- Cancellation notification
      ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        INSERT INTO notifications (user_id, barbershop_id, title, message, type)
        VALUES (
          v_admin_id,
          NEW.barbershop_id,
          'Agendamento Cancelado',
          COALESCE(v_client_name, 'Cliente') || ' cancelou ' || COALESCE(v_service_name, 'serviço') || ' em ' || TO_CHAR(NEW.booking_date, 'DD/MM') || ' às ' || TO_CHAR(NEW.booking_time, 'HH24:MI'),
          'cancellation'
        );
      -- Confirmation notification
      ELSIF TG_OP = 'UPDATE' AND NEW.status = 'confirmed' AND OLD.status = 'pending' THEN
        -- Notify the client that their booking was confirmed
        INSERT INTO notifications (user_id, barbershop_id, title, message, type)
        VALUES (
          NEW.client_id,
          NEW.barbershop_id,
          'Agendamento Confirmado',
          'Seu agendamento de ' || COALESCE(v_service_name, 'serviço') || ' foi confirmado para ' || TO_CHAR(NEW.booking_date, 'DD/MM') || ' às ' || TO_CHAR(NEW.booking_time, 'HH24:MI'),
          'booking'
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for booking notifications
DROP TRIGGER IF EXISTS booking_notification_trigger ON bookings;
CREATE TRIGGER booking_notification_trigger
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION create_booking_notification();
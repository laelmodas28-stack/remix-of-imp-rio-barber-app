-- Remove foreign key constraint from barbershop_clients.user_id -> auth.users
ALTER TABLE public.barbershop_clients 
DROP CONSTRAINT IF EXISTS barbershop_clients_user_id_fkey;

-- Remove foreign key constraint from bookings.client_id -> auth.users
ALTER TABLE public.bookings 
DROP CONSTRAINT IF EXISTS bookings_client_id_fkey;
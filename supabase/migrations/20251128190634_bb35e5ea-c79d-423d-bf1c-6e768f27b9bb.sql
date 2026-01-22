-- Primeiro, deletar agendamentos duplicados (mantém apenas o mais antigo)
DELETE FROM public.bookings
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY professional_id, booking_date, booking_time 
             ORDER BY created_at
           ) as rn
    FROM public.bookings
    WHERE status IN ('pending', 'confirmed')
  ) t
  WHERE t.rn > 1
);

-- Criar tabela de notificações in-app
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  barbershop_id UUID REFERENCES public.barbershops(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking_confirmation', 'booking_reminder', 'barber_notification')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para notificações
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias notificações
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (user_id = auth.uid());

-- Usuários podem marcar suas notificações como lidas
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (user_id = auth.uid());

-- Sistema pode inserir notificações
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Admins de barbearia podem ver notificações relacionadas
CREATE POLICY "Barbershop admins can view related notifications"
ON public.notifications
FOR SELECT
USING (
  barbershop_id IN (
    SELECT barbershop_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Criar índice único para evitar agendamentos duplicados
CREATE UNIQUE INDEX unique_booking_slot 
ON public.bookings (professional_id, booking_date, booking_time) 
WHERE status IN ('pending', 'confirmed');

-- Índices para performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
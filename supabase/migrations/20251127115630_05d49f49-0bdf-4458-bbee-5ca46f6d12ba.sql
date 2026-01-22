-- Adicionar campo para tempo de antecedência das notificações
ALTER TABLE notification_settings 
ADD COLUMN IF NOT EXISTS reminder_minutes INTEGER DEFAULT 30;

-- Comentário explicativo
COMMENT ON COLUMN notification_settings.reminder_minutes IS 'Minutos de antecedência para enviar lembrete de agendamento';

-- Criar tabela para controlar quais notificações já foram enviadas
CREATE TABLE IF NOT EXISTS booking_reminders_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(booking_id)
);

-- Habilitar RLS
ALTER TABLE booking_reminders_sent ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem lembretes
CREATE POLICY "Admins can manage booking reminders"
ON booking_reminders_sent
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM bookings b
    JOIN barbershops bs ON bs.id = b.barbershop_id
    WHERE b.id = booking_reminders_sent.booking_id
    AND is_barbershop_admin(auth.uid(), bs.id)
  )
);
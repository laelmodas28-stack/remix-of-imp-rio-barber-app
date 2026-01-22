-- Adicionar campos de redes sociais e horários de funcionamento à tabela barbershop_info
ALTER TABLE barbershop_info
ADD COLUMN IF NOT EXISTS tiktok text,
ADD COLUMN IF NOT EXISTS opening_time time DEFAULT '09:00:00',
ADD COLUMN IF NOT EXISTS closing_time time DEFAULT '19:00:00',
ADD COLUMN IF NOT EXISTS opening_days text[] DEFAULT ARRAY['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
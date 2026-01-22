-- Adicionar campo de mensagem personalizada na tabela barbershops
ALTER TABLE barbershops 
ADD COLUMN IF NOT EXISTS mensagem_personalizada TEXT DEFAULT 'Profissional e acolhedor';

-- Adicionar campo para ativar/desativar IA nas notificações
ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;

-- Atualizar barbershops existentes com mensagem padrão
UPDATE barbershops 
SET mensagem_personalizada = 'Profissional e acolhedor'
WHERE mensagem_personalizada IS NULL;
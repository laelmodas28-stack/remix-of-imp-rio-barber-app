-- Simplificar tabela notification_settings removendo campos técnicos
-- Remover colunas desnecessárias que serão gerenciadas pela plataforma
ALTER TABLE notification_settings 
  DROP COLUMN IF EXISTS sms_api_key,
  DROP COLUMN IF EXISTS sms_provider,
  DROP COLUMN IF EXISTS sms_from_number;

-- Atualizar registros existentes para ativar notificações por padrão
UPDATE notification_settings 
SET enabled = true 
WHERE enabled = false;

-- Alterar coluna enabled para ter default true
ALTER TABLE notification_settings 
  ALTER COLUMN enabled SET DEFAULT true;
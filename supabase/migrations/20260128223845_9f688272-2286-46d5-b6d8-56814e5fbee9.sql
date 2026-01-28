-- Update platform_plans to match landing page values
-- Delete existing plans first
DELETE FROM platform_plans;

-- Insert correct plans with monthly, quarterly, yearly billing cycles
INSERT INTO platform_plans (name, description, price, billing_cycle, features, max_professionals, max_services, is_active, sort_order) VALUES
-- Essencial Monthly
('Essencial', 'Para começar sua jornada digital', 29.90, 'MONTHLY', 
 '["1 profissional", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp"]'::jsonb, 
 1, NULL, true, 1),
-- Essencial Quarterly  
('Essencial', 'Para começar sua jornada digital', 80.73, 'QUARTERLY', 
 '["1 profissional", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp", "10% de desconto"]'::jsonb, 
 1, NULL, true, 2),
-- Essencial Yearly
('Essencial', 'Para começar sua jornada digital', 287.04, 'YEARLY', 
 '["1 profissional", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp", "20% de desconto"]'::jsonb, 
 1, NULL, true, 3),

-- Profissional Monthly
('Profissional', 'O mais escolhido pelos barbeiros', 49.90, 'MONTHLY', 
 '["Até 3 profissionais", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp"]'::jsonb, 
 3, NULL, true, 4),
-- Profissional Quarterly
('Profissional', 'O mais escolhido pelos barbeiros', 134.73, 'QUARTERLY', 
 '["Até 3 profissionais", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp", "10% de desconto"]'::jsonb, 
 3, NULL, true, 5),
-- Profissional Yearly
('Profissional', 'O mais escolhido pelos barbeiros', 479.04, 'YEARLY', 
 '["Até 3 profissionais", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp", "20% de desconto"]'::jsonb, 
 3, NULL, true, 6),

-- Completo Monthly
('Completo', 'Para barbearias em crescimento', 69.90, 'MONTHLY', 
 '["Profissionais ilimitados", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp"]'::jsonb, 
 NULL, NULL, true, 7),
-- Completo Quarterly
('Completo', 'Para barbearias em crescimento', 188.73, 'QUARTERLY', 
 '["Profissionais ilimitados", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp", "10% de desconto"]'::jsonb, 
 NULL, NULL, true, 8),
-- Completo Yearly
('Completo', 'Para barbearias em crescimento', 671.04, 'YEARLY', 
 '["Profissionais ilimitados", "Dashboard financeiro completo", "Relatórios detalhados", "Notificações WhatsApp e e-mail", "Agendamentos ilimitados", "Sistema 100% personalizado", "Suporte via WhatsApp", "20% de desconto"]'::jsonb, 
 NULL, NULL, true, 9);
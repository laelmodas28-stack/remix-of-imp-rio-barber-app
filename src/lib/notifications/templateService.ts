export interface NotificationTemplate {
  id: string;
  barbershop_id: string;
  name: string;
  type: "email" | "whatsapp";
  trigger_event: string;
  subject: string | null;
  content: string;
  is_active: boolean;
}

export interface TemplateData {
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceName: string;
  servicePrice: number;
  professionalName: string;
  bookingDate: string;
  bookingTime: string;
  barbershopName: string;
  barbershopLogoUrl?: string;
  barbershopAddress?: string;
  notes?: string;
}

/**
 * Fetches an active notification template for a specific trigger and type
 * Note: notification_templates table doesn't exist yet, so this returns null
 */
export async function getNotificationTemplate(
  barbershopId: string,
  triggerEvent: string,
  type: "email" | "whatsapp"
): Promise<NotificationTemplate | null> {
  // notification_templates table doesn't exist in the schema
  // Return null to use fallback templates
  console.log(`No notification_templates table - using fallback for ${type}/${triggerEvent}`);
  return null;
}

/**
 * Replaces all placeholders in template content with actual data
 */
export function processTemplate(content: string, data: TemplateData): string {
  // Format date for display: dd.mm.aaaa format
  const dateObj = new Date(data.bookingDate + "T00:00:00");
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  const formattedDate = `${day}.${month}.${year}`;

  // Format price (without R$ since template already has it)
  const formattedPrice = data.servicePrice.toFixed(2).replace(".", ",");

  // ImperioApp logo URL - using stable public folder path
  const imperioLogoUrl = "https://imperioapp.lovable.app/images/imperio-logo.webp";

  // Replace all placeholders
  let processed = content
    .replace(/\{\{cliente_nome\}\}/g, data.clientName)
    .replace(/\{\{cliente_telefone\}\}/g, data.clientPhone || "")
    .replace(/\{\{cliente_email\}\}/g, data.clientEmail || "")
    .replace(/\{\{servico_nome\}\}/g, data.serviceName)
    .replace(/\{\{servico_preco\}\}/g, formattedPrice)
    .replace(/\{\{profissional_nome\}\}/g, data.professionalName)
    .replace(/\{\{data_agendamento\}\}/g, formattedDate)
    .replace(/\{\{hora_agendamento\}\}/g, data.bookingTime)
    .replace(/\{\{barbearia_nome\}\}/g, data.barbershopName)
    .replace(/\{\{barbearia_logo_url\}\}/g, data.barbershopLogoUrl || "")
    .replace(/\{\{imperio_logo_url\}\}/g, imperioLogoUrl)
    .replace(/\{\{observacoes\}\}/g, data.notes || "")
    .replace(/\{\{barbearia_endereco\}\}/g, data.barbershopAddress || "")
    // Remove barbearia_telefone placeholder (not used in current flow)
    .replace(/\{\{barbearia_telefone\}\}/g, "");

  return processed;
}

/**
 * Gets the processed email template content for a booking confirmation
 */
export async function getProcessedEmailTemplate(
  barbershopId: string,
  triggerEvent: string,
  data: TemplateData
): Promise<{ subject: string; content: string } | null> {
  const template = await getNotificationTemplate(barbershopId, triggerEvent, "email");
  
  if (!template) {
    console.log(`No active email template found for ${triggerEvent}`);
    return null;
  }

  return {
    subject: processTemplate(template.subject || "", data),
    content: processTemplate(template.content, data),
  };
}

/**
 * Gets the processed WhatsApp template content for a booking confirmation
 */
export async function getProcessedWhatsAppTemplate(
  barbershopId: string,
  triggerEvent: string,
  data: TemplateData
): Promise<string | null> {
  const template = await getNotificationTemplate(barbershopId, triggerEvent, "whatsapp");
  
  if (!template) {
    console.log(`No active WhatsApp template found for ${triggerEvent}`);
    return null;
  }

  return processTemplate(template.content, data);
}

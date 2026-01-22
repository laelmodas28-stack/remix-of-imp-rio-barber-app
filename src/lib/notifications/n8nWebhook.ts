import { supabase } from "@/integrations/supabase/client";
import { getProcessedEmailTemplate, TemplateData } from "./templateService";

export interface BookingNotificationData {
  barbershopId: string;
  barbershopName: string;
  barbershopLogoUrl?: string;
  barbershopAddress?: string;
  clientName: string;
  clientEmail?: string | null;
  clientPhone?: string | null;
  serviceName: string;
  servicePrice: number;
  professionalName: string;
  bookingDate: string;
  bookingTime: string;
  notes?: string | null;
}

interface N8nSettings {
  n8n_webhook_url: string | null;
  send_booking_confirmation: boolean | null;
  send_booking_reminder: boolean | null;
}

// Format date to Brazilian format DD/MM/YYYY
function formatDateBR(dateStr: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// Format time to 24h format HH:MM
function formatTimeBR(timeStr: string): string {
  return timeStr.substring(0, 5);
}

// Generate corporate HTML email template (no emojis)
function generateCorporateEmailHTML(data: {
  barbershopName: string;
  barbershopAddress?: string;
  barbershopLogoUrl?: string;
  title: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  professionalName: string;
  price?: number;
  isTest?: boolean;
}): string {
  const formattedDate = formatDateBR(data.bookingDate);
  const formattedTime = formatTimeBR(data.bookingTime);
  const priceFormatted = data.price ? `R$ ${data.price.toFixed(2).replace('.', ',')}` : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.barbershopName} - ${data.title}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 500px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="padding: 24px 32px 16px; text-align: center; border-bottom: 1px solid #e5e5e5;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #1a1a2e;">
                ${data.barbershopName} - ${data.title}
              </h1>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 24px 32px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="vertical-align: top; width: 80px; padding-right: 16px;">
                    ${data.barbershopLogoUrl ? `
                    <div style="width: 72px; height: 72px; background-color: #1a1a2e; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                      <img src="${data.barbershopLogoUrl}" alt="${data.barbershopName}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                    ` : `
                    <div style="width: 72px; height: 72px; background-color: #1a1a2e; border-radius: 8px;"></div>
                    `}
                    <p style="margin: 8px 0 0; font-size: 11px; color: #666; text-align: center;">${data.barbershopName}</p>
                  </td>
                  <td style="vertical-align: top;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; color: #333;"><strong>Servico:</strong> ${data.serviceName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; color: #333;"><strong>Data:</strong> ${formattedDate} ${formattedTime}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; color: #333;"><strong>Profissional:</strong> ${data.professionalName}</span>
                        </td>
                      </tr>
                      ${priceFormatted ? `
                      <tr>
                        <td style="padding: 4px 0;">
                          <span style="font-size: 14px; color: #333;"><strong>Valor:</strong> ${priceFormatted}</span>
                        </td>
                      </tr>
                      ` : ''}
                      ${data.isTest ? `
                      <tr>
                        <td style="padding: 12px 0 4px;">
                          <span style="font-size: 12px; color: #28a745;">Sistema de notificacoes funcionando corretamente!</span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 16px 32px 24px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 4px; font-size: 12px; color: #888;">Enviado por ImperioApp</p>
              ${data.barbershopAddress ? `<p style="margin: 0; font-size: 11px; color: #aaa;">${data.barbershopAddress}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Generate WhatsApp message (no emojis, clean format)
function generateCorporateWhatsAppMessage(data: {
  title: string;
  barbershopName: string;
  clientName?: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  professionalName: string;
  price?: number;
  barbershopAddress?: string;
  isTest?: boolean;
}): string {
  const formattedDate = formatDateBR(data.bookingDate);
  const formattedTime = formatTimeBR(data.bookingTime);
  const priceFormatted = data.price ? `R$ ${data.price.toFixed(2).replace('.', ',')}` : '';

  let message = `*${data.barbershopName} - ${data.title}*\n\n`;
  if (data.clientName) {
    message += `Cliente: ${data.clientName}\n`;
  }
  message += `Servico: ${data.serviceName}\n`;
  message += `Data: ${formattedDate}\n`;
  message += `Horario: ${formattedTime}\n`;
  message += `Profissional: ${data.professionalName}\n`;
  if (priceFormatted) {
    message += `Valor: ${priceFormatted}\n`;
  }
  if (data.isTest) {
    message += `\nSistema de notificacoes funcionando corretamente!`;
  }
  message += `\n\nEnviado por ImperioApp`;
  if (data.barbershopAddress) {
    message += `\n${data.barbershopAddress}`;
  }

  return message;
}

/**
 * Fetches notification settings for a barbershop
 */
export async function getNotificationSettings(barbershopId: string): Promise<N8nSettings | null> {
  try {
    const { data, error } = await supabase
      .from("notification_settings")
      .select("enabled, send_to_client")
      .eq("barbershop_id", barbershopId)
      .maybeSingle();

    if (error || !data) {
      return {
        n8n_webhook_url: null,
        send_booking_confirmation: true,
        send_booking_reminder: true,
      };
    }

    return {
      n8n_webhook_url: null,
      send_booking_confirmation: data.enabled ?? true,
      send_booking_reminder: data.send_to_client ?? true,
    };
  } catch {
    return {
      n8n_webhook_url: null,
      send_booking_confirmation: true,
      send_booking_reminder: true,
    };
  }
}

/**
 * Sends a booking confirmation notification via n8n webhook
 */
export async function sendBookingConfirmationViaWebhook(
  data: BookingNotificationData
): Promise<boolean> {
  try {
    const settings = await getNotificationSettings(data.barbershopId);
    
    if (settings?.send_booking_confirmation === false) {
      console.log("Email confirmations disabled for this barbershop");
      return false;
    }

    const templateData: TemplateData = {
      clientName: data.clientName,
      clientPhone: data.clientPhone || undefined,
      clientEmail: data.clientEmail || undefined,
      serviceName: data.serviceName,
      servicePrice: data.servicePrice,
      professionalName: data.professionalName,
      bookingDate: formatDateBR(data.bookingDate),
      bookingTime: formatTimeBR(data.bookingTime),
      barbershopName: data.barbershopName,
      barbershopLogoUrl: data.barbershopLogoUrl,
      barbershopAddress: data.barbershopAddress,
      notes: data.notes || undefined,
    };

    const emailTemplate = await getProcessedEmailTemplate(
      data.barbershopId,
      "booking_confirmation",
      templateData
    );

    // Generate corporate email HTML if no custom template exists
    const emailHtml = emailTemplate?.content || generateCorporateEmailHTML({
      barbershopName: data.barbershopName,
      barbershopAddress: data.barbershopAddress,
      barbershopLogoUrl: data.barbershopLogoUrl,
      title: "Confirmacao de Agendamento",
      serviceName: data.serviceName,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      professionalName: data.professionalName,
      price: data.servicePrice,
    });

    const payload = {
      type: "booking_confirmation",
      barbershop_name: data.barbershopName,
      client_name: data.clientName,
      client_email: data.clientEmail || "",
      client_phone: data.clientPhone || "",
      service_name: data.serviceName,
      service_price: data.servicePrice,
      professional_name: data.professionalName,
      booking_date: formatDateBR(data.bookingDate),
      booking_time: formatTimeBR(data.bookingTime),
      notes: data.notes || "",
      timestamp: new Date().toISOString(),
      email_subject: emailTemplate?.subject || `${data.barbershopName} - Confirmacao de Agendamento`,
      email_html: emailHtml,
      use_template: true,
    };

    console.log("Sending booking confirmation via edge function to n8n webhook");
    
    const { data: result, error } = await supabase.functions.invoke("send-email-webhook", {
      body: {
        barbershopId: data.barbershopId,
        payload,
        isTest: false,
      },
    });

    if (error) {
      console.error("Error sending booking confirmation via edge function:", error);
      return false;
    }

    console.log("Booking confirmation sent via edge function:", result);
    return result?.success ?? false;
  } catch (error) {
    console.error("Error sending booking confirmation via webhook:", error);
    return false;
  }
}

/**
 * Sends a booking reminder notification via n8n webhook
 */
export async function sendBookingReminderViaWebhook(
  data: BookingNotificationData
): Promise<boolean> {
  try {
    const settings = await getNotificationSettings(data.barbershopId);
    
    if (settings?.send_booking_reminder === false) {
      console.log("Email reminders disabled for this barbershop");
      return false;
    }

    const templateData: TemplateData = {
      clientName: data.clientName,
      clientPhone: data.clientPhone || undefined,
      clientEmail: data.clientEmail || undefined,
      serviceName: data.serviceName,
      servicePrice: data.servicePrice,
      professionalName: data.professionalName,
      bookingDate: formatDateBR(data.bookingDate),
      bookingTime: formatTimeBR(data.bookingTime),
      barbershopName: data.barbershopName,
      barbershopLogoUrl: data.barbershopLogoUrl,
      notes: data.notes || undefined,
    };

    const emailTemplate = await getProcessedEmailTemplate(
      data.barbershopId,
      "booking_reminder",
      templateData
    );

    const emailHtml = emailTemplate?.content || generateCorporateEmailHTML({
      barbershopName: data.barbershopName,
      barbershopAddress: data.barbershopAddress,
      barbershopLogoUrl: data.barbershopLogoUrl,
      title: "Lembrete de Agendamento",
      serviceName: data.serviceName,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      professionalName: data.professionalName,
      price: data.servicePrice,
    });

    const payload = {
      type: "booking_reminder",
      barbershop_name: data.barbershopName,
      client_name: data.clientName,
      client_email: data.clientEmail || "",
      client_phone: data.clientPhone || "",
      service_name: data.serviceName,
      service_price: data.servicePrice,
      professional_name: data.professionalName,
      booking_date: formatDateBR(data.bookingDate),
      booking_time: formatTimeBR(data.bookingTime),
      notes: data.notes || "",
      timestamp: new Date().toISOString(),
      email_subject: emailTemplate?.subject || `${data.barbershopName} - Lembrete de Agendamento`,
      email_html: emailHtml,
      use_template: true,
    };

    console.log("Sending booking reminder via edge function to n8n webhook");
    
    const { data: result, error } = await supabase.functions.invoke("send-email-webhook", {
      body: {
        barbershopId: data.barbershopId,
        payload,
        isTest: false,
      },
    });

    if (error) {
      console.error("Error sending booking reminder via edge function:", error);
      return false;
    }

    console.log("Booking reminder sent via edge function:", result);
    return result?.success ?? false;
  } catch (error) {
    console.error("Error sending booking reminder via webhook:", error);
    return false;
  }
}

/**
 * Sends a test notification via n8n webhook (email)
 */
export async function sendTestEmailNotification(barbershopId: string, barbershopName: string): Promise<boolean> {
  try {
    const now = new Date();
    const bookingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = bookingDate.toISOString().split('T')[0];

    const emailHtml = generateCorporateEmailHTML({
      barbershopName,
      title: "Notificacao de Teste",
      serviceName: "Corte de Cabelo",
      bookingDate: dateStr,
      bookingTime: "14:00",
      professionalName: "Barbeiro Teste",
      price: 45.00,
      isTest: true,
    });

    const payload = {
      type: "test_email_notification",
      barbershop_id: barbershopId,
      barbershop_name: barbershopName,
      client_name: "Cliente Teste",
      client_email: "cliente.teste@exemplo.com",
      professional_name: "Barbeiro Teste",
      service_name: "Corte de Cabelo",
      service_price: 45.00,
      booking_date: formatDateBR(dateStr),
      booking_time: "14:00",
      email_subject: `${barbershopName} - Notificacao de Teste`,
      email_html: emailHtml,
      notes: "Esta e uma notificacao de teste",
    };

    const { data, error } = await supabase.functions.invoke("send-email-webhook", {
      body: {
        barbershopId,
        payload,
        isTest: true,
      },
    });

    if (error) {
      console.error("Error sending test email notification:", error);
      return false;
    }

    console.log("Test email notification sent to n8n", data);
    return data?.success ?? false;
  } catch (error) {
    console.error("Error sending test email notification:", error);
    return false;
  }
}

/**
 * Sends a test notification via n8n webhook (WhatsApp)
 */
export async function sendTestWhatsAppNotification(barbershopId: string, barbershopName: string, instanceName?: string): Promise<boolean> {
  try {
    const now = new Date();
    const bookingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = bookingDate.toISOString().split('T')[0];

    let finalInstanceName = instanceName;
    if (!finalInstanceName) {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("slug")
        .eq("id", barbershopId)
        .single();
      finalInstanceName = barbershop?.slug || undefined;
    }

    const message = generateCorporateWhatsAppMessage({
      title: "Notificacao de Teste",
      barbershopName,
      clientName: "Cliente Teste",
      serviceName: "Corte de Cabelo",
      bookingDate: dateStr,
      bookingTime: "14:00",
      professionalName: "Barbeiro Teste",
      price: 45.00,
      isTest: true,
    });

    const { data, error } = await supabase.functions.invoke("send-whatsapp-webhook", {
      body: {
        barbershopId,
        phone: "+5511999999999",
        message,
        instanceName: finalInstanceName,
        clientName: "Cliente Teste",
        serviceName: "Corte de Cabelo",
        bookingDate: formatDateBR(dateStr),
        bookingTime: "14:00",
        isTest: true,
      },
    });

    if (error) {
      console.error("Error sending test WhatsApp notification:", error);
      return false;
    }

    console.log("Test WhatsApp notification sent to n8n", data);
    return data?.success ?? false;
  } catch (error) {
    console.error("Error sending test WhatsApp notification:", error);
    return false;
  }
}

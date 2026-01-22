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

/**
 * Fetches notification settings for a barbershop
 * Falls back to default values if the table doesn't exist
 */
export async function getNotificationSettings(barbershopId: string): Promise<N8nSettings | null> {
  try {
    const { data, error } = await supabase
      .from("notification_settings")
      .select("enabled, send_to_client")
      .eq("barbershop_id", barbershopId)
      .maybeSingle();

    if (error || !data) {
      // Return default settings if no record found
      return {
        n8n_webhook_url: null,
        send_booking_confirmation: true,
        send_booking_reminder: true,
      };
    }

    return {
      n8n_webhook_url: null, // Webhook URL is stored as a secret
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
    
    // Check if confirmations are enabled (but don't require n8n_webhook_url since we use global secret)
    if (settings?.send_booking_confirmation === false) {
      console.log("Email confirmations disabled for this barbershop");
      return false;
    }

    // Prepare template data
    const templateData: TemplateData = {
      clientName: data.clientName,
      clientPhone: data.clientPhone || undefined,
      clientEmail: data.clientEmail || undefined,
      serviceName: data.serviceName,
      servicePrice: data.servicePrice,
      professionalName: data.professionalName,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      barbershopName: data.barbershopName,
      barbershopLogoUrl: data.barbershopLogoUrl,
      barbershopAddress: data.barbershopAddress,
      notes: data.notes || undefined,
    };

    // Try to get processed template from database
    const emailTemplate = await getProcessedEmailTemplate(
      data.barbershopId,
      "booking_confirmation",
      templateData
    );

    const payload = {
      type: "booking_confirmation",
      barbershop_name: data.barbershopName,
      client_name: data.clientName,
      client_email: data.clientEmail || "",
      client_phone: data.clientPhone || "",
      service_name: data.serviceName,
      service_price: data.servicePrice,
      professional_name: data.professionalName,
      booking_date: data.bookingDate,
      booking_time: data.bookingTime,
      notes: data.notes || "",
      timestamp: new Date().toISOString(),
      // Add processed template content if available
      email_subject: emailTemplate?.subject || `Confirmação de Agendamento - ${data.barbershopName}`,
      email_html: emailTemplate?.content || null,
      use_template: !!emailTemplate,
    };

    console.log("Sending booking confirmation via edge function to n8n webhook");
    
    // Use edge function with global secret instead of per-barbershop webhook
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
    
    // Check if reminders are enabled (but don't require n8n_webhook_url since we use global secret)
    if (settings?.send_booking_reminder === false) {
      console.log("Email reminders disabled for this barbershop");
      return false;
    }

    // Prepare template data
    const templateData: TemplateData = {
      clientName: data.clientName,
      clientPhone: data.clientPhone || undefined,
      clientEmail: data.clientEmail || undefined,
      serviceName: data.serviceName,
      servicePrice: data.servicePrice,
      professionalName: data.professionalName,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      barbershopName: data.barbershopName,
      barbershopLogoUrl: data.barbershopLogoUrl,
      notes: data.notes || undefined,
    };

    // Try to get processed template from database
    const emailTemplate = await getProcessedEmailTemplate(
      data.barbershopId,
      "booking_reminder",
      templateData
    );

    const payload = {
      type: "booking_reminder",
      barbershop_name: data.barbershopName,
      client_name: data.clientName,
      client_email: data.clientEmail || "",
      client_phone: data.clientPhone || "",
      service_name: data.serviceName,
      service_price: data.servicePrice,
      professional_name: data.professionalName,
      booking_date: data.bookingDate,
      booking_time: data.bookingTime,
      notes: data.notes || "",
      timestamp: new Date().toISOString(),
      // Add processed template content if available
      email_subject: emailTemplate?.subject || `Lembrete de Agendamento - ${data.barbershopName}`,
      email_html: emailTemplate?.content || null,
      use_template: !!emailTemplate,
    };

    console.log("Sending booking reminder via edge function to n8n webhook");
    
    // Use edge function with global secret instead of per-barbershop webhook
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
    const bookingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

    const payload = {
      type: "test_email_notification",
      // Barbershop info
      barbershop_id: barbershopId,
      barbershop_name: barbershopName,
      // Client info
      client_name: "Cliente Teste",
      client_email: "cliente.teste@exemplo.com",
      // Professional info
      professional_name: "Barbeiro Teste",
      professional_email: "barbeiro.teste@exemplo.com",
      // Booking info
      service_name: "Corte de Cabelo",
      service_price: 45.00,
      booking_date: bookingDate.toISOString().split('T')[0],
      booking_time: "14:00",
      // Dates
      registration_date: now.toISOString(),
      access_date: now.toISOString(),
      // HTML Template
      email_template: `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmação de Agendamento</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center;">
        <h1 style="color: #d4af37; margin: 0; font-size: 28px; font-weight: bold;">${barbershopName}</h1>
        <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 14px;">Sistema de Agendamentos</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px;">
        <h2 style="color: #1a1a2e; margin: 0 0 20px 0; font-size: 22px;">🧪 Notificação de Teste</h2>
        <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          Esta é uma mensagem de teste do sistema de notificações por e-mail.
        </p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <tr>
            <td style="padding: 10px;">
              <p style="margin: 0; color: #333;"><strong>📅 Data:</strong> ${bookingDate.toLocaleDateString('pt-BR')}</p>
              <p style="margin: 10px 0 0 0; color: #333;"><strong>⏰ Horário:</strong> 14:00</p>
              <p style="margin: 10px 0 0 0; color: #333;"><strong>✂️ Serviço:</strong> Corte de Cabelo</p>
              <p style="margin: 10px 0 0 0; color: #333;"><strong>💰 Valor:</strong> R$ 45,00</p>
              <p style="margin: 10px 0 0 0; color: #333;"><strong>👤 Profissional:</strong> Barbeiro Teste</p>
            </td>
          </tr>
        </table>
        <p style="color: #28a745; font-size: 14px; text-align: center; margin: 20px 0;">
          ✅ Sistema de notificações funcionando corretamente!
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #1a1a2e; padding: 20px; text-align: center;">
        <p style="color: #888888; font-size: 12px; margin: 0;">
          © ${now.getFullYear()} ${barbershopName}. Todos os direitos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
      notes: "Esta é uma notificação de teste",
    };

    // Send to edge function which forwards to n8n webhook using the secret
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
    const bookingDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Tomorrow

    // If instanceName not provided, fetch the barbershop slug
    let finalInstanceName = instanceName;
    if (!finalInstanceName) {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("slug")
        .eq("id", barbershopId)
        .single();
      finalInstanceName = barbershop?.slug || undefined;
    }

    const payload = {
      type: "test_whatsapp_notification",
      is_test: true,
      // Barbershop info
      barbershop_id: barbershopId,
      barbershop_name: barbershopName,
      instance_name: finalInstanceName, // Evolution API instance name
      // Client info (normalized phone with +55)
      client_name: "Cliente Teste",
      client_phone: "+5511999999999",
      // Professional info
      professional_name: "Barbeiro Teste",
      professional_phone: "+5511988888888",
      // Booking info
      service_name: "Corte de Cabelo",
      service_price: 45.00,
      booking_date: bookingDate.toISOString().split('T')[0],
      booking_time: "14:00",
      // Dates
      registration_date: now.toISOString(),
      access_date: now.toISOString(),
      // WhatsApp Message Template
      message_template: `🧪 *TESTE DE NOTIFICAÇÃO*

Olá! Esta é uma mensagem de teste do sistema de notificações da *${barbershopName}*.

📋 *Detalhes do Agendamento (Exemplo):*
━━━━━━━━━━━━━━━━━━━━━
📅 *Data:* ${bookingDate.toLocaleDateString('pt-BR')}
⏰ *Horário:* 14:00
✂️ *Serviço:* Corte de Cabelo
💰 *Valor:* R$ 45,00
👤 *Profissional:* Barbeiro Teste
━━━━━━━━━━━━━━━━━━━━━

✅ Sistema de notificações funcionando corretamente!

_Esta é uma mensagem automática de teste._`,
      notes: "Esta é uma notificação de teste",
      timestamp: now.toISOString(),
    };

    // Send to edge function which forwards to n8n webhook using the secret
    const { data, error } = await supabase.functions.invoke("send-whatsapp-webhook", {
      body: {
        barbershopId,
        phone: "+5511999999999",
        message: payload.message_template,
        instanceName: finalInstanceName, // Include instance name for Evolution API
        clientName: "Cliente Teste",
        serviceName: "Corte de Cabelo",
        bookingDate: bookingDate.toISOString().split('T')[0],
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

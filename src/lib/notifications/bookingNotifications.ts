import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "confirmation" | "cancellation" | "reminder";

interface BookingNotificationData {
  bookingId: string;
  barbershopId: string;
  clientName: string;
  clientEmail: string | null;
  clientPhone: string | null;
  serviceName: string;
  professionalName: string;
  bookingDate: string;
  bookingTime: string;
  price?: number;
  notificationType: NotificationType;
}

// Format date to Brazilian format DD/MM/YYYY
function formatDateBR(dateStr: string): string {
  // If already in DD/MM/YYYY format, return as is
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  // If in YYYY-MM-DD format, convert
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// Format time to 24h format HH:MM
function formatTimeBR(timeStr: string): string {
  // Remove seconds if present
  return timeStr.substring(0, 5);
}

// Generate corporate HTML email template
function generateEmailHTML(data: {
  barbershopName: string;
  barbershopAddress: string;
  barbershopLogoUrl?: string;
  notificationType: NotificationType;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  professionalName: string;
  price?: number;
  clientName: string;
}): string {
  const typeLabels: Record<NotificationType, string> = {
    confirmation: "Confirmacao de Agendamento",
    cancellation: "Cancelamento de Agendamento",
    reminder: "Lembrete de Agendamento",
  };

  const formattedDate = formatDateBR(data.bookingDate);
  const formattedTime = formatTimeBR(data.bookingTime);
  const priceFormatted = data.price ? `R$ ${data.price.toFixed(2).replace('.', ',')}` : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.barbershopName} - ${typeLabels[data.notificationType]}</title>
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
                ${data.barbershopName} - ${typeLabels[data.notificationType]}
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

// Generate WhatsApp message template (no emojis, clean format)
function generateWhatsAppMessage(data: {
  notificationType: NotificationType;
  barbershopName: string;
  clientName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  professionalName: string;
  price?: number;
  barbershopAddress?: string;
}): string {
  const typeLabels: Record<NotificationType, string> = {
    confirmation: "Confirmacao de Agendamento",
    cancellation: "Cancelamento de Agendamento",
    reminder: "Lembrete de Agendamento",
  };

  const formattedDate = formatDateBR(data.bookingDate);
  const formattedTime = formatTimeBR(data.bookingTime);
  const priceFormatted = data.price ? `R$ ${data.price.toFixed(2).replace('.', ',')}` : '';

  let message = `*${data.barbershopName} - ${typeLabels[data.notificationType]}*\n\n`;
  message += `Cliente: ${data.clientName}\n`;
  message += `Servico: ${data.serviceName}\n`;
  message += `Data: ${formattedDate}\n`;
  message += `Horario: ${formattedTime}\n`;
  message += `Profissional: ${data.professionalName}\n`;
  if (priceFormatted) {
    message += `Valor: ${priceFormatted}\n`;
  }
  message += `\nEnviado por ImperioApp`;
  if (data.barbershopAddress) {
    message += `\n${data.barbershopAddress}`;
  }

  return message;
}

/**
 * Sends booking notifications via webhooks
 */
export async function sendBookingNotifications(data: BookingNotificationData): Promise<{
  emailSent: boolean;
  whatsappSent: boolean;
  errors: string[];
}> {
  const errors: string[] = [];
  let emailSent = false;
  let whatsappSent = false;

  console.log(`[BookingNotifications] Sending ${data.notificationType} notification`, {
    bookingId: data.bookingId,
    clientEmail: data.clientEmail,
    clientPhone: data.clientPhone,
  });

  // Fetch barbershop info
  const { data: barbershop } = await supabase
    .from("barbershops")
    .select("slug, name, address, logo_url")
    .eq("id", data.barbershopId)
    .single();

  const instanceName = barbershop?.slug || `barbershop-${data.barbershopId.substring(0, 8)}`;
  const barbershopAddress = barbershop?.address || "";
  const barbershopName = barbershop?.name || "Barbearia";
  const barbershopLogoUrl = barbershop?.logo_url || "";

  const typeLabels: Record<NotificationType, string> = {
    confirmation: "Confirmacao de Agendamento",
    cancellation: "Cancelamento de Agendamento",
    reminder: "Lembrete de Agendamento",
  };

  // Send Email webhook notification
  try {
    const emailSubject = `${barbershopName} - ${typeLabels[data.notificationType]}`;
    const emailHtml = generateEmailHTML({
      barbershopName,
      barbershopAddress,
      barbershopLogoUrl,
      notificationType: data.notificationType,
      serviceName: data.serviceName,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      professionalName: data.professionalName,
      price: data.price,
      clientName: data.clientName,
    });

    console.log(`[BookingNotifications] Calling EMAIL webhook for ${data.notificationType}`);

    const { error } = await supabase.functions.invoke("send-email-webhook", {
      body: {
        barbershopId: data.barbershopId,
        payload: {
          notification_type: data.notificationType,
          client_name: data.clientName,
          client_email: data.clientEmail,
          client_phone: data.clientPhone,
          service_name: data.serviceName,
          professional_name: data.professionalName,
          booking_date: formatDateBR(data.bookingDate),
          booking_time: formatTimeBR(data.bookingTime),
          barbershop_name: barbershopName,
          price: data.price,
          email_subject: emailSubject,
          email_html: emailHtml,
        },
      },
    });

    if (error) {
      console.error(`[BookingNotifications] Email webhook error:`, error);
      errors.push(`Email: ${error.message}`);
    } else {
      emailSent = true;
      console.log(`[BookingNotifications] Email webhook called successfully`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[BookingNotifications] Email webhook exception:`, err);
    errors.push(`Email: ${message}`);
  }

  // Send WhatsApp webhook notification
  try {
    let phone = data.clientPhone ? data.clientPhone.replace(/\D/g, "") : null;
    if (phone && !phone.startsWith("55")) {
      phone = `55${phone}`;
    }

    console.log(`[BookingNotifications] Calling WHATSAPP webhook for ${data.notificationType}`);

    const whatsappContent = generateWhatsAppMessage({
      notificationType: data.notificationType,
      barbershopName,
      clientName: data.clientName,
      serviceName: data.serviceName,
      bookingDate: data.bookingDate,
      bookingTime: data.bookingTime,
      professionalName: data.professionalName,
      price: data.price,
      barbershopAddress,
    });

    const { error } = await supabase.functions.invoke("send-whatsapp-webhook", {
      body: {
        barbershopId: data.barbershopId,
        instanceName,
        phone: phone || "unknown",
        message: whatsappContent,
        clientName: data.clientName,
        serviceName: data.serviceName,
        bookingDate: formatDateBR(data.bookingDate),
        bookingTime: formatTimeBR(data.bookingTime),
        barbershopName,
        barbershopAddress,
      },
    });

    if (error) {
      console.error(`[BookingNotifications] WhatsApp webhook error:`, error);
      errors.push(`WhatsApp: ${error.message}`);
    } else {
      whatsappSent = true;
      console.log(`[BookingNotifications] WhatsApp webhook called successfully`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[BookingNotifications] WhatsApp webhook exception:`, err);
    errors.push(`WhatsApp: ${message}`);
  }

  return { emailSent, whatsappSent, errors };
}

/**
 * Helper to fetch booking details and send notifications
 */
export async function sendNotificationForBooking(
  bookingId: string,
  notificationType: NotificationType
): Promise<{ success: boolean; errors: string[] }> {
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(`
      id,
      barbershop_id,
      booking_date,
      booking_time,
      total_price,
      client_id,
      service:services(name),
      professional:professionals(name)
    `)
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return { success: false, errors: ["Booking not found"] };
  }

  // Fetch client profile
  let clientData = { name: "Cliente", email: null as string | null, phone: null as string | null };
  if (booking.client_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", booking.client_id)
      .maybeSingle();
    
    if (profile) {
      clientData = {
        name: profile.full_name || "Cliente",
        email: null,
        phone: profile.phone,
      };
    }
  }

  const result = await sendBookingNotifications({
    bookingId: booking.id,
    barbershopId: booking.barbershop_id,
    clientName: clientData.name,
    clientEmail: clientData.email,
    clientPhone: clientData.phone,
    serviceName: (booking.service as any)?.name || "Serviço",
    professionalName: (booking.professional as any)?.name || "Profissional",
    bookingDate: booking.booking_date,
    bookingTime: booking.booking_time,
    price: booking.total_price || undefined,
    notificationType,
  });

  return {
    success: result.emailSent || result.whatsappSent,
    errors: result.errors,
  };
}
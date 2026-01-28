import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL") || "";
const N8N_WHATSAPP_WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL") || "";

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

// Generate corporate HTML email template for reminders
function generateReminderEmailHTML(data: {
  barbershopName: string;
  barbershopAddress?: string;
  barbershopLogoUrl?: string;
  clientName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  professionalName: string;
  price?: number;
}): string {
  const formattedDate = formatDateBR(data.bookingDate);
  const formattedTime = data.bookingTime.substring(0, 5);
  const priceFormatted = data.price ? `R$ ${data.price.toFixed(2).replace('.', ',')}` : '';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.barbershopName} - Lembrete de Agendamento</title>
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
                ${data.barbershopName} - Lembrete de Agendamento
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
                          <span style="font-size: 14px; color: #333;"><strong>Cliente:</strong> ${data.clientName}</span>
                        </td>
                      </tr>
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

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for upcoming bookings to send reminders...");

    // Fetch all barbershop settings with reminders enabled
    const { data: allSettings, error: settingsError } = await supabase
      .from("barbershop_settings")
      .select("*, barbershop:barbershops(id, name, slug, logo_url, address)")
      .eq("send_booking_reminders", true);

    if (settingsError) throw settingsError;

    console.log(`Found ${allSettings?.length || 0} barbershops with reminders enabled`);

    const notifications: any[] = [];

    for (const settings of allSettings || []) {
      // Default to 1 hour before if not configured
      const reminderHours = settings.reminder_hours_before || 1;
      const barbershopId = settings.barbershop_id;
      const barbershopName = settings.barbershop?.name || "Barbearia";
      const barbershopLogoUrl = settings.barbershop?.logo_url || null;
      const barbershopAddress = settings.barbershop?.address || null;
      const instanceName = settings.barbershop?.slug || `barbershop-${barbershopId.substring(0, 8)}`;
      
      // Calculate the target time window for reminders
      const now = new Date();
      const targetTime = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
      
      // Create time window (5 minutes before and after target for cron precision)
      const windowStart = new Date(targetTime.getTime() - 5 * 60 * 1000);
      const windowEnd = new Date(targetTime.getTime() + 5 * 60 * 1000);

      console.log(`Checking reminders for barbershop ${barbershopId}, target: ${targetTime.toISOString()}`);

      // Fetch bookings that are within the reminder window
      const { data: bookings, error: bookingsError } = await supabase
        .from("bookings")
        .select(`
          id,
          booking_date,
          booking_time,
          price,
          client_id,
          service:services(name),
          professional:professionals(name)
        `)
        .eq("barbershop_id", barbershopId)
        .in("status", ["pending", "confirmed"])
        .gte("booking_date", now.toISOString().split('T')[0])
        .lte("booking_date", targetTime.toISOString().split('T')[0]);

      if (bookingsError) {
        console.error("Error fetching bookings:", bookingsError);
        continue;
      }

      // Filter bookings within the exact time window
      const relevantBookings = (bookings || []).filter(booking => {
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
        return bookingDateTime >= windowStart && bookingDateTime <= windowEnd;
      });

      console.log(`Found ${relevantBookings.length} bookings in reminder window for ${barbershopId}`);

      for (const booking of relevantBookings) {
        // Check if reminder was already sent
        const { data: existingLog } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("barbershop_id", barbershopId)
          .eq("channel", "email")
          .ilike("content", `%"booking_id":"${booking.id}"%`)
          .ilike("content", `%"notification_type":"reminder"%`)
          .limit(1);

        if (existingLog && existingLog.length > 0) {
          console.log(`Reminder already sent for booking ${booking.id}`);
          continue;
        }

        // Fetch client profile - try both by id and user_id
        let clientData = { name: "Cliente", email: null as string | null, phone: null as string | null };
        if (booking.client_id) {
          // First try by id (for existing users)
          let { data: profile } = await supabase
            .from("profiles")
            .select("full_name, name, email, phone")
            .eq("id", booking.client_id)
            .single();
          
          // If not found, try by user_id
          if (!profile) {
            const { data: profileByUserId } = await supabase
              .from("profiles")
              .select("full_name, name, email, phone")
              .eq("user_id", booking.client_id)
              .single();
            profile = profileByUserId;
          }
          
          if (profile) {
            clientData = {
              name: profile.full_name || profile.name || "Cliente",
              email: profile.email,
              phone: profile.phone,
            };
          }
        }

        const serviceName = (booking.service as any)?.name || "Serviço";
        const professionalName = (booking.professional as any)?.name || "Profissional";

        // Generate email HTML with client name
        const emailHtml = generateReminderEmailHTML({
          barbershopName,
          barbershopAddress: barbershopAddress || undefined,
          barbershopLogoUrl: barbershopLogoUrl || undefined,
          clientName: clientData.name,
          serviceName,
          bookingDate: booking.booking_date,
          bookingTime: booking.booking_time,
          professionalName,
          price: booking.price,
        });

        // Send Email reminder via webhook
        if (clientData.email && N8N_WEBHOOK_URL) {
          try {
            const emailPayload = {
              notification_type: "reminder",
              booking_id: booking.id,
              client_name: clientData.name,
              client_email: clientData.email,
              service_name: serviceName,
              professional_name: professionalName,
              booking_date: booking.booking_date,
              booking_time: booking.booking_time,
              barbershop_name: barbershopName,
              price: booking.price,
              email_subject: `${barbershopName} - Lembrete de Agendamento`,
              email_html: emailHtml,
              timestamp: new Date().toISOString(),
            };

            const emailRes = await fetch(N8N_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(emailPayload),
            });

            const emailResponseText = await emailRes.text();
            
            // Log email notification
            await supabase.from("notification_logs").insert({
              barbershop_id: barbershopId,
              channel: "email",
              recipient_contact: clientData.email,
              status: emailRes.ok ? "sent" : "failed",
              content: JSON.stringify({
                notification_type: "reminder",
                booking_id: booking.id,
                subject: emailPayload.email_subject,
                webhook_status: emailRes.status,
                webhook_response: emailResponseText.substring(0, 500),
              }),
              error_message: emailRes.ok ? null : `Webhook error: ${emailRes.status}`,
              sent_at: new Date().toISOString(),
            });

            if (emailRes.ok) {
              console.log(`Email reminder sent for booking ${booking.id} to ${clientData.email}`);
              notifications.push({
                booking_id: booking.id,
                channel: "email",
                recipient: clientData.email,
                status: "sent",
              });
            }
          } catch (emailErr: any) {
            console.error(`Error sending email reminder:`, emailErr);
          }
        }

        // Send WhatsApp reminder via webhook
        if (clientData.phone && settings.whatsapp_enabled && N8N_WHATSAPP_WEBHOOK_URL) {
          try {
            // Normalize phone number
            let phone = clientData.phone.replace(/\D/g, "");
            if (!phone.startsWith("55")) {
              phone = `55${phone}`;
            }

            const formattedDate = formatDateBR(booking.booking_date);
            const formattedTime = booking.booking_time.substring(0, 5);
            const priceFormatted = booking.price ? `R$ ${booking.price.toFixed(2).replace('.', ',')}` : '';

            const whatsappPayload = {
              notification_type: "reminder",
              booking_id: booking.id,
              instanceName,
              client_name: clientData.name,
              client_phone: phone,
              service_name: serviceName,
              professional_name: professionalName,
              booking_date: booking.booking_date,
              booking_time: booking.booking_time,
              barbershop_name: barbershopName,
              price: booking.price,
              message: `*${barbershopName} - Lembrete de Agendamento*\n\n` +
                `Cliente: ${clientData.name}\n` +
                `Servico: ${serviceName}\n` +
                `Data: ${formattedDate}\n` +
                `Horario: ${formattedTime}\n` +
                `Profissional: ${professionalName}\n` +
                (priceFormatted ? `Valor: ${priceFormatted}\n` : '') +
                `\nEnviado por ImperioApp` +
                (barbershopAddress ? `\n${barbershopAddress}` : ''),
              timestamp: new Date().toISOString(),
            };

            const whatsappRes = await fetch(N8N_WHATSAPP_WEBHOOK_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(whatsappPayload),
            });

            const whatsappResponseText = await whatsappRes.text();

            // Log WhatsApp notification
            await supabase.from("notification_logs").insert({
              barbershop_id: barbershopId,
              channel: "whatsapp",
              recipient_contact: phone,
              status: whatsappRes.ok ? "sent" : "failed",
              content: JSON.stringify({
                notification_type: "reminder",
                booking_id: booking.id,
                instance_name: instanceName,
                webhook_status: whatsappRes.status,
                webhook_response: whatsappResponseText.substring(0, 500),
              }),
              error_message: whatsappRes.ok ? null : `Webhook error: ${whatsappRes.status}`,
              sent_at: new Date().toISOString(),
            });

            if (whatsappRes.ok) {
              console.log(`WhatsApp reminder sent for booking ${booking.id} to ${phone}`);
              notifications.push({
                booking_id: booking.id,
                channel: "whatsapp",
                recipient: phone,
                status: "sent",
              });
            }
          } catch (whatsappErr: any) {
            console.error(`Error sending WhatsApp reminder:`, whatsappErr);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked bookings and sent ${notifications.length} reminders`,
        notifications: notifications,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error checking booking reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

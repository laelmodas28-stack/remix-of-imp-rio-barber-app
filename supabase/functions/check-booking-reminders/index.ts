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

// Format price to Brazilian format
function formatPriceBR(price: number): string {
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
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
  const priceFormatted = data.price ? formatPriceBR(data.price) : '';

  return `<!DOCTYPE html>
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
            <td style="padding: 30px 32px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 600; color: #1a1a2e;">
                ${data.barbershopName} - Lembrete de Agendamento
              </h1>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding: 0 32px 16px;">
              <p style="margin: 0; font-size: 15px; color: #333;">Olá, <strong>${data.clientName}</strong>!</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #666;">Este é um lembrete do seu agendamento.</p>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #1a1a2e; border-radius: 8px;">
                <tr>
                  <td style="padding: 24px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="vertical-align: top; width: 90px; padding-right: 16px;">
                          ${data.barbershopLogoUrl ? `
                          <div style="width: 72px; height: 72px; background-color: #333; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                            <img src="${data.barbershopLogoUrl}" alt="${data.barbershopName}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                          </div>
                          ` : `
                          <div style="width: 72px; height: 72px; background-color: #333; border-radius: 8px;"></div>
                          `}
                          <p style="margin: 8px 0 0; font-size: 11px; color: #ffffff; text-align: center;">${data.barbershopName}</p>
                        </td>
                        <td style="vertical-align: top; color: #ffffff;">
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Serviço:</strong> ${data.serviceName}</p>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Data:</strong> ${formattedDate} às ${formattedTime}</p>
                          <p style="margin: 4px 0; font-size: 14px;"><strong>Profissional:</strong> ${data.professionalName}</p>
                          ${priceFormatted ? `<p style="margin: 4px 0; font-size: 14px;"><strong>Valor:</strong> ${priceFormatted}</p>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Warning -->
          <tr>
            <td style="padding: 0 32px 16px; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #666;">Caso não puder comparecer, cancele seu horário com antecedência.</p>
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

// Generate WhatsApp message for reminders
function generateWhatsAppMessage(data: {
  barbershopName: string;
  barbershopAddress?: string;
  clientName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  professionalName: string;
  price?: number;
}): string {
  const formattedDate = formatDateBR(data.bookingDate);
  const formattedTime = data.bookingTime.substring(0, 5);
  const priceFormatted = data.price ? formatPriceBR(data.price) : '';

  return `*${data.barbershopName}*
Lembrete de Agendamento

Olá, ${data.clientName}.

Este é um lembrete do seu agendamento:

Serviço: ${data.serviceName}
Data: ${formattedDate} às ${formattedTime}
Profissional: ${data.professionalName}${priceFormatted ? `\nValor: ${priceFormatted}` : ''}

Endereço: ${data.barbershopAddress || 'Não informado'}

Caso não possa comparecer, pedimos que cancele com antecedência.

_Enviado por ImperioApp_`;
}

const handler = async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🚀 Starting booking reminder check...`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current time in São Paulo timezone (Brazil)
    const now = new Date();
    console.log(`[CHECK] Current UTC time: ${now.toISOString()}`);

    // Fetch all barbershop settings with reminders enabled
    const { data: allSettings, error: settingsError } = await supabase
      .from("barbershop_settings")
      .select("*, barbershop:barbershops(id, name, slug, logo_url, address, whatsapp)")
      .eq("send_booking_reminders", true);

    if (settingsError) {
      console.error("Error fetching settings:", settingsError);
      throw settingsError;
    }

    console.log(`[CHECK] Found ${allSettings?.length || 0} barbershops with reminders enabled`);

    const notifications: any[] = [];
    const errors: any[] = [];

    for (const settings of allSettings || []) {
      try {
        // Default to 1 hour before if not configured
        const reminderHours = settings.reminder_hours_before || 1;
        const barbershopId = settings.barbershop_id;
        const barbershopName = settings.barbershop?.name || "Barbearia";
        const barbershopLogoUrl = settings.barbershop?.logo_url || null;
        const barbershopAddress = settings.barbershop?.address || null;
        const instanceName = settings.barbershop?.slug || `barbershop-${barbershopId.substring(0, 8)}`;

        // Calculate the target time window for reminders (1 hour ahead by default)
        const targetTime = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
        
        // Create a 10-minute window around target time for reliability
        const windowStartMinutes = 5;
        const windowEndMinutes = 5;
        const windowStart = new Date(targetTime.getTime() - windowStartMinutes * 60 * 1000);
        const windowEnd = new Date(targetTime.getTime() + windowEndMinutes * 60 * 1000);

        console.log(`[${barbershopId.substring(0, 8)}] Checking window: ${windowStart.toISOString()} - ${windowEnd.toISOString()}`);

        // Get today's and tomorrow's dates for query
        const todayDate = now.toISOString().split('T')[0];
        const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Fetch bookings that could be in the reminder window
        const { data: bookings, error: bookingsError } = await supabase
          .from("bookings")
          .select(`
            id,
            booking_date,
            booking_time,
            price,
            total_price,
            client_id,
            service:services(name, price),
            professional:professionals(name)
          `)
          .eq("barbershop_id", barbershopId)
          .in("status", ["pending", "confirmed"])
          .in("booking_date", [todayDate, tomorrowDate]);

        if (bookingsError) {
          console.error(`[${barbershopId.substring(0, 8)}] Error fetching bookings:`, bookingsError);
          errors.push({ barbershopId, error: bookingsError.message });
          continue;
        }

        // Filter bookings within the exact time window
        const relevantBookings = (bookings || []).filter(booking => {
          try {
            const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
            return bookingDateTime >= windowStart && bookingDateTime <= windowEnd;
          } catch {
            return false;
          }
        });

        console.log(`[${barbershopId.substring(0, 8)}] Found ${relevantBookings.length} bookings in window`);

        for (const booking of relevantBookings) {
          try {
            // Check if reminder was already sent using booking_reminders_sent table
            const { data: existingReminder, error: reminderCheckError } = await supabase
              .from("booking_reminders_sent")
              .select("id")
              .eq("booking_id", booking.id)
              .maybeSingle();

            if (reminderCheckError) {
              console.error(`[${booking.id.substring(0, 8)}] Error checking reminder status:`, reminderCheckError);
            }

            if (existingReminder) {
              console.log(`[${booking.id.substring(0, 8)}] Reminder already sent, skipping`);
              continue;
            }

            // Fetch client profile
            let clientData = { name: "Cliente", email: null as string | null, phone: null as string | null };
            if (booking.client_id) {
              // Try by id first
              let { data: profile } = await supabase
                .from("profiles")
                .select("full_name, name, email, phone")
                .eq("id", booking.client_id)
                .maybeSingle();

              // If not found, try by user_id
              if (!profile) {
                const { data: profileByUserId } = await supabase
                  .from("profiles")
                  .select("full_name, name, email, phone")
                  .eq("user_id", booking.client_id)
                  .maybeSingle();
                profile = profileByUserId;
              }

              // Also check barbershop_clients for contact info
              if (!profile?.phone || !profile?.email) {
                const { data: clientRecord } = await supabase
                  .from("barbershop_clients")
                  .select("email, phone")
                  .eq("client_id", booking.client_id)
                  .eq("barbershop_id", barbershopId)
                  .maybeSingle();
                
                if (clientRecord) {
                  if (!profile) {
                    profile = { full_name: null, name: null, email: clientRecord.email, phone: clientRecord.phone };
                  } else {
                    profile.email = profile.email || clientRecord.email;
                    profile.phone = profile.phone || clientRecord.phone;
                  }
                }
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
            const servicePrice = booking.price || booking.total_price || (booking.service as any)?.price;
            const professionalName = (booking.professional as any)?.name || "Profissional";

            console.log(`[${booking.id.substring(0, 8)}] Processing reminder for ${clientData.name} (${clientData.email || clientData.phone || 'no contact'})`);

            let emailSent = false;
            let whatsappSent = false;

            // Send Email reminder via webhook
            if (clientData.email && N8N_WEBHOOK_URL) {
              try {
                const emailHtml = generateReminderEmailHTML({
                  barbershopName,
                  barbershopAddress: barbershopAddress || undefined,
                  barbershopLogoUrl: barbershopLogoUrl || undefined,
                  clientName: clientData.name,
                  serviceName,
                  bookingDate: booking.booking_date,
                  bookingTime: booking.booking_time,
                  professionalName,
                  price: servicePrice,
                });

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
                  price: servicePrice,
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
                  }),
                  error_message: emailRes.ok ? null : `Webhook error: ${emailRes.status} - ${emailResponseText.substring(0, 200)}`,
                  sent_at: new Date().toISOString(),
                });

                if (emailRes.ok) {
                  console.log(`[${booking.id.substring(0, 8)}] ✅ Email reminder sent to ${clientData.email}`);
                  emailSent = true;
                  notifications.push({
                    booking_id: booking.id,
                    channel: "email",
                    recipient: clientData.email,
                    status: "sent",
                  });
                } else {
                  console.error(`[${booking.id.substring(0, 8)}] ❌ Email webhook failed: ${emailRes.status}`);
                }
              } catch (emailErr: any) {
                console.error(`[${booking.id.substring(0, 8)}] Email error:`, emailErr.message);
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

                const whatsappMessage = generateWhatsAppMessage({
                  barbershopName,
                  barbershopAddress: barbershopAddress || undefined,
                  clientName: clientData.name,
                  serviceName,
                  bookingDate: booking.booking_date,
                  bookingTime: booking.booking_time,
                  professionalName,
                  price: servicePrice,
                });

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
                  price: servicePrice,
                  message: whatsappMessage,
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
                  }),
                  error_message: whatsappRes.ok ? null : `Webhook error: ${whatsappRes.status} - ${whatsappResponseText.substring(0, 200)}`,
                  sent_at: new Date().toISOString(),
                });

                if (whatsappRes.ok) {
                  console.log(`[${booking.id.substring(0, 8)}] ✅ WhatsApp reminder sent to ${phone}`);
                  whatsappSent = true;
                  notifications.push({
                    booking_id: booking.id,
                    channel: "whatsapp",
                    recipient: phone,
                    status: "sent",
                  });
                } else {
                  console.error(`[${booking.id.substring(0, 8)}] ❌ WhatsApp webhook failed: ${whatsappRes.status}`);
                }
              } catch (whatsappErr: any) {
                console.error(`[${booking.id.substring(0, 8)}] WhatsApp error:`, whatsappErr.message);
              }
            }

            // Mark reminder as sent (only if at least one channel succeeded)
            if (emailSent || whatsappSent) {
              const { error: markError } = await supabase
                .from("booking_reminders_sent")
                .insert({
                  booking_id: booking.id,
                  sent_at: new Date().toISOString(),
                });

              if (markError) {
                console.error(`[${booking.id.substring(0, 8)}] Error marking reminder as sent:`, markError);
              } else {
                console.log(`[${booking.id.substring(0, 8)}] ✅ Reminder marked as sent`);
              }
            }
          } catch (bookingErr: any) {
            console.error(`[${booking.id.substring(0, 8)}] Error processing booking:`, bookingErr.message);
            errors.push({ bookingId: booking.id, error: bookingErr.message });
          }
        }
      } catch (barbershopErr: any) {
        console.error(`[${settings.barbershop_id?.substring(0, 8)}] Error processing barbershop:`, barbershopErr.message);
        errors.push({ barbershopId: settings.barbershop_id, error: barbershopErr.message });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[${new Date().toISOString()}] ✅ Reminder check completed in ${duration}ms. Sent: ${notifications.length}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked bookings and sent ${notifications.length} reminders`,
        notifications,
        errors: errors.length > 0 ? errors : undefined,
        duration_ms: duration,
        checked_at: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error(`[${new Date().toISOString()}] ❌ Fatal error in reminder check:`, error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        checked_at: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);

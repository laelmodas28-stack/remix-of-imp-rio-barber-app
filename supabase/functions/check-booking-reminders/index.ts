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

// Helper function to replace placeholders in templates
function replacePlaceholders(template: string, data: Record<string, string | undefined>): string {
  return template
    .replace(/\{\{cliente_nome\}\}/g, data.client_name || '')
    .replace(/\{\{servico_nome\}\}/g, data.service_name || '')
    .replace(/\{\{data_agendamento\}\}/g, data.booking_date || '')
    .replace(/\{\{hora_agendamento\}\}/g, data.booking_time || '')
    .replace(/\{\{profissional_nome\}\}/g, data.professional_name || '')
    .replace(/\{\{servico_preco\}\}/g, data.service_price || '')
    .replace(/\{\{barbearia_nome\}\}/g, data.barbershop_name || '')
    .replace(/\{\{barbearia_endereco\}\}/g, data.barbershop_address || '')
    .replace(/\{\{barbearia_logo_url\}\}/g, data.barbershop_logo_url || '');
}

// Generate default HTML email template for reminders (fallback)
function generateDefaultReminderEmailHTML(data: {
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
</head>
<body style="margin: 0; padding: 0; background-color: #f0f0f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f0f0; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color: #1a1a2e; padding: 20px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${data.barbershopName} - Lembrete de Agendamento</h1>
            </td>
          </tr>
          <!-- Greeting -->
          <tr>
            <td style="padding: 24px 32px 8px;">
              <p style="margin: 0; font-size: 15px; color: #333;">Olá, <strong>${data.clientName}</strong>!</p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #666;">Este é um lembrete do seu agendamento.</p>
            </td>
          </tr>
          <!-- Service Card -->
          <tr>
            <td style="padding: 16px 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8f8f8; border-radius: 8px; border: 1px solid #e5e5e5;">
                <tr>
                  <td style="padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Logo Column -->
                        <td style="vertical-align: top; width: 90px; padding-right: 16px; text-align: center;">
                          ${data.barbershopLogoUrl ? `
                          <div style="width: 70px; height: 70px; background-color: #1a1a2e; border-radius: 50%; overflow: hidden; margin: 0 auto;">
                            <img src="${data.barbershopLogoUrl}" alt="${data.barbershopName}" style="width: 100%; height: 100%; object-fit: contain;" />
                          </div>
                          ` : `<div style="width: 70px; height: 70px; background-color: #1a1a2e; border-radius: 50%; margin: 0 auto;"></div>`}
                          <p style="margin: 8px 0 0; font-size: 10px; font-weight: 600; color: #1a1a2e; text-transform: uppercase;">${data.barbershopName}</p>
                        </td>
                        <!-- Details Column -->
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Serviço:</strong> ${data.serviceName}</p>
                          <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Data:</strong> ${formattedDate} ${formattedTime}</p>
                          <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Profissional:</strong> ${data.professionalName}</p>
                          ${priceFormatted ? `<p style="margin: 0; font-size: 14px; color: #333;"><strong>Valor:</strong> ${priceFormatted}</p>` : ''}
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

// Generate default WhatsApp message for reminders (fallback)
function generateDefaultWhatsAppMessage(data: {
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

// Helper to get current time in Brasilia timezone (America/Sao_Paulo, UTC-3)
function getBrasiliaTime(): Date {
  const now = new Date();
  // Convert to Brasilia time (UTC-3)
  const brasiliaOffset = -3 * 60; // -3 hours in minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + (brasiliaOffset * 60000));
}

// Format date as YYYY-MM-DD in Brasilia timezone
function getBrasiliaDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format time as HH:MM:SS in Brasilia timezone
function getBrasiliaTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

const handler = async (req: Request): Promise<Response> => {
  const startTime = Date.now();
  const nowBrasilia = getBrasiliaTime();
  console.log(`[${new Date().toISOString()}] 🚀 Starting booking reminder check...`);
  console.log(`[CHECK] Brasilia time: ${getBrasiliaDateString(nowBrasilia)} ${getBrasiliaTimeString(nowBrasilia)}`);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use Brasilia time for all calculations
    console.log(`[CHECK] Using Brasilia timezone (America/Sao_Paulo, UTC-3)`);

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

        // Calculate target time in Brasilia time (current Brasilia time + reminder hours)
        const targetBrasilia = new Date(nowBrasilia.getTime() + reminderHours * 60 * 60 * 1000);
        
        // Create a 10-minute window around target time for reliability
        const windowStartMinutes = 5;
        const windowEndMinutes = 5;
        const windowStartBrasilia = new Date(targetBrasilia.getTime() - windowStartMinutes * 60 * 1000);
        const windowEndBrasilia = new Date(targetBrasilia.getTime() + windowEndMinutes * 60 * 1000);

        console.log(`[${barbershopId.substring(0, 8)}] Checking Brasilia window: ${getBrasiliaDateString(windowStartBrasilia)} ${getBrasiliaTimeString(windowStartBrasilia)} - ${getBrasiliaTimeString(windowEndBrasilia)}`);

        // Get today's and tomorrow's dates in Brasilia timezone
        const todayDate = getBrasiliaDateString(nowBrasilia);
        const tomorrowBrasilia = new Date(nowBrasilia.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowDate = getBrasiliaDateString(tomorrowBrasilia);

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

        // Filter bookings within the exact time window (using Brasilia time)
        const relevantBookings = (bookings || []).filter(booking => {
          try {
            // Parse booking date/time as Brasilia time (the database stores local time)
            const [year, month, day] = booking.booking_date.split('-').map(Number);
            const [hours, minutes] = booking.booking_time.split(':').map(Number);
            const bookingBrasilia = new Date(year, month - 1, day, hours, minutes, 0);
            
            // Compare with window boundaries
            return bookingBrasilia >= windowStartBrasilia && bookingBrasilia <= windowEndBrasilia;
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

            // Prepare template data for placeholder replacement
            const templateData = {
              client_name: clientData.name,
              service_name: serviceName,
              booking_date: formatDateBR(booking.booking_date),
              booking_time: booking.booking_time.substring(0, 5),
              professional_name: professionalName,
              service_price: servicePrice ? formatPriceBR(servicePrice) : '',
              barbershop_name: barbershopName,
              barbershop_address: barbershopAddress || '',
              barbershop_logo_url: barbershopLogoUrl || '',
            };

            // Fetch email template from notification_templates
            const { data: emailTemplate } = await supabase
              .from("notification_templates")
              .select("content, subject")
              .eq("barbershop_id", barbershopId)
              .eq("trigger_event", "booking_reminder")
              .eq("type", "email")
              .eq("is_active", true)
              .limit(1)
              .maybeSingle();

            // Send Email reminder via webhook
            if (clientData.email && N8N_WEBHOOK_URL) {
              try {
                let emailHtml: string;
                let emailSubject: string;

                if (emailTemplate?.content) {
                  // Use template from database
                  emailHtml = replacePlaceholders(emailTemplate.content, templateData);
                  emailSubject = replacePlaceholders(
                    emailTemplate.subject || `${barbershopName} - Lembrete de Agendamento`,
                    templateData
                  );
                  console.log(`[${booking.id.substring(0, 8)}] Using email template from database`);
                } else {
                  // Fallback to default template
                  emailHtml = generateDefaultReminderEmailHTML({
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
                  emailSubject = `${barbershopName} - Lembrete de Agendamento`;
                  console.log(`[${booking.id.substring(0, 8)}] Using default email template`);
                }

                const emailPayload = {
                  notification_type: "reminder",
                  trigger_event: "booking_reminder",
                  booking_id: booking.id,
                  client_name: clientData.name,
                  client_email: clientData.email,
                  service_name: serviceName,
                  professional_name: professionalName,
                  booking_date: booking.booking_date,
                  booking_time: booking.booking_time,
                  barbershop_name: barbershopName,
                  barbershop_logo_url: barbershopLogoUrl,
                  barbershop_address: barbershopAddress,
                  price: servicePrice,
                  email_subject: emailSubject,
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
                    subject: emailSubject,
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

            // Fetch WhatsApp template from notification_templates
            const { data: whatsappTemplate } = await supabase
              .from("notification_templates")
              .select("content")
              .eq("barbershop_id", barbershopId)
              .eq("trigger_event", "booking_reminder")
              .eq("type", "whatsapp")
              .eq("is_active", true)
              .limit(1)
              .maybeSingle();

            // Send WhatsApp reminder via webhook
            if (clientData.phone && settings.whatsapp_enabled && N8N_WHATSAPP_WEBHOOK_URL) {
              try {
                // Normalize phone number
                let phone = clientData.phone.replace(/\D/g, "");
                if (!phone.startsWith("55")) {
                  phone = `55${phone}`;
                }

                let whatsappMessage: string;

                if (whatsappTemplate?.content) {
                  // Use template from database
                  whatsappMessage = replacePlaceholders(whatsappTemplate.content, templateData);
                  console.log(`[${booking.id.substring(0, 8)}] Using WhatsApp template from database`);
                } else {
                  // Fallback to default template
                  whatsappMessage = generateDefaultWhatsAppMessage({
                    barbershopName,
                    barbershopAddress: barbershopAddress || undefined,
                    clientName: clientData.name,
                    serviceName,
                    bookingDate: booking.booking_date,
                    bookingTime: booking.booking_time,
                    professionalName,
                    price: servicePrice,
                  });
                  console.log(`[${booking.id.substring(0, 8)}] Using default WhatsApp template`);
                }

                const whatsappPayload = {
                  notification_type: "reminder",
                  trigger_event: "booking_reminder",
                  booking_id: booking.id,
                  instanceName,
                  client_name: clientData.name,
                  client_phone: phone,
                  service_name: serviceName,
                  professional_name: professionalName,
                  booking_date: booking.booking_date,
                  booking_time: booking.booking_time,
                  barbershop_name: barbershopName,
                  barbershop_logo_url: barbershopLogoUrl,
                  barbershop_address: barbershopAddress,
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

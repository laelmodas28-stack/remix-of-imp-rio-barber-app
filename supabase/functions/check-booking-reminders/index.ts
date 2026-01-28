import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL") || "";
const N8N_WHATSAPP_WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL") || "";

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
      .select("*, barbershop:barbershops(id, name, slug)")
      .eq("send_booking_reminders", true);

    if (settingsError) throw settingsError;

    console.log(`Found ${allSettings?.length || 0} barbershops with reminders enabled`);

    const notifications: any[] = [];

    for (const settings of allSettings || []) {
      // Default to 1 hour before if not configured
      const reminderHours = settings.reminder_hours_before || 1;
      const barbershopId = settings.barbershop_id;
      const barbershopName = settings.barbershop?.name || "Barbearia";
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

        // Fetch client profile
        let clientData = { name: "Cliente", email: null as string | null, phone: null as string | null };
        if (booking.client_id) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, email, phone")
            .eq("user_id", booking.client_id)
            .single();
          
          if (profile) {
            clientData = {
              name: profile.name || "Cliente",
              email: profile.email,
              phone: profile.phone,
            };
          }
        }

        const serviceName = (booking.service as any)?.name || "Serviço";
        const professionalName = (booking.professional as any)?.name || "Profissional";

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
              email_subject: `Lembrete: Seu agendamento é hoje às ${booking.booking_time.substring(0, 5)}`,
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
                `Ola ${clientData.name}\n\n` +
                `Este e um lembrete do seu agendamento:\n\n` +
                `Servico: ${serviceName}\n` +
                `Profissional: ${professionalName}\n` +
                `Data: ${booking.booking_date}\n` +
                `Horario: ${booking.booking_time.substring(0, 5)}\n\n` +
                `Enviado por ImperioApp`,
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

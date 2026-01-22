import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Evolution API configuration
const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

// Helper function to format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  return cleaned;
}

// Send WhatsApp message via Evolution API
async function sendWhatsAppMessage(
  instanceName: string,
  phone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
    return { success: false, error: "Evolution API not configured" };
  }

  const cleanUrl = EVOLUTION_API_URL.replace(/\/$/, "");
  const formattedPhone = formatPhoneNumber(phone);

  try {
    // Check instance connection status
    const statusRes = await fetch(`${cleanUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { "apikey": EVOLUTION_API_KEY },
    });

    if (!statusRes.ok) {
      return { success: false, error: "WhatsApp instance not found" };
    }

    const statusData = await statusRes.json();
    if (statusData.state !== "open" && statusData.state !== "connected") {
      return { success: false, error: `WhatsApp not connected: ${statusData.state}` };
    }

    // Send message
    const sendRes = await fetch(`${cleanUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: formattedPhone,
        text: message,
      }),
    });

    if (!sendRes.ok) {
      const errorText = await sendRes.text();
      return { success: false, error: `Failed to send: ${errorText}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// Send SMS using MessageBird
async function sendSMS(
  apiKey: string,
  from: string,
  to: string,
  message: string
): Promise<void> {
  console.log(`Sending SMS via MessageBird to ${to}`);
  
  const response = await fetch('https://rest.messagebird.com/messages', {
    method: 'POST',
    headers: {
      'Authorization': `AccessKey ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      originator: from,
      recipients: [to.replace(/\D/g, '')],
      body: message,
    }),
  });
  if (!response.ok) {
    throw new Error(`MessageBird SMS failed: ${response.statusText}`);
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const notificationSchema = z.object({
      bookingId: z.string().uuid()
    });

    const body = await req.json();
    const { bookingId } = notificationSchema.parse(body);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch booking with all related data
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(`
        *,
        services (name, price),
        professionals (name),
        profiles (full_name, phone, email),
        barbershops (id, name, address, whatsapp, mensagem_personalizada, slug)
      `)
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking query error:", bookingError);
      throw new Error("Booking not found");
    }

    const barbershopId = booking.barbershop_id;
    const clientName = booking.profiles?.full_name || "Cliente";
    const clientPhone = booking.profiles?.phone;
    const clientEmail = booking.profiles?.email;
    const barbershopSlug = booking.barbershops?.slug;
    
    const date = booking.booking_date;
    const time = booking.booking_time;
    const service = booking.services.name;
    const professional = booking.professionals.name;
    const price = booking.services.price;

    console.log("Processing notification for:", clientEmail || clientPhone, "Barbershop:", barbershopId);
    
    // Helper function to save notification to database
    const saveNotification = async (userId: string, type: string, title: string, message: string) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          barbershop_id: barbershopId,
          type,
          title,
          message,
          booking_id: bookingId,
        });
      
      if (error) {
        console.error(`❌ Error saving ${type} notification:`, error);
      } else {
        console.log(`✅ ${type} notification saved`);
      }
    };

    // Log notification to notification_logs
    const logNotification = async (channel: string, recipient: string, status: string, content: string, errorMessage?: string) => {
      await supabase.from("notification_logs").insert({
        barbershop_id: barbershopId,
        channel,
        recipient_contact: recipient,
        status,
        content,
        error_message: errorMessage,
        sent_at: new Date().toISOString(),
      });
    };

    // Fetch barbershop data
    const { data: barbershop } = await supabase
      .from("barbershops")
      .select("*")
      .eq("id", barbershopId)
      .single();

    // Fetch notification settings
    const { data: notificationSettings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .maybeSingle();

    // Fetch barbershop settings for WhatsApp config
    const { data: barbershopSettings } = await supabase
      .from("barbershop_settings")
      .select("whatsapp_enabled, whatsapp_send_booking_confirmation")
      .eq("barbershop_id", barbershopId)
      .maybeSingle();

    if (!notificationSettings?.enabled) {
      console.log("Notifications disabled");
      return new Response(
        JSON.stringify({ message: "Notifications disabled" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format date
    const formattedDate = new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const formattedDateLong = new Date(date).toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    });

    // Generate messages with AI if enabled
    let customMessage = "";
    let barberMessage = "";
    
    if (notificationSettings.ai_enabled && barbershop?.mensagem_personalizada) {
      try {
        console.log("Generating messages with AI...");
        const { data: aiMessages, error: aiError } = await supabase.functions.invoke(
          "generate-notification-messages",
          {
            body: {
              barbershopName: barbershop.name,
              mensagemPersonalizada: barbershop.mensagem_personalizada,
              tempoLembrete: notificationSettings.reminder_minutes || 30,
              customerName: clientName,
              service: service,
              startTime: time,
              barberName: professional,
              bookingDate: formattedDate,
            },
          }
        );

        if (aiError) {
          console.error("AI message generation error:", aiError);
        } else if (aiMessages?.messages) {
          customMessage = aiMessages.messages.clientConfirmation;
          barberMessage = aiMessages.messages.barberNotification;
          console.log("AI messages generated successfully");
        }
      } catch (aiError) {
        console.error("AI function call error:", aiError);
      }
    }
    
    // Fallback to static template
    if (!customMessage) {
      customMessage = notificationSettings.custom_message || "";
      customMessage = customMessage
        .replace("{nome}", clientName)
        .replace("{data}", formattedDate)
        .replace("{hora}", time)
        .replace("{servico}", service)
        .replace("{profissional}", professional);
    }
    
    if (!barberMessage) {
      barberMessage = `Novo agendamento: ${clientName} - ${service} - ${formattedDate} às ${time}`;
    }

    const clientUserId = booking.client_id;
    
    // Save confirmation notification to database
    if (clientUserId && notificationSettings.send_to_client) {
      await saveNotification(
        clientUserId,
        'booking_confirmation',
        'Agendamento Confirmado',
        customMessage
      );
    }
    
    // Send email to client
    if (notificationSettings.send_to_client && clientEmail) {
      try {
        const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
            .detail-label { font-weight: bold; color: #667eea; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .message-box { background: #e8eaf6; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Agendamento Confirmado!</h1>
            </div>
            <div class="content">
              <div class="message-box">
                <p>${customMessage}</p>
              </div>
              
              <div class="details">
                <h2 style="color: #667eea; margin-top: 0;">📋 Detalhes do Agendamento</h2>
                <div class="detail-row">
                  <span class="detail-label">📅 Data:</span>
                  <span>${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">🕐 Horário:</span>
                  <span>${time}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">✂️ Serviço:</span>
                  <span>${service}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">👤 Profissional:</span>
                  <span>${professional}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">💰 Valor:</span>
                  <span>R$ ${price.toFixed(2)}</span>
                </div>
              </div>

              ${barbershop?.whatsapp ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://wa.me/${(() => {
                    let clean = barbershop.whatsapp.replace(/\D/g, '');
                    if (clean.startsWith('55') && clean.length > 11) clean = clean.substring(2);
                    return '55' + clean;
                  })()}" 
                     style="background: #25D366; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    💬 Entrar em Contato via WhatsApp
                  </a>
                </div>
              ` : ''}

              ${barbershop?.address ? `
                <p style="text-align: center; color: #666;">
                  📍 ${barbershop.address}
                </p>
              ` : ''}
            </div>
            <div class="footer">
              <p>Este é um email automático. Caso precise de ajuda, entre em contato conosco.</p>
              <p>${barbershop?.name || 'Barbearia'}</p>
            </div>
          </div>
        </body>
        </html>
      `;

        const emailResponse = await resend.emails.send({
          from: "Barbearia <onboarding@resend.dev>",
          to: [clientEmail],
          subject: `✅ Agendamento Confirmado - ${formattedDate} às ${time}`,
          html: emailHtml,
        });

        console.log("✅ Email sent to client:", clientEmail);
        await logNotification("email", clientEmail, "sent", JSON.stringify({ subject: "Agendamento Confirmado", service, date: formattedDate }));
      } catch (emailError: any) {
        console.error("❌ Email error:", emailError.message);
        await logNotification("email", clientEmail, "failed", JSON.stringify({ service, date: formattedDate }), emailError.message);
      }
    }

    // Send WhatsApp to client via Evolution API
    const whatsappEnabled = barbershopSettings?.whatsapp_enabled || notificationSettings.send_whatsapp;
    const whatsappConfirmationEnabled = barbershopSettings?.whatsapp_send_booking_confirmation !== false;
    
    if (whatsappEnabled && whatsappConfirmationEnabled && clientPhone && barbershopSlug) {
      console.log("Sending WhatsApp via Evolution API...");
      
      const whatsappMessage = `✅ *Agendamento Confirmado!*

Olá ${clientName}! 👋

Seu agendamento na *${barbershop?.name || 'Barbearia'}* foi confirmado:

📋 *Serviço:* ${service}
💇 *Profissional:* ${professional}
📅 *Data:* ${formattedDateLong}
⏰ *Horário:* ${time}
💰 *Valor:* R$ ${price.toFixed(2)}

${barbershop?.address ? `📍 *Endereço:* ${barbershop.address}` : ''}

Esperamos você! 😊`;

      const whatsappResult = await sendWhatsAppMessage(barbershopSlug, clientPhone, whatsappMessage);
      
      if (whatsappResult.success) {
        console.log("✅ WhatsApp sent via Evolution API");
        await logNotification("whatsapp", clientPhone, "sent", JSON.stringify({ service, date: formattedDate, instance: barbershopSlug }));
      } else {
        console.error("❌ WhatsApp error:", whatsappResult.error);
        await logNotification("whatsapp", clientPhone, "failed", JSON.stringify({ service, date: formattedDate }), whatsappResult.error);
      }
    }

    // Save and send notification to admin/barber
    if (notificationSettings.admin_email) {
      const { data: barbershopData } = await supabase
        .from('barbershops')
        .select('owner_id')
        .eq('id', barbershopId)
        .single();
      
      if (barbershopData) {
        await saveNotification(
          barbershopData.owner_id,
          'barber_notification',
          'Novo Agendamento',
          barberMessage
        );
      }
      
      try {
        const adminEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; }
            .content { background: #f9f9f9; padding: 20px; }
            .details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #667eea; }
            .ai-message { background: #e8eaf6; padding: 15px; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>🔔 Novo Agendamento Recebido</h2>
            </div>
            <div class="content">
              ${notificationSettings.ai_enabled ? `
                <div class="ai-message">
                  <p>${barberMessage}</p>
                </div>
              ` : ''}
              <div class="details">
                <p><strong>Cliente:</strong> ${clientName}</p>
                <p><strong>Email:</strong> ${clientEmail || 'Não informado'}</p>
                ${clientPhone ? `<p><strong>Telefone:</strong> ${clientPhone}</p>` : ''}
                <p><strong>Data:</strong> ${formattedDate}</p>
                <p><strong>Horário:</strong> ${time}</p>
                <p><strong>Serviço:</strong> ${service}</p>
                <p><strong>Profissional:</strong> ${professional}</p>
                <p><strong>Valor:</strong> R$ ${price.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

        await resend.emails.send({
          from: "Notificações <onboarding@resend.dev>",
          to: [notificationSettings.admin_email],
          subject: `Novo Agendamento - ${clientName} - ${formattedDate}`,
          html: adminEmailHtml,
        });

        console.log("✅ Email sent to admin:", notificationSettings.admin_email);
      } catch (adminEmailError: any) {
        console.error("❌ Admin email error:", adminEmailError.message);
      }
    }

    // Send WhatsApp to admin
    if (notificationSettings.admin_whatsapp && barbershopSlug) {
      const adminWhatsAppMessage = `🔔 *Novo Agendamento*

👤 *Cliente:* ${clientName}
📱 *Telefone:* ${clientPhone || 'Não informado'}
📋 *Serviço:* ${service}
💇 *Profissional:* ${professional}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${time}
💰 *Valor:* R$ ${price.toFixed(2)}`;

      const adminWhatsAppResult = await sendWhatsAppMessage(barbershopSlug, notificationSettings.admin_whatsapp, adminWhatsAppMessage);
      
      if (adminWhatsAppResult.success) {
        console.log("✅ WhatsApp sent to admin");
      } else {
        console.error("❌ Admin WhatsApp error:", adminWhatsAppResult.error);
      }
    }

    // Send SMS to client
    if (notificationSettings.send_sms && clientPhone) {
      const messagebirdApiKey = Deno.env.get("MESSAGEBIRD_API_KEY");
      const messagebirdOriginator = Deno.env.get("MESSAGEBIRD_ORIGINATOR");
      
      if (!messagebirdApiKey || !messagebirdOriginator) {
        console.warn("⚠️ SMS enabled but MessageBird credentials not configured");
      } else {
        try {
          const smsMessage = customMessage.substring(0, 160);
          await sendSMS(messagebirdApiKey, messagebirdOriginator, clientPhone, smsMessage);
          console.log("✅ SMS sent to client:", clientPhone);
          await logNotification("sms", clientPhone, "sent", JSON.stringify({ message: smsMessage }));
        } catch (smsError: any) {
          console.error("❌ SMS error:", smsError.message);
          await logNotification("sms", clientPhone, "failed", JSON.stringify({ message: customMessage.substring(0, 50) }), smsError.message);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Notifications sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending notification:", error);
    
    if (error.name === 'ZodError') {
      return new Response(
        JSON.stringify({ error: 'Invalid data: ' + error.errors[0].message }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    
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

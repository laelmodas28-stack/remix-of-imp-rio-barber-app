import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SYSTEM RULE: Each webhook handles its specific channel
// - Email webhook URL → sends email templates ONLY
// - WhatsApp webhook URL → sends WhatsApp templates ONLY
const N8N_EMAIL_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL") || "";
const N8N_WHATSAPP_WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL") || "";

// Helper function to format phone number for WhatsApp
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10 || cleaned.length === 11) {
    return `55${cleaned}`;
  }
  return cleaned;
}

// Send WhatsApp notification via n8n webhook ONLY
// SYSTEM RULE: WhatsApp webhook URL → sends WhatsApp templates ONLY
async function sendWhatsAppViaWebhook(
  barbershopId: string,
  instanceName: string,
  phone: string,
  message: string,
  clientName: string,
  serviceName: string,
  bookingDate: string,
  bookingTime: string,
  barbershopName: string,
  barbershopAddress?: string
): Promise<{ success: boolean; error?: string }> {
  if (!N8N_WHATSAPP_WEBHOOK_URL) {
    return { success: false, error: "N8N WhatsApp webhook not configured" };
  }

  const timestamp = new Date().toISOString();
  
  const whatsappPayload = {
    channel: 'whatsapp',
    barbershopId,
    instanceName,
    phone: formatPhoneNumber(phone),
    message,
    clientName,
    serviceName,
    bookingDate,
    bookingTime,
    barbershopName,
    barbershopAddress,
    timestamp,
  };

  try {
    console.log(`[WHATSAPP ONLY] Sending to N8N_WHATSAPP_WEBHOOK_URL`);
    const response = await fetch(N8N_WHATSAPP_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(whatsappPayload),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `WhatsApp webhook error: ${response.status} - ${errorText}` };
    }
    
    await response.text(); // Consume response
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
    const barbershopName = booking.barbershops?.name || "Barbearia";
    const barbershopAddress = booking.barbershops?.address;
    
    const date = booking.booking_date;
    const time = booking.booking_time;
    const service = booking.services?.name || "Serviço";
    const professional = booking.professionals?.name || "Profissional";
    const price = booking.services?.price ?? booking.total_price ?? 0;

    console.log("Processing notification for:", clientEmail || clientPhone, "Barbershop:", barbershopId, "Price:", price);
    
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

    // Fetch notification settings (use limit(1) to handle duplicates)
    const { data: notificationSettings } = await supabase
      .from("notification_settings")
      .select("*")
      .eq("barbershop_id", barbershopId)
      .limit(1)
      .maybeSingle();

    // Fetch barbershop settings for WhatsApp config
    const { data: barbershopSettings } = await supabase
      .from("barbershop_settings")
      .select("whatsapp_enabled, whatsapp_send_booking_confirmation")
      .eq("barbershop_id", barbershopId)
      .limit(1)
      .maybeSingle();

    if (!notificationSettings?.enabled) {
      console.log("Notifications disabled - notificationSettings:", notificationSettings);
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
    
    // Fetch email template from notification_templates
    const { data: emailTemplate } = await supabase
      .from("notification_templates")
      .select("content, subject")
      .eq("barbershop_id", barbershopId)
      .eq("trigger_event", "booking_confirmation")
      .eq("type", "email")
      .eq("is_active", true)
      .maybeSingle();

    // Helper function to replace placeholders in templates
    const replacePlaceholders = (template: string): string => {
      // Format price safely - handle undefined/null cases
      const formattedPrice = price != null ? price.toFixed(2).replace('.', ',') : '0,00';
      
      return template
        .replace(/\{\{cliente_nome\}\}/g, clientName)
        .replace(/\{\{servico_nome\}\}/g, service)
        .replace(/\{\{data_agendamento\}\}/g, formattedDate)
        .replace(/\{\{hora_agendamento\}\}/g, time)
        .replace(/\{\{profissional_nome\}\}/g, professional)
        .replace(/\{\{servico_preco\}\}/g, formattedPrice)
        .replace(/\{\{barbearia_nome\}\}/g, barbershopName)
        .replace(/\{\{barbearia_endereco\}\}/g, barbershopAddress || '')
        .replace(/\{\{barbearia_logo_url\}\}/g, barbershop?.logo_url || '');
    };

    // Send email to client via n8n webhook
    // SYSTEM RULE: Email webhook URL → sends email templates ONLY
    if (notificationSettings.send_to_client && clientEmail) {
      try {
        if (!N8N_EMAIL_WEBHOOK_URL) {
          console.error("N8N email webhook URL not configured");
          await logNotification("email", clientEmail, "failed", JSON.stringify({ service, date: formattedDate }), "N8N email webhook not configured");
        } else {
          let emailHtml: string;
          let emailSubject: string;

          if (emailTemplate?.content) {
            // Use dynamic template from database
            emailHtml = replacePlaceholders(emailTemplate.content);
            emailSubject = replacePlaceholders(emailTemplate.subject || `${barbershopName} - Confirmação de Agendamento`);
            console.log("Using dynamic email template from database");
          } else {
            // Fallback to default template matching new standard
            console.log("No custom template found, using default template");
            emailSubject = `${barbershopName} - Confirmação de Agendamento`;
            const formattedPriceValue = price != null ? `R$ ${price.toFixed(2).replace('.', ',')}` : '';
            emailHtml = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
              <meta charset="utf-8">
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
                          <h1 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${barbershopName} - Confirmação de Agendamento</h1>
                        </td>
                      </tr>
                      <!-- Greeting -->
                      <tr>
                        <td style="padding: 24px 32px 8px;">
                          <p style="margin: 0; font-size: 15px; color: #333;">Olá, <strong>${clientName}</strong>!</p>
                          <p style="margin: 8px 0 0; font-size: 14px; color: #666;">Seu agendamento foi confirmado com sucesso.</p>
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
                                      ${barbershop?.logo_url ? `
                                      <div style="width: 70px; height: 70px; background-color: #1a1a2e; border-radius: 50%; overflow: hidden; margin: 0 auto;">
                                        <img src="${barbershop.logo_url}" alt="${barbershopName}" style="width: 100%; height: 100%; object-fit: contain;" />
                                      </div>
                                      ` : `<div style="width: 70px; height: 70px; background-color: #1a1a2e; border-radius: 50%; margin: 0 auto;"></div>`}
                                      <p style="margin: 8px 0 0; font-size: 10px; font-weight: 600; color: #1a1a2e; text-transform: uppercase;">${barbershopName}</p>
                                    </td>
                                    <!-- Details Column -->
                                    <td style="vertical-align: top;">
                                      <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Serviço:</strong> ${service}</p>
                                      <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Data:</strong> ${formattedDate} ${time}</p>
                                      <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Profissional:</strong> ${professional}</p>
                                      <p style="margin: 0; font-size: 14px; color: #333;"><strong>Valor:</strong> ${formattedPriceValue}</p>
                                    </td>
                                  </tr>
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
                          ${barbershopAddress ? `<p style="margin: 0; font-size: 11px; color: #aaa;">${barbershopAddress}</p>` : ''}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
          }

          // Format price for payload
          const formattedServicePrice = price != null ? `R$ ${price.toFixed(2).replace('.', ',')}` : '';

          // Build email payload for n8n webhook
          const emailPayload = {
            channel: 'email',
            barbershopId,
            instanceName: barbershopSlug || '',
            client_name: clientName,
            client_email: clientEmail,
            service_name: service,
            professional_name: professional,
            booking_date: formattedDate,
            booking_time: time,
            service_price: formattedServicePrice,
            barbershop_name: barbershopName,
            barbershop_address: barbershopAddress || '',
            barbershop_logo_url: barbershop?.logo_url || '',
            email_subject: emailSubject,
            email_html: emailHtml,
            use_custom_html: true,
            timestamp: new Date().toISOString(),
          };

          console.log("[EMAIL ONLY] Sending to N8N_WEBHOOK_URL");
          const emailResponse = await fetch(N8N_EMAIL_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(emailPayload),
          });

          if (!emailResponse.ok) {
            const errorText = await emailResponse.text();
            console.error("Email webhook error:", emailResponse.status, errorText);
            await logNotification("email", clientEmail, "failed", JSON.stringify({ service, date: formattedDate }), `Webhook error: ${emailResponse.status}`);
          } else {
            console.log("Email sent via n8n webhook to:", clientEmail);
            await logNotification("email", clientEmail, "sent", JSON.stringify({ subject: emailSubject, service, date: formattedDate }));
          }
        }
      } catch (emailError: any) {
        console.error("Email error:", emailError.message);
        await logNotification("email", clientEmail, "failed", JSON.stringify({ service, date: formattedDate }), emailError.message);
      }
    }

    // Send WhatsApp to client via n8n webhook
    const whatsappEnabled = barbershopSettings?.whatsapp_enabled || notificationSettings.send_whatsapp;
    const whatsappConfirmationEnabled = barbershopSettings?.whatsapp_send_booking_confirmation !== false;
    
    // Fetch WhatsApp template from notification_templates
    const { data: whatsappTemplate } = await supabase
      .from("notification_templates")
      .select("content")
      .eq("barbershop_id", barbershopId)
      .eq("trigger_event", "booking_confirmation")
      .eq("type", "whatsapp")
      .eq("is_active", true)
      .maybeSingle();

    if (whatsappEnabled && whatsappConfirmationEnabled && clientPhone && barbershopSlug) {
      console.log("Sending WhatsApp via n8n webhook...");
      
      let whatsappMessage: string;

      if (whatsappTemplate?.content) {
        // Use dynamic template from database
        whatsappMessage = replacePlaceholders(whatsappTemplate.content);
        console.log("Using dynamic WhatsApp template from database");
      } else {
        // Fallback to default template
        console.log("No custom WhatsApp template found, using default");
        whatsappMessage = `*${barbershopName} - Confirmação de Agendamento*

Olá ${clientName}

Seu agendamento foi confirmado.

Serviço: ${service}
Data: ${formattedDateLong}
Horário: ${time}
Profissional: ${professional}
Valor: R$ ${price.toFixed(2).replace('.', ',')}

${barbershopAddress ? barbershopAddress : ''}

Enviado por ImperioApp`;
      }

      const whatsappResult = await sendWhatsAppViaWebhook(
        barbershopId,
        barbershopSlug,
        clientPhone,
        whatsappMessage,
        clientName,
        service,
        formattedDate,
        time,
        barbershopName,
        barbershopAddress
      );
      
      if (whatsappResult.success) {
        console.log("✅ WhatsApp sent via n8n webhook");
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
        if (!N8N_EMAIL_WEBHOOK_URL) {
          console.error("N8N email webhook URL not configured for admin email");
        } else {
          const formattedPriceAdmin = price != null ? `R$ ${price.toFixed(2).replace('.', ',')}` : '';
          const adminEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #1a1a2e; color: white; padding: 20px; text-align: center; }
              .content { background: #f9f9f9; padding: 20px; }
              .details { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #1a1a2e; }
              .ai-message { background: #e8eaf6; padding: 15px; border-radius: 5px; margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>Novo Agendamento Recebido</h2>
              </div>
              <div class="content">
                ${notificationSettings.ai_enabled ? `
                  <div class="ai-message">
                    <p>${barberMessage}</p>
                  </div>
                ` : ''}
                <div class="details">
                  <p><strong>Cliente:</strong> ${clientName}</p>
                  <p><strong>Email:</strong> ${clientEmail || 'Nao informado'}</p>
                  ${clientPhone ? `<p><strong>Telefone:</strong> ${clientPhone}</p>` : ''}
                  <p><strong>Data:</strong> ${formattedDate}</p>
                  <p><strong>Horario:</strong> ${time}</p>
                  <p><strong>Servico:</strong> ${service}</p>
                  <p><strong>Profissional:</strong> ${professional}</p>
                  <p><strong>Valor:</strong> ${formattedPriceAdmin}</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

          const adminEmailSubject = `Novo Agendamento - ${clientName} - ${formattedDate}`;

          // Build admin email payload for n8n webhook
          const adminEmailPayload = {
            channel: 'email',
            barbershopId,
            instanceName: barbershopSlug || '',
            client_name: clientName,
            client_email: notificationSettings.admin_email,
            service_name: service,
            professional_name: professional,
            booking_date: formattedDate,
            booking_time: time,
            service_price: formattedPriceAdmin,
            barbershop_name: barbershopName,
            barbershop_address: barbershopAddress || '',
            email_subject: adminEmailSubject,
            email_html: adminEmailHtml,
            use_custom_html: true,
            is_admin_notification: true,
            timestamp: new Date().toISOString(),
          };

          console.log("[EMAIL ONLY] Sending admin email to N8N_WEBHOOK_URL");
          const adminEmailResponse = await fetch(N8N_EMAIL_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(adminEmailPayload),
          });

          if (!adminEmailResponse.ok) {
            const errorText = await adminEmailResponse.text();
            console.error("Admin email webhook error:", adminEmailResponse.status, errorText);
          } else {
            console.log("Admin email sent via n8n webhook to:", notificationSettings.admin_email);
          }
        }
      } catch (adminEmailError: any) {
        console.error("Admin email error:", adminEmailError.message);
      }
    }

    // Send WhatsApp to admin via n8n webhook
    if (notificationSettings.admin_whatsapp && barbershopSlug) {
      const adminWhatsAppMessage = `🔔 *Novo Agendamento*

👤 *Cliente:* ${clientName}
📱 *Telefone:* ${clientPhone || 'Não informado'}
📋 *Serviço:* ${service}
💇 *Profissional:* ${professional}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${time}
💰 *Valor:* R$ ${price.toFixed(2)}`;

      const adminWhatsAppResult = await sendWhatsAppViaWebhook(
        barbershopId,
        barbershopSlug,
        notificationSettings.admin_whatsapp,
        adminWhatsAppMessage,
        clientName,
        service,
        formattedDate,
        time,
        barbershopName
      );
      
      if (adminWhatsAppResult.success) {
        console.log("✅ WhatsApp sent to admin via webhook");
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

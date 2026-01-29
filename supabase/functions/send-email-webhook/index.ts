import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// BOTH webhooks must be triggered for every notification
const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL") || "";
const N8N_WHATSAPP_WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL") || "";

interface RequestBody {
  barbershopId: string;
  payload: Record<string, unknown>;
  isTest?: boolean;
}

// Helper function to replace placeholders in templates
function replacePlaceholders(template: string, data: Record<string, unknown>): string {
  return template
    .replace(/\{\{cliente_nome\}\}/g, (data.client_name as string) || '')
    .replace(/\{\{servico_nome\}\}/g, (data.service_name as string) || '')
    .replace(/\{\{data_agendamento\}\}/g, (data.booking_date as string) || '')
    .replace(/\{\{hora_agendamento\}\}/g, (data.booking_time as string) || '')
    .replace(/\{\{profissional_nome\}\}/g, (data.professional_name as string) || '')
    .replace(/\{\{servico_preco\}\}/g, (data.service_price as string) || '')
    .replace(/\{\{barbearia_nome\}\}/g, (data.barbershop_name as string) || '')
    .replace(/\{\{barbearia_endereco\}\}/g, (data.barbershop_address as string) || '')
    .replace(/\{\{barbearia_logo_url\}\}/g, (data.barbershop_logo_url as string) || '');
}

// Generate default email HTML template
function generateDefaultEmailHtml(data: Record<string, unknown>): string {
  const clientName = (data.client_name as string) || 'Cliente';
  const serviceName = (data.service_name as string) || '';
  const bookingDate = (data.booking_date as string) || '';
  const bookingTime = (data.booking_time as string) || '';
  const professionalName = (data.professional_name as string) || '';
  const servicePrice = (data.service_price as string) || '';
  const barbershopName = (data.barbershop_name as string) || 'Barbearia';
  const barbershopAddress = (data.barbershop_address as string) || '';
  const barbershopLogoUrl = (data.barbershop_logo_url as string) || '';

  return `
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
                            ${barbershopLogoUrl ? `
                            <div style="width: 70px; height: 70px; background-color: #1a1a2e; border-radius: 50%; overflow: hidden; margin: 0 auto;">
                              <img src="${barbershopLogoUrl}" alt="${barbershopName}" style="width: 100%; height: 100%; object-fit: contain;" />
                            </div>
                            ` : `<div style="width: 70px; height: 70px; background-color: #1a1a2e; border-radius: 50%; margin: 0 auto;"></div>`}
                            <p style="margin: 8px 0 0; font-size: 10px; font-weight: 600; color: #1a1a2e; text-transform: uppercase;">${barbershopName}</p>
                          </td>
                          <!-- Details Column -->
                          <td style="vertical-align: top;">
                            <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Serviço:</strong> ${serviceName}</p>
                            <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Data:</strong> ${bookingDate} ${bookingTime}</p>
                            <p style="margin: 0 0 6px; font-size: 14px; color: #333;"><strong>Profissional:</strong> ${professionalName}</p>
                            <p style="margin: 0; font-size: 14px; color: #333;"><strong>Valor:</strong> ${servicePrice}</p>
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
  </html>`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let barbershopId: string | undefined;
  let recipientEmail: string | undefined;
  let messageContent: string | undefined;

  try {
    // Validate environment variable
    if (!N8N_WEBHOOK_URL) {
      console.error("N8N email webhook URL not configured");
      return new Response(
        JSON.stringify({ success: false, message: "Email webhook não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    barbershopId = body.barbershopId;
    const { payload, isTest } = body;
    
    // Extract email and content for logging
    recipientEmail = (payload?.client_email as string) || (payload?.to as string) || "unknown";
    messageContent = (payload?.email_subject as string) || (payload?.subject as string) || "Email notification";
    
    if (!barbershopId || !payload) {
      return new Response(
        JSON.stringify({ success: false, message: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending email notification${isTest ? " (TEST)" : ""} via n8n webhook to: ${recipientEmail}`);

    // Fetch barbershop data to get logo_url and other details
    const { data: barbershop, error: barbershopError } = await supabase
      .from("barbershops")
      .select("name, logo_url, address")
      .eq("id", barbershopId)
      .maybeSingle();

    if (barbershopError) {
      console.error("Error fetching barbershop:", barbershopError);
    }

    // Merge barbershop data into payload for template replacement
    const enrichedPayload = {
      ...payload,
      barbershop_name: payload.barbershop_name || barbershop?.name || 'Barbearia',
      barbershop_logo_url: payload.barbershop_logo_url || barbershop?.logo_url || '',
      barbershop_address: payload.barbershop_address || barbershop?.address || '',
    };

    console.log("Barbershop logo URL:", enrichedPayload.barbershop_logo_url);

    // Determine the trigger event from payload or default to booking_confirmation
    const triggerEvent = (payload?.trigger_event as string) || "booking_confirmation";

    // Fetch email template from notification_templates table
    const { data: emailTemplate, error: templateError } = await supabase
      .from("notification_templates")
      .select("content, subject")
      .eq("barbershop_id", barbershopId)
      .eq("trigger_event", triggerEvent)
      .eq("type", "email")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (templateError) {
      console.error("Error fetching email template:", templateError);
    }

    let emailHtml: string;
    let emailSubject: string;

    if (emailTemplate?.content) {
      // Use dynamic template from database
      emailHtml = replacePlaceholders(emailTemplate.content, enrichedPayload);
      emailSubject = replacePlaceholders(
        emailTemplate.subject || `${enrichedPayload.barbershop_name} - Confirmação de Agendamento`,
        enrichedPayload
      );
      console.log("Using dynamic email template from database");
    } else {
      // Fallback to default template
      emailHtml = generateDefaultEmailHtml(enrichedPayload);
      emailSubject = `${enrichedPayload.barbershop_name} - Confirmação de Agendamento`;
      console.log("No custom email template found, using default");
    }

    // Send to n8n webhook with the HTML template included
    const webhookPayload = {
      ...enrichedPayload,
      barbershopId,
      email_html: emailHtml,
      email_subject: emailSubject,
      isTest: isTest || false,
      timestamp: new Date().toISOString(),
    };

    console.log("Sending notification via BOTH n8n webhooks");

    // Send to BOTH webhooks in parallel
    const [emailRes, whatsappRes] = await Promise.all([
      // Email webhook (primary)
      fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...webhookPayload, channel: 'email' }),
      }),
      // WhatsApp webhook (also triggered)
      N8N_WHATSAPP_WEBHOOK_URL ? fetch(N8N_WHATSAPP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...webhookPayload, channel: 'whatsapp' }),
      }) : Promise.resolve(new Response('No whatsapp webhook configured', { status: 200 })),
    ]);

    console.log(`📤 Both webhooks triggered - Email: ${emailRes.status}, WhatsApp: ${whatsappRes.status}`);

    // Use Email response as primary
    const webhookRes = emailRes;

    // Capture response text and try to parse as JSON
    const responseText = await webhookRes.text();
    let webhookData: Record<string, unknown> = {};
    try {
      webhookData = JSON.parse(responseText);
    } catch {
      webhookData = { raw_response: responseText };
    }

    console.log("n8n webhook response status:", webhookRes.status);
    console.log("n8n webhook response data:", webhookData);

    if (!webhookRes.ok) {
      console.error("Error calling n8n webhook:", responseText);
      
      // Log failed notification with webhook response
      if (!isTest && barbershopId) {
        await supabase.from("notification_logs").insert({
          barbershop_id: barbershopId,
          channel: "email",
          recipient_contact: recipientEmail || "unknown",
          status: "failed",
          content: JSON.stringify({
            subject: emailSubject,
            webhook_status: webhookRes.status,
            webhook_response: webhookData,
          }),
          error_message: `Webhook error: ${webhookRes.status} - ${responseText.substring(0, 500)}`,
          sent_at: new Date().toISOString(),
        });
        console.log("Notification failure logged with webhook response");
      }
      
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao enviar email via webhook", webhookStatus: webhookRes.status }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine delivery status from webhook response
    const deliveryStatus = webhookData?.success === true ? "delivered" : "sent";
    const workflowMessage = (webhookData?.message as string) || "Workflow started";

    // Log successful notification with webhook response details
    if (!isTest && barbershopId) {
      const { error: logError } = await supabase.from("notification_logs").insert({
        barbershop_id: barbershopId,
        channel: "email",
        recipient_contact: recipientEmail || "unknown",
        status: deliveryStatus,
        content: JSON.stringify({
          subject: emailSubject,
          client_name: payload?.client_name,
          service_name: payload?.service_name,
          booking_date: payload?.booking_date,
          booking_time: payload?.booking_time,
          webhook_status: webhookRes.status,
          webhook_response: workflowMessage,
        }),
        sent_at: new Date().toISOString(),
      });
      
      if (logError) {
        console.error("Error logging notification:", logError);
      } else {
        console.log("Notification logged successfully with status:", deliveryStatus);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado para o webhook",
        webhookStatus: webhookRes.status,
        webhookResponse: workflowMessage,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-email-webhook:", error);
    
    // Try to log the error
    if (barbershopId) {
      try {
        await supabase.from("notification_logs").insert({
          barbershop_id: barbershopId,
          channel: "email",
          recipient_contact: recipientEmail || "unknown",
          status: "failed",
          content: JSON.stringify({
            subject: messageContent || "Email notification",
            error_type: "exception",
          }),
          error_message: error instanceof Error ? error.message : "Unknown error",
          sent_at: new Date().toISOString(),
        });
      } catch (logErr) {
        console.error("Failed to log notification error:", logErr);
      }
    }
    
    return new Response(
      JSON.stringify({ success: false, message: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

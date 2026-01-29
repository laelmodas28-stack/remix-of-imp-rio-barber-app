import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Force redeploy: 2026-01-29-dual-webhook
// BOTH webhooks must be triggered for every notification
const N8N_WHATSAPP_WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL") || "";
const N8N_EMAIL_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL") || "";

interface RequestBody {
  barbershopId: string;
  phone: string;
  message: string;
  instanceName?: string;
  clientName?: string;
  serviceName?: string;
  bookingDate?: string;
  bookingTime?: string;
  barbershopName?: string;
  barbershopAddress?: string;
  isTest?: boolean;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let barbershopId: string | undefined;
  let phone: string | undefined;
  let message: string | undefined;
  let instanceName: string | undefined;
  let clientName: string | undefined;
  let serviceName: string | undefined;
  let bookingDate: string | undefined;
  let bookingTime: string | undefined;
  let barbershopName: string | undefined;
  let barbershopAddress: string | undefined;

  try {
    // Validate environment variable
    if (!N8N_WHATSAPP_WEBHOOK_URL) {
      console.error("N8N WhatsApp webhook URL not configured");
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp webhook não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: RequestBody = await req.json();
    barbershopId = body.barbershopId;
    phone = body.phone;
    message = body.message;
    instanceName = body.instanceName;
    clientName = body.clientName;
    serviceName = body.serviceName;
    bookingDate = body.bookingDate;
    bookingTime = body.bookingTime;
    barbershopName = body.barbershopName;
    barbershopAddress = body.barbershopAddress;
    const isTest = body.isTest;
    
    if (!barbershopId || !message) {
      return new Response(
        JSON.stringify({ success: false, message: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If instanceName not provided, fetch the barbershop slug
    if (!instanceName) {
      const { data: barbershop } = await supabase
        .from("barbershops")
        .select("slug")
        .eq("id", barbershopId)
        .single();
      
      instanceName = barbershop?.slug || undefined;
    }

    console.log(`Sending notification${isTest ? " (TEST)" : ""} via BOTH n8n webhooks`);
    console.log(`Instance: ${instanceName}, Phone: ${phone || "test"}`);
    
    const commonPayload = {
      barbershopId,
      phone: phone || "test",
      message,
      instanceName,
      clientName,
      serviceName,
      bookingDate,
      bookingTime,
      barbershopName,
      barbershopAddress,
      isTest: isTest || false,
      timestamp: new Date().toISOString(),
    };

    // Send to BOTH webhooks in parallel
    const [whatsappRes, emailRes] = await Promise.all([
      // WhatsApp webhook
      fetch(N8N_WHATSAPP_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...commonPayload, channel: 'whatsapp' }),
      }),
      // Email webhook (also triggered)
      N8N_EMAIL_WEBHOOK_URL ? fetch(N8N_EMAIL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...commonPayload, channel: 'email' }),
      }) : Promise.resolve(new Response('No email webhook configured', { status: 200 })),
    ]);

    // Use WhatsApp response as primary
    const webhookRes = whatsappRes;

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
          channel: "whatsapp",
          recipient_contact: phone || "unknown",
          status: "failed",
          content: JSON.stringify({
            message_preview: message.substring(0, 200),
            instance_name: instanceName,
            client_name: clientName,
            service_name: serviceName,
            booking_date: bookingDate,
            booking_time: bookingTime,
            webhook_status: webhookRes.status,
            webhook_response: webhookData,
          }),
          error_message: `Webhook error: ${webhookRes.status} - ${responseText.substring(0, 500)}`,
          sent_at: new Date().toISOString(),
        });
        console.log("Notification failure logged with webhook response");
      }
      
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao enviar mensagem via webhook", webhookStatus: webhookRes.status }),
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
        channel: "whatsapp",
        recipient_contact: phone || "unknown",
        status: deliveryStatus,
        content: JSON.stringify({
          message_preview: message.substring(0, 200),
          instance_name: instanceName,
          client_name: clientName,
          service_name: serviceName,
          booking_date: bookingDate,
          booking_time: bookingTime,
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
        message: "Mensagem enviada para o webhook",
        webhookStatus: webhookRes.status,
        webhookResponse: workflowMessage,
        instanceName,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-whatsapp-webhook:", error);
    
    // Try to log the error
    if (barbershopId) {
      try {
        await supabase.from("notification_logs").insert({
          barbershop_id: barbershopId,
          channel: "whatsapp",
          recipient_contact: phone || "unknown",
          status: "failed",
          content: JSON.stringify({
            message_preview: message?.substring(0, 200) || "WhatsApp message",
            instance_name: instanceName,
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

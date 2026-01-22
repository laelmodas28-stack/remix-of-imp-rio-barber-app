import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Force redeploy: 2026-01-21T15:30:final
const N8N_WEBHOOK_URL = Deno.env.get("N8N_WEBHOOK_URL") || "";

interface RequestBody {
  barbershopId: string;
  payload: Record<string, unknown>;
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

    // Send to n8n webhook
    const webhookRes = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...payload,
        barbershopId,
        isTest: isTest || false,
        timestamp: new Date().toISOString(),
      }),
    });

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
            subject: messageContent,
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
    // n8n typically returns { message: "Workflow was started" } or similar
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
          subject: messageContent,
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL") || "";
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY") || "";

interface RequestBody {
  barbershopId: string;
  phone: string;
  message: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution API not configured");
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { barbershopId, phone, message }: RequestBody = await req.json();
    
    if (!barbershopId || !phone || !message) {
      return new Response(
        JSON.stringify({ success: false, message: "Dados incompletos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate instance name from barbershop ID
    const instanceName = `barbershop-${barbershopId.substring(0, 8)}`;
    const cleanUrl = EVOLUTION_API_URL.replace(/\/$/, "");

    // Check if instance is connected
    const statusRes = await fetch(`${cleanUrl}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: { "apikey": EVOLUTION_API_KEY },
    });

    if (!statusRes.ok) {
      console.error("Instance not found or error checking status");
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp não conectado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const statusData = await statusRes.json();
    if (statusData.state !== "open" && statusData.state !== "connected") {
      console.error("Instance not connected:", statusData.state);
      return new Response(
        JSON.stringify({ success: false, message: "WhatsApp desconectado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send message
    const sendRes = await fetch(`${cleanUrl}/message/sendText/${instanceName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
    });

    if (!sendRes.ok) {
      const errorText = await sendRes.text();
      console.error("Error sending message:", errorText);
      return new Response(
        JSON.stringify({ success: false, message: "Erro ao enviar mensagem" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sendData = await sendRes.json();
    console.log("Message sent successfully:", sendData);

    return new Response(
      JSON.stringify({ success: true, message: "Mensagem enviada com sucesso" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-whatsapp-message:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

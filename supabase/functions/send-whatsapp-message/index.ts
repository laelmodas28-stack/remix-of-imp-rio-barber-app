import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // === Authentication: Verify JWT ===
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, message: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ success: false, message: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

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

    // === Authorization: Verify user is admin/staff of this barbershop ===
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData, error: roleError } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("barbershop_id", barbershopId)
      .in("role", ["admin", "super_admin"])
      .limit(1)
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("Authorization failed for user", userId, "on barbershop", barbershopId);
      return new Response(
        JSON.stringify({ success: false, message: "Sem permissão para esta barbearia" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
    console.log("Message sent successfully by user", userId, "for barbershop", barbershopId);

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

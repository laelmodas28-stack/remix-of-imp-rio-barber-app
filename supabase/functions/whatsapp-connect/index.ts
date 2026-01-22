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
  action: "create" | "status" | "connect" | "logout" | "delete";
  barbershopId: string;
  instanceName?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment variables
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "Evolution API não configurada no servidor" 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, barbershopId, instanceName }: RequestBody = await req.json();
    
    if (!barbershopId) {
      return new Response(
        JSON.stringify({ success: false, message: "barbershopId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use provided instanceName (slug) or generate from barbershop ID as fallback
    const finalInstanceName = instanceName || `barbershop-${barbershopId.substring(0, 8)}`;
    const cleanUrl = EVOLUTION_API_URL.replace(/\/$/, "");

    let response;

    switch (action) {
      case "create": {
        // Check if instance exists
        const checkRes = await fetch(`${cleanUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: { "apikey": EVOLUTION_API_KEY },
        });

        if (!checkRes.ok) {
          return new Response(
            JSON.stringify({ success: false, message: "Erro de autenticação com Evolution API" }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const instances = await checkRes.json();
        const exists = instances.some((i: any) => i.instance?.instanceName === finalInstanceName);

        if (exists) {
          response = { success: true, message: "Instância já existe", instanceName: finalInstanceName };
        } else {
          const createRes = await fetch(`${cleanUrl}/instance/create`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "apikey": EVOLUTION_API_KEY,
            },
            body: JSON.stringify({
              instanceName: finalInstanceName,
              qrcode: true,
              integration: "WHATSAPP-BAILEYS",
            }),
          });

          if (!createRes.ok) {
            const err = await createRes.text();
            console.error("Create instance error:", err);
            return new Response(
              JSON.stringify({ success: false, message: "Erro ao criar instância" }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }

          response = { success: true, message: "Instância criada!", instanceName: finalInstanceName };
        }
        break;
      }

      case "status": {
        const statusRes = await fetch(`${cleanUrl}/instance/connectionState/${finalInstanceName}`, {
          method: "GET",
          headers: { "apikey": EVOLUTION_API_KEY },
        });

        if (!statusRes.ok) {
          if (statusRes.status === 404) {
            response = { success: true, state: "not_found", message: "Instância não encontrada" };
          } else {
            response = { success: false, state: "error", message: "Erro ao verificar status" };
          }
        } else {
          const data = await statusRes.json();
          const phoneNumber = data.instance?.owner?.split("@")[0];
          response = { 
            success: true, 
            state: data.state || data.instance?.state || "unknown",
            phoneNumber,
            instanceName: finalInstanceName
          };
        }
        break;
      }

      case "connect": {
        // First ensure instance exists
        const checkRes = await fetch(`${cleanUrl}/instance/fetchInstances`, {
          method: "GET",
          headers: { "apikey": EVOLUTION_API_KEY },
        });

        if (checkRes.ok) {
          const instances = await checkRes.json();
          const exists = instances.some((i: any) => i.instance?.instanceName === finalInstanceName);
          
          if (!exists) {
            // Create instance first
            await fetch(`${cleanUrl}/instance/create`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": EVOLUTION_API_KEY,
              },
              body: JSON.stringify({
                instanceName: finalInstanceName,
                qrcode: true,
                integration: "WHATSAPP-BAILEYS",
              }),
            });
          }
        }

        // Get QR code
        const qrRes = await fetch(`${cleanUrl}/instance/connect/${finalInstanceName}`, {
          method: "GET",
          headers: { "apikey": EVOLUTION_API_KEY },
        });

        if (!qrRes.ok) {
          response = { success: false, message: "Erro ao obter QR Code" };
        } else {
          const qrData = await qrRes.json();
          response = { 
            success: true, 
            qrCode: qrData.base64 || qrData.qrcode?.base64,
            instanceName: finalInstanceName
          };
        }
        break;
      }

      case "logout": {
        const logoutRes = await fetch(`${cleanUrl}/instance/logout/${finalInstanceName}`, {
          method: "DELETE",
          headers: { "apikey": EVOLUTION_API_KEY },
        });

        response = logoutRes.ok 
          ? { success: true, message: "WhatsApp desconectado" }
          : { success: false, message: "Erro ao desconectar" };
        break;
      }

      case "delete": {
        const deleteRes = await fetch(`${cleanUrl}/instance/delete/${finalInstanceName}`, {
          method: "DELETE",
          headers: { "apikey": EVOLUTION_API_KEY },
        });

        response = deleteRes.ok 
          ? { success: true, message: "Instância removida" }
          : { success: false, message: "Erro ao remover instância" };
        break;
      }

      default:
        response = { success: false, message: "Ação inválida" };
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in whatsapp-connect:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

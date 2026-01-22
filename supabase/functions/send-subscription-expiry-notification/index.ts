import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  subscriptionId: string;
  clientEmail: string;
  clientName: string;
  planName: string;
  endDate: string;
  daysRemaining: number;
  barbershopName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      subscriptionId,
      clientEmail,
      clientName,
      planName,
      endDate,
      daysRemaining,
      barbershopName,
    }: NotificationRequest = await req.json();

    console.log("Processing subscription expiry notification for:", clientEmail);

    // Buscar dados da assinatura
    const { data: subscription } = await supabase
      .from("client_subscriptions")
      .select("*, barbershop:barbershops(*)")
      .eq("id", subscriptionId)
      .single();

    if (!subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar data
    const formattedDate = new Date(endDate).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .cta-button { background: #f59e0b; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Sua Assinatura está expirando!</h1>
          </div>
          <div class="content">
            <div class="warning-box">
              <h2 style="margin-top: 0; color: #d97706;">Olá, ${clientName}!</h2>
              <p style="margin: 0;">
                Sua assinatura <strong>${planName}</strong> está próxima do vencimento.
              </p>
            </div>
            
            <div class="details">
              <p><strong>📅 Data de Vencimento:</strong> ${formattedDate}</p>
              <p><strong>⏰ Dias Restantes:</strong> ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}</p>
              <p><strong>🏪 Barbearia:</strong> ${barbershopName || subscription.barbershop?.name || 'Sua Barbearia'}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 16px; color: #666;">
                Renove sua assinatura agora e continue aproveitando todos os benefícios!
              </p>
              <a href="${supabaseUrl}" class="cta-button">
                Renovar Assinatura
              </a>
            </div>

            ${subscription.barbershop?.whatsapp ? `
              <div style="text-align: center; margin: 20px 0;">
                <a href="https://wa.me/${subscription.barbershop.whatsapp.replace(/\D/g, '')}" 
                   style="color: #25D366; text-decoration: none;">
                  💬 Entre em contato via WhatsApp
                </a>
              </div>
            ` : ''}
          </div>
          <div class="footer">
            <p>Não perca seus benefícios! Renove antes do vencimento.</p>
            <p>${barbershopName || subscription.barbershop?.name || 'Barbearia'}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await resend.emails.send({
      from: "Barbearia <onboarding@resend.dev>",
      to: [clientEmail],
      subject: `⚠️ Sua assinatura ${planName} expira em ${daysRemaining} ${daysRemaining === 1 ? 'dia' : 'dias'}`,
      html: emailHtml,
    });

    console.log("Subscription expiry notification sent to:", clientEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error sending subscription notification:", error);
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

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Checking for expiring subscriptions...");

    // Calcular data daqui a 7 dias
    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Buscar assinaturas que expiram nos próximos 7 dias
    const { data: expiringSubscriptions, error } = await supabase
      .from("client_subscriptions")
      .select(`
        *,
        plan:subscription_plans(name),
        client:profiles(full_name),
        barbershop:barbershops(name, whatsapp)
      `)
      .eq("status", "active")
      .gte("end_date", today.toISOString().split('T')[0])
      .lte("end_date", sevenDaysFromNow.toISOString().split('T')[0]);

    if (error) throw error;

    console.log(`Found ${expiringSubscriptions?.length || 0} expiring subscriptions`);

    const notifications = [];

    // Enviar notificações para cada assinatura expirando
    for (const subscription of expiringSubscriptions || []) {
      // Calcular dias restantes
      const endDate = new Date(subscription.end_date);
      const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Pegar email do cliente
      const { data: auth } = await supabase.auth.admin.getUserById(subscription.client_id);
      
      if (!auth?.user?.email) {
        console.log(`No email found for client ${subscription.client_id}`);
        continue;
      }

      try {
        // Chamar função de notificação
        await supabase.functions.invoke("send-subscription-expiry-notification", {
          body: {
            subscriptionId: subscription.id,
            clientEmail: auth.user.email,
            clientName: subscription.client?.full_name || "Cliente",
            planName: subscription.plan?.name || "Plano",
            endDate: subscription.end_date,
            daysRemaining: daysRemaining,
            barbershopName: subscription.barbershop?.name,
          },
        });

        notifications.push({
          client: auth.user.email,
          daysRemaining: daysRemaining,
          status: "sent",
        });

        console.log(`Notification sent to ${auth.user.email} - ${daysRemaining} days remaining`);
      } catch (notifError: any) {
        console.error(`Error sending notification to ${auth.user.email}:`, notifError);
        notifications.push({
          client: auth.user.email,
          daysRemaining: daysRemaining,
          status: "error",
          error: notifError?.message || "Unknown error",
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Checked ${expiringSubscriptions?.length || 0} subscriptions`,
        notifications: notifications,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error checking expiring subscriptions:", error);
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, asaas-access-token',
};

interface AsaasWebhookPayment {
  id: string;
  customer: string;
  value: number;
  netValue: number;
  billingType: string;
  status: string;
  dueDate: string;
  paymentDate?: string;
  confirmedDate?: string;
  externalReference?: string;
}

interface AsaasWebhookEvent {
  event: string;
  payment?: AsaasWebhookPayment;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AsaasWebhookEvent = await req.json();
    
    console.log('ASAAS Webhook received:', JSON.stringify(body, null, 2));

    const { event, payment } = body;

    if (!payment) {
      console.log('No payment data in webhook');
      return new Response(
        JSON.stringify({ success: true, message: 'No payment data' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentId = payment.id;
    console.log(`Processing event ${event} for payment ${paymentId}`);

    // Find the subscription by ASAAS payment ID
    const { data: subscription, error: findError } = await supabase
      .from('barbershop_subscriptions')
      .select('*, barbershop:barbershops(name, owner_id)')
      .eq('asaas_payment_id', paymentId)
      .single();

    if (findError || !subscription) {
      console.error('Subscription not found for payment:', paymentId, findError);
      return new Response(
        JSON.stringify({ success: false, error: 'Subscription not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found subscription:', subscription.id, 'for barbershop:', subscription.barbershop_id);

    // Parse external reference to get plan details
    let planId: string | null = null;
    if (payment.externalReference) {
      try {
        const ref = JSON.parse(payment.externalReference);
        planId = ref.planId;
      } catch (e) {
        console.log('Could not parse external reference');
      }
    }

    // Get plan details if we have planId
    let planDays = 30; // Default to monthly
    let planName = subscription.plan_type;
    
    if (planId) {
      const { data: plan } = await supabase
        .from('platform_plans')
        .select('name, billing_cycle')
        .eq('id', planId)
        .single();
      
      if (plan) {
        planName = plan.name.toLowerCase();
        planDays = plan.billing_cycle === 'YEARLY' ? 365 : 30;
      }
    }

    // Handle different payment events
    let updateData: Record<string, unknown> = {};
    let shouldNotify = false;

    switch (event) {
      case 'PAYMENT_CONFIRMED':
      case 'PAYMENT_RECEIVED':
        // Payment was successful - activate subscription
        const now = new Date();
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + planDays);

        updateData = {
          status: 'active',
          plan_type: planName,
          subscription_started_at: now.toISOString(),
          subscription_ends_at: endDate.toISOString(),
          paid_at: payment.confirmedDate || payment.paymentDate || now.toISOString(),
          payment_method: payment.billingType,
          notes: `Pagamento confirmado via ${payment.billingType}`,
          trial_ends_at: null, // Clear trial when paid
        };
        shouldNotify = true;
        console.log('Activating subscription until:', endDate.toISOString());
        break;

      case 'PAYMENT_OVERDUE':
        updateData = {
          status: 'overdue',
          notes: 'Pagamento em atraso',
        };
        break;

      case 'PAYMENT_DELETED':
      case 'PAYMENT_REFUNDED':
      case 'PAYMENT_CHARGEBACK_REQUESTED':
        updateData = {
          status: 'cancelled',
          notes: `Pagamento ${event.replace('PAYMENT_', '').toLowerCase()}`,
        };
        break;

      case 'PAYMENT_UPDATED':
        // Just log, no status change needed
        console.log('Payment updated:', paymentId);
        break;

      default:
        console.log('Unhandled event type:', event);
    }

    // Update subscription if we have changes
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('barbershop_subscriptions')
        .update(updateData)
        .eq('id', subscription.id);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
        return new Response(
          JSON.stringify({ success: false, error: 'Failed to update subscription' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Subscription updated successfully:', subscription.id);

      // Create notification for owner if payment confirmed
      if (shouldNotify && subscription.barbershop?.owner_id) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: subscription.barbershop.owner_id,
            barbershop_id: subscription.barbershop_id,
            type: 'subscription',
            title: '🎉 Assinatura Ativada!',
            message: `Seu pagamento foi confirmado. Sua assinatura ${planName.toUpperCase()} está ativa até ${new Date(updateData.subscription_ends_at as string).toLocaleDateString('pt-BR')}.`,
          });

        if (notifError) {
          console.error('Error creating notification:', notifError);
        }
      }

      // Log activity
      await supabase
        .from('platform_activity_logs')
        .insert({
          entity_type: 'subscription',
          entity_id: subscription.id,
          action: event,
          details: {
            payment_id: paymentId,
            status: updateData.status,
            value: payment.value,
            billing_type: payment.billingType,
          },
        });
    }

    return new Response(
      JSON.stringify({ success: true, event, paymentId }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

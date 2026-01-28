import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

interface AsaasPaymentLink {
  id: string;
  url: string;
  name: string;
  value: number;
  billingType: string;
  active: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      console.error('ASAAS_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'ASAAS_NOT_CONFIGURED' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { planId, barbershopId } = await req.json();

    if (!planId || !barbershopId) {
      return new Response(
        JSON.stringify({ error: 'planId e barbershopId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating ASAAS checkout for plan ${planId}, barbershop ${barbershopId}, user ${user.id}`);

    // Get platform plan details
    const { data: plan, error: planError } = await supabase
      .from('platform_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      console.error('Plan not found:', planError);
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get barbershop info
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('*')
      .eq('id', barbershopId)
      .eq('owner_id', user.id)
      .single();

    if (barbershopError || !barbershop) {
      console.error('Barbershop not found or not owner:', barbershopError);
      return new Response(
        JSON.stringify({ error: 'Barbearia não encontrada ou você não é o proprietário' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate due date (3 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Build billing period label
    let periodLabel = 'Mensal';
    if (plan.billing_cycle === 'QUARTERLY') periodLabel = 'Trimestral';
    if (plan.billing_cycle === 'YEARLY') periodLabel = 'Anual';

    // Create payment link in ASAAS (customers enter their own CPF)
    const paymentLinkPayload = {
      name: `${plan.name} ${periodLabel} - ${barbershop.name}`,
      description: `Assinatura ${plan.name} (${periodLabel}) para ${barbershop.name}`,
      value: plan.price,
      billingType: 'UNDEFINED', // Allows PIX, credit card, boleto
      chargeType: 'DETACHED', // One-time payment
      dueDateLimitDays: 3,
      maxInstallmentCount: plan.billing_cycle === 'YEARLY' ? 12 : (plan.billing_cycle === 'QUARTERLY' ? 3 : 1),
      notificationEnabled: true,
      // externalReference is limited to 64 chars for payment links
      externalReference: barbershopId.substring(0, 64),
    };

    console.log('Creating ASAAS payment link:', paymentLinkPayload);

    const paymentLinkResponse = await fetch(`${ASAAS_API_URL}/paymentLinks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentLinkPayload),
    });

    if (!paymentLinkResponse.ok) {
      const errorData = await paymentLinkResponse.text();
      console.error('ASAAS payment link creation failed:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar link de pagamento no ASAAS', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const paymentLink: AsaasPaymentLink = await paymentLinkResponse.json();
    console.log('Created ASAAS payment link:', paymentLink.id, 'URL:', paymentLink.url);

    // Create or update barbershop subscription record
    const subscriptionData = {
      barbershop_id: barbershopId,
      plan_type: plan.name.toLowerCase(),
      status: 'pending_payment',
      asaas_payment_id: paymentLink.id,
      asaas_payment_link: paymentLink.url,
      payment_value: plan.price,
      created_by: user.id,
      notes: `Aguardando pagamento - Plano ${plan.name} (${periodLabel})`,
    };

    const { error: subscriptionError } = await supabase
      .from('barbershop_subscriptions')
      .insert(subscriptionData);

    if (subscriptionError) {
      console.error('Error creating subscription record:', subscriptionError);
      // Don't fail - payment link was created, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: paymentLink.id,
        invoiceUrl: paymentLink.url,
        status: 'pending',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

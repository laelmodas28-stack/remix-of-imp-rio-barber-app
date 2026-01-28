import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = 'https://api.asaas.com/v3';

interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj?: string;
}

interface AsaasPayment {
  id: string;
  invoiceUrl: string;
  bankSlipUrl?: string;
  status: string;
  value: number;
  netValue: number;
  billingType: string;
  dueDate: string;
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

    // Get owner profile info
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('full_name, email, phone')
      .eq('id', user.id)
      .single();

    const ownerEmail = user.email || '';
    const ownerName = ownerProfile?.full_name || barbershop.name || 'Cliente';
    const ownerPhone = ownerProfile?.phone?.replace(/\D/g, '') || '';

    // Check for existing ASAAS customer or create new one
    let asaasCustomerId: string | null = null;

    // Check if barbershop has existing subscription with ASAAS customer
    const { data: existingSub } = await supabase
      .from('barbershop_subscriptions')
      .select('asaas_customer_id')
      .eq('barbershop_id', barbershopId)
      .not('asaas_customer_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingSub && existingSub.length > 0 && existingSub[0].asaas_customer_id) {
      asaasCustomerId = existingSub[0].asaas_customer_id;
      console.log('Using existing ASAAS customer:', asaasCustomerId);
    } else {
      // Create new customer in ASAAS
      console.log('Creating new ASAAS customer...');
      
      const customerPayload = {
        name: ownerName,
        email: ownerEmail,
        phone: ownerPhone || undefined,
        externalReference: barbershopId,
        notificationDisabled: false,
      };

      const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': ASAAS_API_KEY,
        },
        body: JSON.stringify(customerPayload),
      });

      if (!customerResponse.ok) {
        const errorData = await customerResponse.text();
        console.error('ASAAS customer creation failed:', errorData);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar cliente no ASAAS' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const customer: AsaasCustomer = await customerResponse.json();
      asaasCustomerId = customer.id;
      console.log('Created ASAAS customer:', asaasCustomerId);
    }

    // Calculate due date (3 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    const dueDateStr = dueDate.toISOString().split('T')[0];

    // Create payment in ASAAS
    const paymentPayload = {
      customer: asaasCustomerId,
      billingType: 'UNDEFINED', // Allows PIX, credit card, boleto
      value: plan.price,
      dueDate: dueDateStr,
      description: `Assinatura ${plan.name} - ${barbershop.name}`,
      externalReference: JSON.stringify({
        barbershopId,
        planId,
        userId: user.id,
      }),
    };

    console.log('Creating ASAAS payment:', paymentPayload);

    const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
      },
      body: JSON.stringify(paymentPayload),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.text();
      console.error('ASAAS payment creation failed:', errorData);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar cobrança no ASAAS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payment: AsaasPayment = await paymentResponse.json();
    console.log('Created ASAAS payment:', payment.id, 'Invoice URL:', payment.invoiceUrl);

    // Create or update barbershop subscription record
    const subscriptionData = {
      barbershop_id: barbershopId,
      plan_type: plan.name.toLowerCase(),
      status: 'pending_payment',
      asaas_customer_id: asaasCustomerId,
      asaas_payment_id: payment.id,
      asaas_payment_link: payment.invoiceUrl,
      payment_value: plan.price,
      created_by: user.id,
      notes: `Aguardando pagamento - Plano ${plan.name}`,
    };

    const { error: subscriptionError } = await supabase
      .from('barbershop_subscriptions')
      .insert(subscriptionData);

    if (subscriptionError) {
      console.error('Error creating subscription record:', subscriptionError);
      // Don't fail - payment was created, just log the error
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
        status: payment.status,
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

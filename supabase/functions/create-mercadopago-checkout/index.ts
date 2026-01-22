import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  planId: string;
  barbershopId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mercadopagoToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');

    if (!mercadopagoToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Mercado Pago não configurado. Entre em contato com o administrador.',
          code: 'MP_NOT_CONFIGURED'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { planId, barbershopId }: CheckoutRequest = await req.json();

    // Fetch plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('Plan error:', planError);
      return new Response(
        JSON.stringify({ error: 'Plano não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch barbershop details
    const { data: barbershop, error: barbershopError } = await supabase
      .from('barbershops')
      .select('name, slug')
      .eq('id', barbershopId)
      .single();

    if (barbershopError || !barbershop) {
      console.error('Barbershop error:', barbershopError);
      return new Response(
        JSON.stringify({ error: 'Barbearia não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('name, email')
      .eq('user_id', user.id)
      .single();

    // Create Mercado Pago preference
    const preference = {
      items: [
        {
          id: planId,
          title: `${plan.name} - ${barbershop.name}`,
          description: plan.description || `Assinatura ${plan.name}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: Number(plan.price),
        }
      ],
      payer: {
        name: profile?.name || user.email?.split('@')[0] || 'Cliente',
        email: user.email,
      },
      back_urls: {
        success: `https://imperioapp.lovable.app/b/${barbershop.slug}/assinaturas?payment=success`,
        failure: `https://imperioapp.lovable.app/b/${barbershop.slug}/assinaturas?payment=failure`,
        pending: `https://imperioapp.lovable.app/b/${barbershop.slug}/assinaturas?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        planId,
        barbershopId,
        userId: user.id,
      }),
      notification_url: `${supabaseUrl}/functions/v1/mercadopago-webhook`,
      statement_descriptor: barbershop.name.substring(0, 22),
    };

    console.log('Creating Mercado Pago preference:', JSON.stringify(preference, null, 2));

    // Call Mercado Pago API
    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mercadopagoToken}`,
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('Mercado Pago error:', mpData);
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao criar checkout no Mercado Pago',
          details: mpData 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Mercado Pago preference created:', mpData.id);

    // Create pending transaction record
    const { error: transactionError } = await supabase
      .from('payment_transactions')
      .insert({
        barbershop_id: barbershopId,
        client_id: user.id,
        plan_id: planId,
        preference_id: mpData.id,
        amount: plan.price,
        status: 'pending',
      });

    if (transactionError) {
      console.error('Transaction insert error:', transactionError);
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({
        preferenceId: mpData.id,
        initPoint: mpData.init_point,
        sandboxInitPoint: mpData.sandbox_init_point,
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

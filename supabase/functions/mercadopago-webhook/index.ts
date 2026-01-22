import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-request-id',
};

// Validate Mercado Pago webhook signature
async function validateWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string | null,
  secret: string
): Promise<boolean> {
  if (!xSignature || !xRequestId) {
    console.error('Missing signature headers');
    return false;
  }

  try {
    // Parse x-signature header: "ts=xxx,v1=xxx"
    const signatureParts = xSignature.split(',');
    let ts = '';
    let v1 = '';
    
    for (const part of signatureParts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') v1 = value;
    }

    if (!ts || !v1) {
      console.error('Invalid signature format');
      return false;
    }

    // Build manifest string
    // According to Mercado Pago docs: id:[data_id];request-id:[x-request-id];ts:[ts];
    const manifest = `id:${dataId || ''};request-id:${xRequestId};ts:${ts};`;
    
    // Generate HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(manifest);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureHex = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Compare signatures using timing-safe comparison
    const isValid = signatureHex === v1;
    
    if (!isValid) {
      console.error('Signature mismatch:', { expected: v1, calculated: signatureHex });
    }
    
    return isValid;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
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
    const webhookSecret = Deno.env.get('MERCADOPAGO_WEBHOOK_SECRET');

    if (!mercadopagoToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook data
    const url = new URL(req.url);
    const topic = url.searchParams.get('topic') || url.searchParams.get('type');
    const id = url.searchParams.get('id') || url.searchParams.get('data.id');

    // Also try to get from body
    let body: any = {};
    let rawBody = '';
    try {
      rawBody = await req.text();
      if (rawBody) {
        body = JSON.parse(rawBody);
      }
    } catch {
      // Body might be empty for some notifications
    }

    const paymentId = id || body?.data?.id;
    const type = topic || body?.type;

    console.log('Webhook received:', { type, paymentId });

    // Validate webhook signature if secret is configured
    if (webhookSecret) {
      const xSignature = req.headers.get('x-signature');
      const xRequestId = req.headers.get('x-request-id');
      
      const isValidSignature = await validateWebhookSignature(
        xSignature,
        xRequestId,
        paymentId,
        webhookSecret
      );
      
      if (!isValidSignature) {
        console.error('Invalid webhook signature - potential forgery attempt');
        return new Response('Invalid signature', { status: 401, headers: corsHeaders });
      }
      
      console.log('Webhook signature validated successfully');
    } else {
      console.warn('MERCADOPAGO_WEBHOOK_SECRET not configured - signature validation disabled');
    }

    if (type !== 'payment' || !paymentId) {
      console.log('Ignoring non-payment notification');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Fetch payment details from Mercado Pago
    const paymentResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: {
          'Authorization': `Bearer ${mercadopagoToken}`,
        },
      }
    );

    if (!paymentResponse.ok) {
      console.error('Failed to fetch payment:', await paymentResponse.text());
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const payment = await paymentResponse.json();
    console.log('Payment details:', JSON.stringify(payment, null, 2));

    const preferenceId = payment.preference_id;
    const status = payment.status; // approved, pending, rejected, cancelled, etc.
    const paymentMethod = payment.payment_type_id; // credit_card, pix, boleto, etc.

    // Parse external_reference
    let externalRef: { planId?: string; barbershopId?: string; userId?: string } = {};
    try {
      externalRef = JSON.parse(payment.external_reference || '{}');
    } catch {
      console.error('Failed to parse external_reference');
    }

    const { planId, barbershopId, userId } = externalRef;

    if (!planId || !barbershopId || !userId) {
      console.error('Missing external reference data');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Update transaction record
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        transaction_id: String(paymentId),
        status: status === 'approved' ? 'completed' : status,
        mercadopago_status: status,
        payment_method: paymentMethod,
        raw_response: payment,
        updated_at: new Date().toISOString(),
      })
      .eq('preference_id', preferenceId);

    if (updateError) {
      console.error('Failed to update transaction:', updateError);
    }

    // If payment is approved, create or update subscription
    if (status === 'approved') {
      console.log('Payment approved, creating subscription...');

      // Fetch plan to get duration
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('duration_days')
        .eq('id', planId)
        .single();

      const startDate = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (plan?.duration_days || 30));

      // Check for existing subscription
      const { data: existingSub } = await supabase
        .from('client_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('barbershop_id', barbershopId)
        .eq('status', 'active')
        .single();

      if (existingSub) {
        // Update existing subscription
        const { error: subError } = await supabase
          .from('client_subscriptions')
          .update({
            plan_id: planId,
            expires_at: expiresAt.toISOString(),
            payment_method: paymentMethod,
            transaction_id: String(paymentId),
            mercadopago_preference_id: preferenceId,
          })
          .eq('id', existingSub.id);

        if (subError) {
          console.error('Failed to update subscription:', subError);
        } else {
          console.log('Subscription updated successfully');
        }
      } else {
        // Create new subscription
        const { error: subError } = await supabase
          .from('client_subscriptions')
          .insert({
            user_id: userId,
            plan_id: planId,
            barbershop_id: barbershopId,
            started_at: startDate.toISOString(),
            expires_at: expiresAt.toISOString(),
            status: 'active',
            payment_method: paymentMethod,
            transaction_id: String(paymentId),
            mercadopago_preference_id: preferenceId,
          });

        if (subError) {
          console.error('Failed to create subscription:', subError);
        } else {
          console.log('Subscription created successfully');
        }
      }

      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          barbershop_id: barbershopId,
          title: 'Assinatura Ativada! 🎉',
          message: 'Seu pagamento foi confirmado e sua assinatura está ativa.',
          type: 'success',
        });
    } else if (status === 'rejected' || status === 'cancelled') {
      // Create notification for failed payment
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          barbershop_id: barbershopId,
          title: 'Pagamento não aprovado',
          message: 'Houve um problema com seu pagamento. Tente novamente.',
          type: 'error',
        });
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});

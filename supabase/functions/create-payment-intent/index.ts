// Creates a PaymentIntent for Stripe Payment Sheet (mobile).
// Secret key never touches the client.
//
// Deploy: supabase functions deploy create-payment-intent
// Secrets: supabase secrets set STRIPE_SECRET_KEY=sk_test_...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const STRIPE_API_VERSION = '2024-11-20.acacia';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MIN_AMOUNT_CENTS = 50;
const MAX_AMOUNT_CENTS = 99_999;
const DEFAULT_AMOUNT_CENTS = 499;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  if (!STRIPE_SECRET_KEY) {
    return jsonResponse(
      { error: 'Server misconfiguration: STRIPE_SECRET_KEY is not set on the Edge Function.' },
      500
    );
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing authorization' }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    let body: { amountCents?: number } = {};
    try {
      const text = await req.text();
      if (text) body = JSON.parse(text) as { amountCents?: number };
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    let amount = typeof body.amountCents === 'number' ? Math.floor(body.amountCents) : DEFAULT_AMOUNT_CENTS;
    if (!Number.isFinite(amount)) amount = DEFAULT_AMOUNT_CENTS;
    amount = Math.min(MAX_AMOUNT_CENTS, Math.max(MIN_AMOUNT_CENTS, amount));

    const params = new URLSearchParams();
    params.set('amount', String(amount));
    params.set('currency', 'usd');
    params.set('automatic_payment_methods[enabled]', 'true');
    params.set('metadata[supabase_user_id]', user.id);

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': STRIPE_API_VERSION,
      },
      body: params.toString(),
    });

    const stripeData = (await stripeRes.json()) as {
      error?: { message?: string };
      client_secret?: string;
    };

    if (!stripeRes.ok) {
      const msg = stripeData.error?.message || `Stripe error ${stripeRes.status}`;
      console.error('[create-payment-intent]', msg);
      return jsonResponse({ error: msg }, 502);
    }

    if (!stripeData.client_secret) {
      return jsonResponse({ error: 'Stripe did not return a client secret' }, 502);
    }

    return jsonResponse({
      clientSecret: stripeData.client_secret,
      amountCents: amount,
    });
  } catch (err) {
    console.error('[create-payment-intent]', err);
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: message }, 500);
  }
});

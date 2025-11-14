import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const { sessionId, creatorId } = await req.json();
    if (!sessionId || !creatorId) throw new Error('Missing sessionId or creatorId');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header provided');
    const token = authHeader.replace('Bearer ', '');

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error('User not authenticated');

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', { apiVersion: '2023-10-16' });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.mode !== 'subscription') throw new Error('Invalid session');

    // Validate creator and fan from metadata when available
    const metaCreator = (session.metadata as any)?.creatorId;
    const metaFan = (session.metadata as any)?.fanId;
    const metaTierId =
      (session.metadata as any)?.membershipTierId ||
      (session.metadata as any)?.membership_tier_id ||
      null;
    if (metaCreator && metaCreator !== creatorId) throw new Error('Creator mismatch');
    if (metaFan && metaFan !== user.id) throw new Error('Fan mismatch');

    const subscriptionId = session.subscription as string | undefined;
    if (!subscriptionId) throw new Error('No subscription on session');

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      throw new Error(`Subscription not active: ${subscription.status}`);
    }

    const amount = subscription.items.data[0]?.price?.unit_amount ?? 0;
    const stripePriceId = subscription.items.data[0]?.price?.id ?? null;
    const currency = subscription.items.data[0]?.price?.currency?.toUpperCase() ?? 'USD';
    const billingStartedAt = subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : new Date().toISOString();
    const stripeCustomerId =
      typeof subscription.customer === 'string'
        ? subscription.customer
        : (subscription.customer as Stripe.Customer | null)?.id ?? null;

    const fanUpdate = {
      status: 'active',
      price_cents: amount,
      currency,
      tier_id: metaTierId,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: stripeCustomerId,
      stripe_price_id: stripePriceId,
      last_payment_at: billingStartedAt,
      metadata: {
        verified_via: 'verify-fan-subscription',
        session_id: sessionId,
      },
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error: updateErr } = await supabase
      .from('fan_subscriptions')
      .update(fanUpdate)
      .eq('fan_id', user.id)
      .eq('creator_id', creatorId)
      .select('id');

    if (updateErr) throw updateErr;

    if (!updated || updated.length === 0) {
      const { error: insertErr } = await supabase.from('fan_subscriptions').insert({
        fan_id: user.id,
        creator_id: creatorId,
        tier_id: metaTierId,
        status: 'active',
        price_cents: amount,
        currency,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: stripeCustomerId,
        stripe_price_id: stripePriceId,
        last_payment_at: billingStartedAt,
        metadata: {
          verified_via: 'verify-fan-subscription',
          session_id: sessionId,
        },
      });
      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[verify-fan-subscription] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

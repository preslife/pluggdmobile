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
    if (metaCreator && metaCreator !== creatorId) throw new Error('Creator mismatch');
    if (metaFan && metaFan !== user.id) throw new Error('Fan mismatch');

    const subscriptionId = session.subscription as string | undefined;
    if (!subscriptionId) throw new Error('No subscription on session');

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      throw new Error(`Subscription not active: ${subscription.status}`);
    }

    // Amount in cents from first item price
    const amount = subscription.items.data[0]?.price?.unit_amount ?? 0;

    // Try to mark pending record active, otherwise insert
    const { data: updated, error: updateErr } = await (supabase.from as any)('fan_subscriptions')
      .update({ status: 'active', price_cents: amount, updated_at: new Date().toISOString() })
      .eq('fan_id', user.id)
      .eq('creator_id', creatorId)
      .eq('status', 'pending')
      .select('id');

    if (updateErr) throw updateErr;

    if (!updated || updated.length === 0) {
      // Fallback insert active
      const { error: insertErr } = await (supabase.from as any)('fan_subscriptions').insert({
        fan_id: user.id,
        creator_id: creatorId,
        status: 'active',
        price_cents: amount,
        currency: 'usd',
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

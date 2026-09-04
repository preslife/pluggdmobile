import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      const { data: entitlement, error: syncError } = await supabaseClient.rpc(
        "platform_sync_stripe_subscription",
        {
          p_user_id: user.id,
          p_tier: "free",
          p_status: "inactive",
          p_subscription_id: null,
          p_period_start: null,
          p_period_end: null,
          p_product_id: null,
          p_billing_cycle: "monthly",
        },
      );
      if (syncError) throw new Error(`Subscription reconciliation failed: ${syncError.message}`);
      
      return new Response(JSON.stringify({ 
        tier: entitlement?.tier ?? 'free',
        status: entitlement?.status ?? 'active',
        current_period_end: entitlement?.current_period_end ?? null,
        billing_provider: entitlement?.billing_provider ?? null,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let tier = 'free';
    let billingCycle = 'monthly';
    let priceId: string | null = null;
    let subscriptionEnd = null;
    let stripeSubscriptionId = null;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      stripeSubscriptionId = subscription.id;
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Determine tier from price
      priceId = subscription.items.data[0].price.id;
      const { data: mappedProduct, error: mappedProductError } = await supabaseClient
        .from("platform_subscription_products")
        .select("tier,billing_cycle")
        .eq("provider", "stripe")
        .eq("product_id", priceId)
        .eq("is_active", true)
        .maybeSingle();
      if (mappedProductError) throw new Error(`Stripe plan catalogue lookup failed: ${mappedProductError.message}`);
      if (!mappedProduct) throw new Error(`Stripe price is not mapped to a PLUGGD plan: ${priceId}`);
      tier = mappedProduct.tier;
      billingCycle = mappedProduct.billing_cycle;
      logStep("Resolved subscription tier", { priceId, tier, billingCycle });
    } else {
      logStep("No active subscription found");
    }

    const { data: entitlement, error: syncError } = await supabaseClient.rpc(
      "platform_sync_stripe_subscription",
      {
        p_user_id: user.id,
        p_tier: tier,
        p_status: subscriptions.data.length > 0 ? "active" : "inactive",
        p_subscription_id: stripeSubscriptionId,
        p_period_start: subscriptions.data.length > 0
          ? new Date(subscriptions.data[0].current_period_start * 1000).toISOString()
          : null,
        p_period_end: subscriptionEnd,
        p_product_id: priceId,
        p_billing_cycle: billingCycle,
      },
    );
    if (syncError) throw new Error(`Subscription reconciliation failed: ${syncError.message}`);

    logStep("Updated database with subscription info", { tier, status: subscriptions.data.length > 0 ? 'active' : 'inactive' });
    
    return new Response(JSON.stringify({
      tier: entitlement?.tier ?? tier,
      status: entitlement?.status ?? (subscriptions.data.length > 0 ? 'active' : 'inactive'),
      current_period_end: entitlement?.current_period_end ?? subscriptionEnd,
      billing_provider: entitlement?.billing_provider ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

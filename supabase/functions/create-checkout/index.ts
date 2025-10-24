import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseService =
    supabaseServiceRoleKey
      ? createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { persistSession: false } })
      : null;

  let rawPayload: Record<string, unknown> = {};
  try {
    rawPayload = await req.json();
  } catch {
    rawPayload = {};
  }

  const requestedTier = typeof rawPayload?.tier === "string" ? (rawPayload.tier as string) : undefined;
  const requestCorrelationId =
    (typeof rawPayload?.correlationId === "string" ? (rawPayload.correlationId as string) : undefined) ??
    req.headers.get("x-correlation-id") ??
    generateCorrelationId();

  const logger =
    supabaseService && supabaseUrl
      ? createSystemLogger(supabaseService, {
          component: "create_checkout",
          feature: "billing",
          correlationId: requestCorrelationId,
          message: "Create Stripe checkout session",
        })
      : null;

  let userId: string | null = null;

  try {
    await logger?.info("create_checkout_request_received", {
      has_tier: Boolean(requestedTier),
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    userId = user.id;

    await logger?.info("create_checkout_user_authenticated", {
      user_id: user.id,
    });

    const tier = requestedTier;
    if (!tier || !["creator", "pro"].includes(tier)) {
      throw new Error("Invalid tier specified");
    }

    await logger?.info("create_checkout_tier_validated", {
      user_id: user.id,
      tier,
    });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      await logger?.info("create_checkout_customer_reused", {
        user_id: user.id,
        customer_id: customerId,
      });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await logger?.info("create_checkout_customer_created", {
        user_id: user.id,
        customer_id: customerId,
      });
    }

    const pricing = {
      creator: {
        price: 999,
        name: "Creator Plan",
        description: "Perfect for growing artists and producers",
      },
      pro: {
        price: 2499,
        name: "Pro Plan",
        description: "For professional musicians and labels",
      },
    } satisfies Record<string, { price: number; name: string; description: string }>;

    const selectedPlan = pricing[tier as keyof typeof pricing];

    await logger?.info("create_checkout_plan_selected", {
      user_id: user.id,
      tier,
      amount_minor: selectedPlan.price,
    });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: selectedPlan.name,
              description: selectedPlan.description,
            },
            unit_amount: selectedPlan.price,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/subscription-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/subscription`,
      metadata: {
        user_id: user.id,
        tier,
      },
    });

    await logger?.info("create_checkout_session_created", {
      user_id: user.id,
      tier,
      checkout_session_id: session.id,
    });

    return new Response(JSON.stringify({ url: session.url, correlationId: requestCorrelationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error("create_checkout_failed", error, {
      user_id: userId,
      tier: requestedTier ?? null,
    });

    return new Response(JSON.stringify({ error: errorMessage, correlationId: requestCorrelationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

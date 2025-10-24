import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_PER_GBP = 100;
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

  const creditsRequested = typeof rawPayload?.credits_requested === "number"
    ? (rawPayload.credits_requested as number)
    : undefined;
  const requestCorrelationId =
    (typeof rawPayload?.correlationId === "string" ? (rawPayload.correlationId as string) : undefined) ??
    req.headers.get("x-correlation-id") ??
    generateCorrelationId();

  const logger =
    supabaseService && supabaseUrl
      ? createSystemLogger(supabaseService, {
          component: "create_credits_checkout",
          feature: "wallet",
          correlationId: requestCorrelationId,
          message: "Create wallet credits checkout",
        })
      : null;

  let userId: string | null = null;

  try {
    await logger?.info("create_credits_checkout_request_received", {
      credits_requested: creditsRequested,
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");
    userId = user.id;

    await logger?.info("create_credits_checkout_user_authenticated", {
      user_id: user.id,
    });

    if (!creditsRequested || creditsRequested < 100) {
      throw new Error("Invalid credits amount. Minimum 100 credits required.");
    }

    const priceInPence = Math.round((creditsRequested / CREDITS_PER_GBP) * 100);

    await logger?.info("create_credits_checkout_amount_calculated", {
      user_id: user.id,
      credits_requested: creditsRequested,
      amount_minor: priceInPence,
    });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      await logger?.info("create_credits_checkout_customer_reused", {
        user_id: user.id,
        customer_id: customerId,
      });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
      await logger?.info("create_credits_checkout_customer_created", {
        user_id: user.id,
        customer_id: customerId,
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${creditsRequested.toLocaleString()} PLGD Credits`,
              description: `Top up your Pluggd wallet with ${creditsRequested.toLocaleString()} credits`,
            },
            unit_amount: priceInPence,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard/wallet?success=true`,
      cancel_url: `${req.headers.get("origin")}/dashboard/wallet?cancelled=true`,
      metadata: {
        user_id: user.id,
        credits_amount: creditsRequested.toString(),
        transaction_type: "credits_topup",
      },
    });

    await logger?.info("create_credits_checkout_session_created", {
      user_id: user.id,
      credits_requested: creditsRequested,
      checkout_session_id: session.id,
      amount_minor: priceInPence,
    });

    return new Response(JSON.stringify({ url: session.url, correlationId: requestCorrelationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await logger?.error("create_credits_checkout_failed", error, {
      user_id: userId,
      credits_requested: creditsRequested,
    });

    return new Response(JSON.stringify({ error: errorMessage, correlationId: requestCorrelationId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

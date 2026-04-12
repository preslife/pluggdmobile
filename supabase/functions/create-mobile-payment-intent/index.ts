import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase credentials are not configured");
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }
    const token = authHeader.replace("Bearer ", "");

    const { data: userResult, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userResult?.user) {
      throw new Error("Unable to authenticate user");
    }
    const user = userResult.user;

    const payload = await req.json();
    const amount = Number(payload?.amount ?? 0);
    const currency = (payload?.currency || "usd").toLowerCase();
    const metadata = typeof payload?.metadata === "object" ? payload.metadata : {};

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("A positive amount (in major units) is required");
    }

    // Look up or create a Stripe customer tied to the Supabase user id
    let customerId: string | undefined = payload?.customerId;
    if (!customerId) {
      const search = await stripe.customers.search({
        query: `metadata['supabase_user_id']:'${user.id}'`,
        limit: 1,
      });
      if (search.data.length > 0) {
        customerId = search.data[0].id;
      } else {
        const customer = await stripe.customers.create({
          email: user.email ?? undefined,
          metadata: { supabase_user_id: user.id },
        });
        customerId = customer.id;
      }
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: "2023-10-16" }
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.max(50, Math.round(amount * 100)), // minimum 50 cents
      currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { supabase_user_id: user.id, ...metadata },
    });

    return new Response(
      JSON.stringify({
        paymentIntentClientSecret: paymentIntent.client_secret,
        ephemeralKeySecret: ephemeralKey.secret,
        customerId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[create-mobile-payment-intent]", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

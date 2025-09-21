import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_PER_GBP = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CREATE-CREDITS-CHECKOUT] Function started");

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated");

    console.log(`[CREATE-CREDITS-CHECKOUT] User authenticated: ${user.id}`);

    // Parse request body
    const { credits_requested } = await req.json();
    if (!credits_requested || credits_requested < 100) {
      throw new Error("Invalid credits amount. Minimum 100 credits required.");
    }

    console.log(`[CREATE-CREDITS-CHECKOUT] Credits requested: ${credits_requested}`);

    // Calculate price in pence
    const priceInPence = Math.round((credits_requested / CREDITS_PER_GBP) * 100);
    console.log(`[CREATE-CREDITS-CHECKOUT] Price in pence: ${priceInPence}`);

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check for existing customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      console.log(`[CREATE-CREDITS-CHECKOUT] Existing customer: ${customerId}`);
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${credits_requested.toLocaleString()} PLGD Credits`,
              description: `Top up your Pluggd wallet with ${credits_requested.toLocaleString()} credits`,
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
        credits_amount: credits_requested.toString(),
        transaction_type: "credits_topup",
      },
    });

    console.log(`[CREATE-CREDITS-CHECKOUT] Session created: ${session.id}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CREATE-CREDITS-CHECKOUT] Error: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
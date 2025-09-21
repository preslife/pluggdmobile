import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  console.log(`[COMMISSION-FUNDING] ${step}`, details ?? "");
};

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { commissionId } = await req.json();
    if (!commissionId) throw new Error("commissionId is required");

    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData } = await supabaseAnon.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("Not authenticated");

    log("Authenticated", { userId: user.id });

    // Fetch commission request
    const { data: commission, error: commissionError } = await supabaseAnon
      .from("commission_requests")
      .select("id, requester_id, producer_id, title, budget_cents, application_fee_percent, status")
      .eq("id", commissionId)
      .single();

    if (commissionError || !commission) throw new Error(commissionError?.message || "Commission not found");
    if (commission.requester_id !== user.id) throw new Error("You can only fund your own commission");
    if (commission.status !== "accepted") throw new Error("Commission must be accepted before funding");

    // Fetch producer's Stripe Connect account
    const { data: acct, error: acctError } = await supabaseAnon
      .from("producer_stripe_accounts")
      .select("stripe_account_id, onboarding_complete")
      .eq("user_id", commission.producer_id)
      .eq("onboarding_complete", true)
      .single();

    if (acctError || !acct?.stripe_account_id) {
      throw new Error("Producer has not completed Stripe Connect onboarding");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Missing STRIPE_SECRET_KEY");
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Determine platform fee percent
    const feePercent = typeof commission.application_fee_percent === "number"
      ? commission.application_fee_percent
      : 10; // default 10%

    const amountCents = commission.budget_cents;
    const applicationFeeAmount = Math.round((amountCents * feePercent) / 100);

    // Optionally look up customer by email
    let customerId: string | undefined;
    if (user.email) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) customerId = customers.data[0].id;
    }

    // Create Stripe Checkout Session with destination charge
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email || undefined,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: commission.title || "Custom Beat Commission" },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: { destination: acct.stripe_account_id },
      },
      success_url: `${req.headers.get("origin")}/dashboard?commission=success&commission_id=${commission.id}`,
      cancel_url: `${req.headers.get("origin")}/dashboard?commission=cancelled&commission_id=${commission.id}`,
      metadata: {
        type: "commission_funding",
        commissionId: commission.id,
        requesterId: user.id,
        producerId: commission.producer_id,
        feePercent: String(feePercent),
      },
    });

    log("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

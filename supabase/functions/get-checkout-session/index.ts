import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId : null;

    if (!sessionId) {
      throw new Error("sessionId is required");
    }

    const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!secretKey) {
      throw new Error("Stripe secret key is not configured");
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2023-10-16" });
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });

    const paymentIntent =
      session.payment_intent && typeof session.payment_intent !== "string"
        ? session.payment_intent
        : null;

    return new Response(
      JSON.stringify({
        id: session.id,
        status: session.status,
        payment_status: session.payment_status,
        currency: session.currency,
        amount_subtotal: session.amount_subtotal,
        amount_total: session.amount_total,
        expires_at: session.expires_at,
        customer_details: session.customer_details ?? null,
        payment_intent_id:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : paymentIntent?.id ?? null,
        payment_intent_status: paymentIntent?.status ?? null,
        latest_charge:
          paymentIntent && typeof paymentIntent.latest_charge === "string"
            ? paymentIntent.latest_charge
            : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Checkout session lookup error", error);
    const message = error instanceof Error ? error.message : "Failed to retrieve checkout session";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

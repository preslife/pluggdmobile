import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Creator settlements are exclusively handled by the verified Stripe
  // Connect payout pipeline. This legacy endpoint must never move funds.
  return new Response(JSON.stringify({
    error: "Legacy PayPal payouts are disabled. Use Stripe Connect.",
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 410,
  });
});

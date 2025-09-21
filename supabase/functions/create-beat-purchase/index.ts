import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-BEAT-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { beatId, licenseFee } = await req.json();
    if (!beatId || !licenseFee) {
      throw new Error("beatId and licenseFee are required");
    }

    logStep("Request validated", { beatId, licenseFee });

    // Initialize Supabase clients
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get beat details and producer info
    const { data: beatData, error: beatError } = await supabaseService
      .from("beats")
      .select(`
        *,
        profiles!beats_user_id_fkey(*)
      `)
      .eq("id", beatId)
      .single();

    if (beatError || !beatData) {
      throw new Error("Beat not found");
    }

    logStep("Beat found", { beatTitle: beatData.title, producerId: beatData.user_id });

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check for existing Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    logStep("Stripe customer checked", { customerId });

    // Calculate platform fee (20% for beat licensing)
    const licenseFeeGBP = Math.round(licenseFee / 100 * 100) / 100; // Convert pence to pounds
    const platformFeePercent = 20;
    const platformFeeGBP = Math.round(licenseFeeGBP * platformFeePercent) / 100;
    const producerEarningsGBP = licenseFeeGBP - platformFeeGBP;

    logStep("Fees calculated", { 
      licenseFeeGBP, 
      platformFeeGBP, 
      producerEarningsGBP 
    });

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `Beat License - ${beatData.title}`,
              description: `Licensing for beat "${beatData.title}" by ${beatData.producer_name || 'Producer'}`,
              metadata: {
                type: 'beat_license',
                beat_id: beatId,
                producer_id: beatData.user_id
              }
            },
            unit_amount: licenseFee, // Amount in pence
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/beat-purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/beats/${beatId}`,
      metadata: {
        type: 'beat_license',
        beat_id: beatId,
        producer_id: beatData.user_id,
        artist_id: user.id,
        license_fee_pence: licenseFee.toString(),
        platform_fee_pence: Math.round(platformFeeGBP * 100).toString(),
        producer_earnings_pence: Math.round(producerEarningsGBP * 100).toString()
      }
    });

    logStep("Stripe session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ 
      url: session.url,
      sessionId: session.id 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-beat-purchase", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
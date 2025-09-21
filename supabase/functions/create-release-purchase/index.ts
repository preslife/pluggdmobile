import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-RELEASE-PURCHASE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { releaseId, amount, payWhatYouWant } = await req.json();
    if (!releaseId) throw new Error("Release ID is required");
    
    logStep("Request data", { releaseId, amount, payWhatYouWant });

    // Get release info
    const { data: release, error: releaseError } = await supabaseClient
      .from('releases')
      .select('*')
      .eq('id', releaseId)
      .single();

    if (releaseError || !release) {
      throw new Error("Release not found");
    }

    logStep("Release found", { release: release.title, artist: release.artist });

    // Check if user already purchased this release
    const { data: existingPurchase } = await supabaseClient
      .from('release_purchases')
      .select('id')
      .eq('user_id', user.id)
      .eq('release_id', releaseId)
      .single();

    if (existingPurchase) {
      throw new Error("You have already purchased this release");
    }

    // Determine price
    let finalAmount = release.price || 0;
    if (payWhatYouWant && amount) {
      const minPrice = release.minimum_price || 0;
      if (amount < minPrice) {
        throw new Error(`Minimum price is ${minPrice / 100} ${release.currency || 'GBP'}`);
      }
      finalAmount = amount;
    } else if (release.pay_what_you_want && amount) {
      // Also handle PWYW validation when amount is provided
      const minPrice = release.minimum_price || 0;
      if (amount < minPrice) {
        throw new Error(`Minimum price is ${minPrice / 100} ${release.currency || 'GBP'}`);
      }
      finalAmount = amount;
    }

    if (finalAmount <= 0) {
      throw new Error("Invalid purchase amount");
    }

    logStep("Final amount calculated", { finalAmount });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId = customers.data.length > 0 ? customers.data[0].id : undefined;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "gbp",
            product_data: {
              name: `${release.title} - ${release.artist}`,
              description: `Digital release by ${release.artist}`,
              images: release.cover_art_url ? [release.cover_art_url] : undefined,
            },
            unit_amount: Math.round(finalAmount * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/release/${releaseId}?purchased=true`,
      cancel_url: `${req.headers.get("origin")}/release/${releaseId}`,
      metadata: {
        userId: user.id,
        releaseId: releaseId,
        type: 'release_purchase'
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Create pending purchase record
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: purchaseError } = await supabaseService
      .from('release_purchases')
      .insert({
        user_id: user.id,
        release_id: releaseId,
        amount_paid: finalAmount,
        stripe_payment_intent_id: session.payment_intent,
      });

    if (purchaseError) {
      logStep("Purchase record creation failed", { error: purchaseError });
    } else {
      logStep("Purchase record created");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-release-purchase", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
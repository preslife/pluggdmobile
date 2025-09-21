import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-ARTIST-TIP] ${step}${detailsStr}`);
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

    const { artistId, amount, message, releaseId } = await req.json();
    if (!artistId || !amount) throw new Error("Artist ID and amount are required");
    
    if (amount < 1) throw new Error("Minimum tip amount is £1");
    
    logStep("Request data", { artistId, amount, message, releaseId });

    // Get artist info
    const { data: artist, error: artistError } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', artistId)
      .single();

    if (artistError || !artist) {
      throw new Error("Artist not found");
    }

    logStep("Artist found", { artist: artist.username || artist.full_name });

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
              name: `Tip for ${artist.username || artist.full_name}`,
              description: message || `Support ${artist.username || artist.full_name} with a tip`,
            },
            unit_amount: Math.round(amount * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/artist/${artistId}?tip_sent=true`,
      cancel_url: `${req.headers.get("origin")}/artist/${artistId}`,
      metadata: {
        fanId: user.id,
        artistId: artistId,
        releaseId: releaseId || '',
        type: 'artist_tip'
      }
    });

    logStep("Stripe session created", { sessionId: session.id });

    // Create pending tip record
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { error: tipError } = await supabaseService
      .from('artist_tips')
      .insert({
        fan_id: user.id,
        artist_id: artistId,
        release_id: releaseId || null,
        amount: amount,
        message: message || null,
        stripe_payment_intent_id: session.payment_intent,
      });

    if (tipError) {
      logStep("Tip record creation failed", { error: tipError });
    } else {
      logStep("Tip record created");
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-artist-tip", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
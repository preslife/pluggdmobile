import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { beatId, beatTitle, price, artistName } = await req.json();
    
    if (!beatId || !beatTitle || price === undefined) {
      throw new Error("Missing required parameters: beatId, beatTitle, or price");
    }

    // Create Supabase client using the anon key for user authentication
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Retrieve authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Create line items based on price
    const lineItems = [];
    if (price > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { 
            name: `${beatTitle} by ${artistName}`,
            description: "High-quality beat with basic licensing rights"
          },
          unit_amount: Math.round(price * 100), // Convert to cents
        },
        quantity: 1,
      });
    } else {
      // For free beats, we'll create a $0 session (Stripe requires at least one line item)
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { 
            name: `${beatTitle} by ${artistName} (Free Download)`,
            description: "Free beat download"
          },
          unit_amount: 0,
        },
        quantity: 1,
      });
    }

    // Create a one-time payment session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: lineItems,
      mode: "payment",
      success_url: `${req.headers.get("origin")}/marketplace?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/marketplace?payment=cancelled`,
      metadata: {
        beatId: beatId,
        userId: user.id,
        beatTitle: beatTitle,
        artistName: artistName
      }
    });

    // Get user's subscription tier for commission calculation
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get beat details to check if it's admin uploaded
    const { data: beatData } = await supabaseService
      .from('beats')
      .select('user_id, uploaded_by_admin, producer_name')
      .eq('id', beatId)
      .single();

    let commissionRate = 0;
    let producerAmount = 0;
    let commission = 0;

    if (beatData?.uploaded_by_admin) {
      // Admin uploaded beats: 100% platform revenue (0% to producer)
      commissionRate = 1.0; // 100% commission
      commission = Math.round(price * 100); // Full amount as commission
      producerAmount = 0; // No payout to producer
    } else {
      // User uploaded beats: tier-based commission structure
      const { data: producerSubscription } = await supabaseService
        .from('user_subscriptions')
        .select('tier')
        .eq('user_id', beatData?.user_id)
        .single();

      commissionRate = 0.15; // 15% default for free tier
      if (producerSubscription?.tier === 'creator') {
        commissionRate = 0.10; // 10% for creator tier
      } else if (producerSubscription?.tier === 'pro') {
        commissionRate = 0.05; // 5% for pro tier
      }

      commission = Math.round(price * commissionRate * 100); // Commission in cents
      producerAmount = Math.round(price * 100) - commission; // Producer gets the rest
    }

    // Record the purchase attempt in Supabase
    await supabaseService.from("purchases").insert({
      buyer_id: user.id,
      beat_id: beatId,
      amount: price,
      commission_rate: commissionRate,
      commission_amount: commission / 100,
      producer_amount: producerAmount / 100,
      created_at: new Date().toISOString()
    });

    console.log(`Payment session created for beat ${beatId}, amount: $${price}, commission: ${(commissionRate * 100).toFixed(1)}%, admin_upload: ${beatData?.uploaded_by_admin || false}`);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error in create-payment function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
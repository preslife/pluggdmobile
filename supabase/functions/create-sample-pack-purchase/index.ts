import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAuth = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { samplePackId, pricePence } = await req.json();
    if (!samplePackId) throw new Error("Missing samplePackId");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Get sample pack and creator info
    const { data: packData, error: packError } = await supabaseService
      .from('sample_packs')
      .select(`
        *,
        profiles:user_id (
          stripe_account_id,
          stripe_onboarding_complete
        )
      `)
      .eq('id', samplePackId)
      .single();

    if (packError) throw packError;
    if (!packData) throw new Error('Sample pack not found');

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Ensure a Stripe customer for the buyer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://qkwvqmubhyondemhasjp.supabase.co";
    const finalPrice = pricePence || packData.price_pence || (packData.price * 100);

    let session;

    if (finalPrice === 0) {
      // Free download - just create purchase record
      const { error: purchaseError } = await supabaseService
        .from('sample_pack_purchases')
        .insert({
          user_id: user.id,
          sample_pack_id: samplePackId,
          amount_paid: 0,
          download_url: packData.download_url,
          download_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });

      if (purchaseError) throw purchaseError;

      return new Response(JSON.stringify({ 
        success: true, 
        free: true,
        downloadUrl: packData.download_url 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Paid sample pack
    if (packData.profiles?.stripe_account_id && packData.profiles?.stripe_onboarding_complete) {
      // Creator has Stripe Connect - use 80/20 split
      const applicationFeePercent = 20;

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              unit_amount: finalPrice,
              product_data: {
                name: packData.title,
                description: `Sample pack by ${packData.profiles?.stripe_account_id || 'Creator'}`,
                images: packData.cover_art_url ? [packData.cover_art_url] : undefined,
              },
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          transfer_data: { destination: packData.profiles.stripe_account_id },
          application_fee_amount: Math.round(finalPrice * applicationFeePercent / 100),
          metadata: {
            samplePackId,
            creatorId: packData.user_id,
            buyerId: user.id,
          },
        },
        success_url: `${origin}/sample-pack-store?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/sample-pack-store?purchase=canceled`,
        metadata: {
          type: 'sample_pack_purchase',
          samplePackId,
          creatorId: packData.user_id,
          buyerId: user.id,
        },
      });
    } else {
      // Creator doesn't have Stripe Connect - platform keeps all revenue
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'gbp',
              unit_amount: finalPrice,
              product_data: {
                name: packData.title,
                description: `Sample pack by Creator`,
                images: packData.cover_art_url ? [packData.cover_art_url] : undefined,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/sample-pack-store?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/sample-pack-store?purchase=canceled`,
        metadata: {
          type: 'sample_pack_purchase',
          samplePackId,
          creatorId: packData.user_id,
          buyerId: user.id,
        },
      });
    }

    // Create pending purchase record
    await supabaseService.from('sample_pack_purchases').insert({
      user_id: user.id,
      sample_pack_id: samplePackId,
      amount_paid: finalPrice / 100, // Convert pence to pounds
      stripe_payment_intent_id: session.id,
      download_url: packData.download_url,
      download_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[create-sample-pack-purchase] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

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
    const {
      creatorId,
      membershipTierId,
      pricePence = 500,
    } = await req.json(); // Default £5.00
    if (!creatorId) throw new Error("Missing creatorId");
    if (!membershipTierId) throw new Error("Missing membershipTierId");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    // Fetch creator's Stripe Connect account
    const { data: acctRow, error: acctErr } = await supabaseService
      .from('producer_stripe_accounts')
      .select('stripe_account_id, onboarding_complete')
      .eq('user_id', creatorId)
      .maybeSingle();
    if (acctErr) throw acctErr;
    if (!acctRow?.stripe_account_id || !acctRow.onboarding_complete) {
      throw new Error('This creator is not ready to receive subscriptions yet.');
    }

    // Platform takes 20% fee (80/20 split)
    const applicationFeePercent = 20;

    const { data: tierRow, error: tierError } = await supabaseService
      .from('membership_tiers')
      .select(
        `id, owner_id, owner_type, status, price_monthly, price_yearly, price_lifetime, currency,
         stripe_product_id, stripe_price_monthly_id, stripe_price_yearly_id, stripe_price_lifetime_id,
         stripe_sync_status, stripe_sync_error`
      )
      .eq('id', membershipTierId)
      .maybeSingle();

    if (tierError) throw tierError;
    if (!tierRow) throw new Error('Membership tier not found');
    if (tierRow.owner_type !== 'profile' || tierRow.owner_id !== creatorId) {
      throw new Error('This tier does not belong to the requested creator.');
    }
    if (tierRow.status !== 'active') {
      throw new Error('This membership tier is not published yet.');
    }

    if (tierRow.stripe_sync_status && tierRow.stripe_sync_status !== 'synced') {
      throw new Error(
        tierRow.stripe_sync_status === 'error'
          ? tierRow.stripe_sync_error || 'Membership tier sync failed. Please retry syncing this tier in the Studio before selling subscriptions.'
          : 'Membership tier is syncing with Stripe. Please wait a moment and try again.'
      );
    }

    const tierPriceCents =
      typeof tierRow.price_monthly === 'number'
        ? tierRow.price_monthly
        : typeof tierRow.price_yearly === 'number'
          ? tierRow.price_yearly
          : typeof tierRow.price_lifetime === 'number'
            ? tierRow.price_lifetime
            : pricePence;

    if (!tierPriceCents || Number.isNaN(tierPriceCents)) {
      throw new Error('Membership tier price is not configured.');
    }

    const tierCurrency = tierRow.currency ?? 'usd';

    const stripePriceId =
      tierRow.stripe_price_monthly_id ||
      tierRow.stripe_price_yearly_id ||
      tierRow.stripe_price_lifetime_id;

    if (!stripePriceId || typeof stripePriceId !== 'string') {
      throw new Error(
        'Membership tier is missing a Stripe price. Please run the Stripe sync from the Studio memberships page.'
      );
    }

    if (!tierRow.stripe_product_id) {
      throw new Error('Membership tier is not connected to a Stripe product yet. Sync the tier before selling it.');
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Ensure a Stripe customer for the fan
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://qkwvqmubhyondemhasjp.supabase.co";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      mode: 'subscription',
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        transfer_data: { destination: acctRow.stripe_account_id },
        application_fee_percent: applicationFeePercent,
        metadata: {
          creatorId,
          fanId: user.id,
          membershipTierId,
          membership_tier_id: membershipTierId,
          stripe_price_id: stripePriceId,
          ...(tierRow.stripe_product_id ? { stripe_product_id: tierRow.stripe_product_id } : {}),
        },
      },
      success_url: `${origin}/profile/${creatorId}?fan_sub=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/profile/${creatorId}?fan_sub=canceled`,
      metadata: {
        type: 'fan_subscription',
        creatorId,
        fanId: user.id,
        membershipTierId,
        membership_tier_id: membershipTierId,
        stripe_price_id: stripePriceId,
        ...(tierRow.stripe_product_id ? { stripe_product_id: tierRow.stripe_product_id } : {}),
      },
    });

    // Create a pending record so we can flip to active on return
    await supabaseAuth.from('fan_subscriptions').insert({
      fan_id: user.id,
      creator_id: creatorId,
      status: 'pending',
      price_cents: tierPriceCents,
      currency: tierCurrency,
    } as any);

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[create-fan-subscription] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

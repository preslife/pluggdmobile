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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Check if user already has a Stripe Connect account
    const { data: existingAccount } = await supabaseService
      .from('producer_stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingAccount) {
      // Return dashboard or onboarding link based on status
      if (existingAccount.onboarding_complete) {
        const loginLink = await stripe.accounts.createLoginLink(existingAccount.stripe_account_id);
        return new Response(JSON.stringify({ 
          url: loginLink.url,
          type: 'dashboard' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } else {
        const accountLink = await stripe.accountLinks.create({
          account: existingAccount.stripe_account_id,
          refresh_url: `${req.headers.get("origin")}/dashboard?stripe=refresh`,
          return_url: `${req.headers.get("origin")}/dashboard?stripe=success`,
          type: 'account_onboarding',
        });
        return new Response(JSON.stringify({ 
          url: accountLink.url,
          type: 'onboarding' 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // Create new Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'GB',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      default_currency: 'gbp',
    });

    // Store account info in database with new fields
    await supabaseService
      .from('producer_stripe_accounts')
      .insert({
        user_id: user.id,
        stripe_account_id: account.id,
        onboarding_complete: false,
        charges_enabled: false,
        payouts_enabled: false,
        details_submitted: false,
        capabilities: account.capabilities || {},
        country: account.country || 'GB',
        default_currency: account.default_currency || 'gbp',
      });

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get("origin")}/dashboard?stripe=refresh`,
      return_url: `${req.headers.get("origin")}/dashboard?stripe=success`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ 
      url: accountLink.url,
      type: 'onboarding' 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[create-connect-account] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
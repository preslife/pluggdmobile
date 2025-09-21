import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CREDITS_PER_GBP = 100;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CASH-OUT-CREDITS] Function started");

    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    console.log(`[CASH-OUT-CREDITS] User: ${user.id}`);

    // Parse request body
    const { amount_credits } = await req.json();
    
    if (!amount_credits || amount_credits < 1000) {
      throw new Error("Minimum cash-out is 1,000 credits (£10)");
    }

    // Check user balance
    const { data: balanceData, error: balanceError } = await supabaseClient.rpc('get_wallet_balance', {
      p_user_id: user.id
    });

    if (balanceError) throw new Error(`Balance check failed: ${balanceError.message}`);
    
    const balance = balanceData as any;
    if (balance.available_credits < amount_credits) {
      throw new Error("Insufficient available credits");
    }

    // Check Stripe Connect account
    const { data: stripeAccount, error: stripeError } = await supabaseClient
      .from('producer_stripe_accounts')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (stripeError || !stripeAccount) {
      throw new Error("Stripe Connect account not found. Please set up your payout account first.");
    }

    if (!stripeAccount.onboarding_complete || !stripeAccount.payouts_enabled) {
      throw new Error("Stripe Connect account not fully set up for payouts");
    }

    // Get user tier for commission calculation
    const { data: tierData, error: tierError } = await supabaseClient.rpc('get_user_tier_limits', {
      user_id: user.id
    });

    if (tierError) throw new Error(`Tier check failed: ${tierError.message}`);
    
    const commissionRate = (tierData as any)?.commission_rate || 15.00;
    
    // Calculate amounts
    const grossAmountPence = Math.round((amount_credits / CREDITS_PER_GBP) * 100);
    const commissionAmountPence = Math.round(grossAmountPence * (commissionRate / 100));
    const netAmountPence = grossAmountPence - commissionAmountPence;

    console.log(`[CASH-OUT-CREDITS] Gross: ${grossAmountPence}p, Commission: ${commissionAmountPence}p, Net: ${netAmountPence}p`);

    // Create ledger entry for cash-out
    const { error: ledgerError } = await supabaseClient
      .from('wallet_ledger')
      .insert({
        user_id: user.id,
        kind: 'convert_cashout',
        amount_credits: -amount_credits,
        ref_type: 'cashout',
        meta: {
          gross_amount_pence: grossAmountPence,
          commission_amount_pence: commissionAmountPence,
          net_amount_pence: netAmountPence,
          commission_rate: commissionRate
        },
      });

    if (ledgerError) throw new Error(`Ledger insert failed: ${ledgerError.message}`);

    // Create payout record
    const { error: payoutError } = await supabaseClient
      .from('producer_payouts')
      .insert({
        producer_id: user.id,
        amount_pence: netAmountPence,
        commission_pence: commissionAmountPence,
        status: 'pending',
        payout_type: 'wallet_cashout',
        from_credits: true,
        created_at: new Date().toISOString()
      });

    if (payoutError) throw new Error(`Payout record creation failed: ${payoutError.message}`);

    console.log(`[CASH-OUT-CREDITS] Cash-out request created successfully`);

    return new Response(JSON.stringify({ 
      success: true,
      net_amount_gbp: (netAmountPence / 100).toFixed(2)
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[CASH-OUT-CREDITS] Error: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
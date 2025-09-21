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
    console.log("[APPLY-CREDITS-TO-SUBSCRIPTION] Function started");

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
    if (!user?.email) throw new Error("User not authenticated");

    console.log(`[APPLY-CREDITS-TO-SUBSCRIPTION] User: ${user.id}`);

    // Parse request body
    const { amount_credits } = await req.json();
    
    if (!amount_credits || amount_credits < 100) {
      throw new Error("Minimum application is 100 credits (£1)");
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

    // Initialize Stripe
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      throw new Error("No Stripe customer found. Please subscribe first.");
    }

    const customerId = customers.data[0].id;
    console.log(`[APPLY-CREDITS-TO-SUBSCRIPTION] Customer: ${customerId}`);

    // Calculate credit amount in pence
    const creditAmountPence = Math.round((amount_credits / CREDITS_PER_GBP) * 100);

    // Create customer balance transaction (credit to account)
    const balanceTransaction = await stripe.customers.createBalanceTransaction(customerId, {
      amount: -creditAmountPence, // Negative amount = credit to customer
      currency: 'gbp',
      description: `Applied ${amount_credits.toLocaleString()} PLGD Credits to account`,
      metadata: {
        user_id: user.id,
        credits_applied: amount_credits.toString(),
        source: 'wallet_credits'
      }
    });

    console.log(`[APPLY-CREDITS-TO-SUBSCRIPTION] Balance transaction: ${balanceTransaction.id}`);

    // Create ledger entry
    const { error: ledgerError } = await supabaseClient
      .from('wallet_ledger')
      .insert({
        user_id: user.id,
        kind: 'convert_sub_applied',
        amount_credits: -amount_credits,
        ref_type: 'subscription',
        ref_id: balanceTransaction.id,
        meta: {
          stripe_customer_id: customerId,
          credit_amount_pence: creditAmountPence,
          balance_transaction_id: balanceTransaction.id
        },
      });

    if (ledgerError) throw new Error(`Ledger insert failed: ${ledgerError.message}`);

    console.log(`[APPLY-CREDITS-TO-SUBSCRIPTION] Credits applied successfully`);

    return new Response(JSON.stringify({ 
      success: true,
      credit_amount_gbp: (creditAmountPence / 100).toFixed(2),
      balance_transaction_id: balanceTransaction.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[APPLY-CREDITS-TO-SUBSCRIPTION] Error: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
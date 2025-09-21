import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[PROCESS-CREDITS-TRANSACTION] Function started");

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

    console.log(`[PROCESS-CREDITS-TRANSACTION] User: ${user.id}`);

    // Parse request body
    const { 
      amount_credits, 
      kind, 
      ref_type, 
      ref_id, 
      counterparty_user_id,
      meta = {} 
    } = await req.json();

    if (!amount_credits || !kind) {
      throw new Error("Invalid transaction data");
    }

    console.log(`[PROCESS-CREDITS-TRANSACTION] Processing: ${kind} ${amount_credits} credits`);

    // For spending transactions, check balance first
    if (amount_credits < 0) {
      const { data: balanceData, error: balanceError } = await supabaseClient.rpc('get_wallet_balance', {
        p_user_id: user.id
      });

      if (balanceError) throw new Error(`Balance check failed: ${balanceError.message}`);
      
      const balance = balanceData as any;
      if (balance.available_credits < Math.abs(amount_credits)) {
        throw new Error("Insufficient credits");
      }
    }

    // Create ledger entry for the main user
    const { error: ledgerError } = await supabaseClient
      .from('wallet_ledger')
      .insert({
        user_id: user.id,
        kind,
        amount_credits,
        ref_type,
        ref_id,
        counterparty_user_id,
        meta,
      });

    if (ledgerError) throw new Error(`Ledger insert failed: ${ledgerError.message}`);

    // For tips and transfers, create counterparty entry
    if (counterparty_user_id && (kind === 'spend_tip' || kind === 'spend_purchase')) {
      const counterpartyKind = kind === 'spend_tip' ? 'spend_tip' : 'spend_purchase';
      
      const { error: counterpartyError } = await supabaseClient
        .from('wallet_ledger')
        .insert({
          user_id: counterparty_user_id,
          kind: counterpartyKind,
          amount_credits: Math.abs(amount_credits), // Always positive for receiver
          ref_type,
          ref_id,
          counterparty_user_id: user.id,
          meta,
        });

      if (counterpartyError) {
        console.error(`[PROCESS-CREDITS-TRANSACTION] Counterparty error: ${counterpartyError.message}`);
        // Don't fail the transaction for counterparty issues
      }
    }

    console.log(`[PROCESS-CREDITS-TRANSACTION] Transaction completed successfully`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PROCESS-CREDITS-TRANSACTION] Error: ${errorMessage}`);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
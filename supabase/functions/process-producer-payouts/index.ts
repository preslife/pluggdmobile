import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PRODUCER-PAYOUTS] ${step}${detailsStr}`);
};

// Enhanced retry logic with exponential backoff
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      logStep(`Attempt ${attempt} failed, retrying in ${delay}ms`, { error: error instanceof Error ? error.message : String(error) });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");
    
    // Get request parameters
    const body = await req.json().catch(() => ({}));
    const { batchId, maxPayouts = 50, payoutType = 'manual' } = body;

    // Initialize Supabase with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get pending statements that are ready for payout
    const { data: pendingStatements, error: statementsError } = await supabaseService
      .from("creator_statements")
      .select("*")
      .eq("status", "ready")
      .order("created_at", { ascending: true })
      .limit(maxPayouts * 10);

    if (statementsError) {
      throw new Error(`Failed to fetch statements: ${statementsError.message}`);
    }

    logStep("Pending statements fetched", { count: pendingStatements?.length || 0 });

    if (!pendingStatements || pendingStatements.length === 0) {
      return new Response(JSON.stringify({
        message: 'No pending payouts to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let processed = 0;
    const results = [];

    // Group statements by payee and currency
    const statementsByCreator = pendingStatements.reduce((acc, statement) => {
      const key = `${statement.user_id}:${statement.currency || 'gbp'}`;
      if (!acc[key]) {
        acc[key] = {
          user_id: statement.user_id,
          currency: statement.currency || 'gbp',
          statements: [] as any[]
        };
      }
      acc[key].statements.push(statement);
      return acc;
    }, {} as Record<string, { user_id: string; currency: string; statements: any[] }>);

    // Get producer Stripe accounts
    const producerIds = Object.values(statementsByCreator).map(entry => entry.user_id);
    const { data: stripeAccounts } = await supabaseService
      .from("producer_stripe_accounts")
      .select("*")
      .in("user_id", producerIds);

    // Process payouts for each producer
    for (const entry of Object.values(statementsByCreator)) {
      const producerId = entry.user_id;
      try {
        const stripeAccount = stripeAccounts?.find(acc => acc.user_id === producerId);

        if (!stripeAccount || !stripeAccount.onboarding_complete || !stripeAccount.payouts_enabled) {
          logStep("Skipping producer - no valid Stripe account", { producerId });
          continue;
        }

        const totalNetCents = entry.statements.reduce((sum, statement) => sum + (statement.net_amount_cents || 0), 0);
        if (totalNetCents < 1000) {
        logStep("Skipping producer - below minimum threshold", { producerId, totalNetCents });
          continue;
        }

        logStep("Processing payout", {
          producerId,
          totalNetCents,
          stripeAccountId: stripeAccount.stripe_account_id,
          statements: entry.statements.length
        });

        const { data: payoutRecord, error: createPayoutError } = await supabaseService
          .from("payouts")
          .insert({
            user_id: producerId,
            total_amount_cents: totalNetCents,
            currency: entry.currency,
            status: 'processing'
          })
          .select()
          .single();

        if (createPayoutError) {
          throw new Error(`Failed to create payout record: ${createPayoutError.message}`);
        }

        // Create Stripe transfer with retry logic
        const transfer = await retryWithBackoff(async () => {
          return await stripe.transfers.create({
            amount: totalNetCents,
            currency: entry.currency || "gbp",
            destination: stripeAccount.stripe_account_id,
            description: `Creator earnings payout - ${entry.statements.length} statements`,
            metadata: {
              producer_id: producerId,
              statements: entry.statements.length.toString(),
              period: new Date().toISOString().substring(0, 7), // YYYY-MM format
              batch_id: batchId || 'manual',
              payout_type: payoutType
            }
          });
        });

        logStep("Stripe transfer created", {
          transferId: transfer.id,
          amount: totalNetCents
        });

        const statementIds = entry.statements.map(statement => statement.id);

        const { error: updateStatementsError } = await supabaseService
          .from("creator_statements")
          .update({
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .in('id', statementIds);

        if (updateStatementsError) {
          throw updateStatementsError;
        }

        const { error: updatePayoutError } = await supabaseService
          .from("payouts")
          .update({
            status: 'paid',
            stripe_transfer_id: transfer.id,
            processed_at: new Date().toISOString()
          })
          .eq('id', payoutRecord.id);

        if (updatePayoutError) {
          throw updatePayoutError;
        }

        const amountMap = new Map<string, number>(
          entry.statements.map(statement => [statement.id, statement.net_amount_cents || 0])
        );

        const payoutStatementRows = statementIds.map(statementId => ({
          payout_id: payoutRecord.id,
          statement_id: statementId,
          amount_cents: amountMap.get(statementId) || 0
        }));

        if (payoutStatementRows.length > 0) {
          const { error: linkError } = await supabaseService
            .from("payout_statements")
            .insert(payoutStatementRows);

          if (linkError) {
            logStep("Failed to link payout statements", { error: linkError.message });
          }
        }

        processed += statementIds.length;
        results.push({
          producerId,
          transferId: transfer.id,
          amount: totalNetCents,
          statements: statementIds.length
        });

        logStep("Payout completed", {
          producerId,
          transferId: transfer.id,
          statements: statementIds.length
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("Error processing producer payout", {
          producerId,
          error: errorMessage
        });

        const statementIds = entry.statements.map(statement => statement.id);

        await supabaseService
          .from("creator_statements")
          .update({
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .in('id', statementIds);

        await supabaseService
          .from("payouts")
          .update({
            status: 'failed',
            failure_reason: errorMessage
          })
          .eq('user_id', producerId)
          .eq('status', 'processing');
      }
    }

    logStep("Payouts processing completed", { processed, totalResults: results.length });

    return new Response(JSON.stringify({
      message: `Processed ${processed} sales across ${results.length} producers`,
      processed,
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-producer-payouts", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
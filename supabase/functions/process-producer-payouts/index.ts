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

    // Get pending beat sales that need payout with enhanced filtering
    const { data: pendingSales, error: salesError } = await supabaseService
      .from("beat_sales")
      .select(`
        *,
        beats!beat_sales_beat_id_fkey(title, user_id)
      `)
      .eq("payout_status", "pending")
      .gte("producer_earnings", 10) // Minimum £10 for payout
      .limit(maxPayouts); // Rate limiting

    if (salesError) {
      throw new Error(`Failed to fetch sales: ${salesError.message}`);
    }

    logStep("Pending sales fetched", { count: pendingSales?.length || 0 });

    if (!pendingSales || pendingSales.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No pending payouts to process",
        processed: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    let processed = 0;
    const results = [];

    // Group sales by producer for batch payouts
    const salesByProducer = pendingSales.reduce((acc, sale) => {
      const producerId = sale.producer_id;
      if (!acc[producerId]) {
        acc[producerId] = {
          sales: []
        };
      }
      acc[producerId].sales.push(sale);
      return acc;
    }, {} as any);

    // Get producer Stripe accounts
    const producerIds = Object.keys(salesByProducer);
    const { data: stripeAccounts } = await supabaseService
      .from("producer_stripe_accounts")
      .select("*")
      .in("user_id", producerIds);

    // Process payouts for each producer
    for (const [producerId, data] of Object.entries(salesByProducer)) {
      try {
        const { sales } = data as any;
        const stripeAccount = stripeAccounts?.find(acc => acc.user_id === producerId);

        if (!stripeAccount || !stripeAccount.onboarding_complete || !stripeAccount.payouts_enabled) {
          logStep("Skipping producer - no valid Stripe account", { producerId });
          continue;
        }

        // Calculate total payout amount in pence
        const totalEarningsPence = Math.round(sales.reduce((sum: number, sale: any) => 
          sum + sale.producer_earnings, 0) * 100);

        logStep("Processing payout", { 
          producerId, 
          totalEarningsPence, 
          stripeAccountId: stripeAccount.stripe_account_id 
        });

        // Create Stripe transfer with retry logic
        const transfer = await retryWithBackoff(async () => {
          return await stripe.transfers.create({
            amount: totalEarningsPence,
            currency: "gbp",
            destination: stripeAccount.stripe_account_id,
            description: `Beat licensing earnings payout - ${sales.length} transactions`,
            metadata: {
              producer_id: producerId,
              sales_count: sales.length.toString(),
              period: new Date().toISOString().substring(0, 7), // YYYY-MM format
              batch_id: batchId || 'manual',
              payout_type: payoutType
            }
          });
        });

        logStep("Stripe transfer created", { 
          transferId: transfer.id, 
          amount: totalEarningsPence 
        });

        // Update beat sales records
        const saleIds = sales.map((s: any) => s.id);
        const { error: updateError } = await supabaseService
          .from("beat_sales")
          .update({
            payout_status: "paid",
            payout_id: transfer.id,
            updated_at: new Date().toISOString()
          })
          .in("id", saleIds);

        if (updateError) {
          logStep("Error updating sales", { error: updateError.message });
          throw updateError;
        }

        processed += sales.length;
        results.push({
          producerId,
          transferId: transfer.id,
          amount: totalEarningsPence,
          salesCount: sales.length
        });

        logStep("Payout completed", { 
          producerId, 
          transferId: transfer.id, 
          salesCount: sales.length 
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep("Error processing producer payout", { 
          producerId, 
          error: errorMessage 
        });
        
        // Enhanced error handling - mark sales as failed and create error record
        const saleIds = (data as any).sales.map((s: any) => s.id);
        await supabaseService
          .from("beat_sales")
          .update({
            payout_status: "failed",
            error_message: errorMessage,
            updated_at: new Date().toISOString()
          })
          .in("id", saleIds);

        // Create failed payout records for tracking
        for (const sale of (data as any).sales) {
          await supabaseService
            .from('payout_records')
            .insert({
              user_id: producerId,
              beat_id: sale.beat_id,
              amount: sale.producer_earnings,
              payout_method: 'stripe',
              payout_status: 'failed'
            });
        }

        // Add to dead letter queue for manual review
        await supabaseService
          .from('failed_payouts')
          .insert({
            producer_id: producerId,
            batch_id: batchId,
            sales_count: (data as any).sales.length,
            total_amount: (data as any).sales.reduce((sum: number, sale: any) => sum + sale.producer_earnings, 0),
            error_message: errorMessage,
            created_at: new Date().toISOString()
          })
          .then(() => logStep("Added to failed payouts queue", { producerId }))
          .catch(() => logStep("Failed to add to failed payouts queue", { producerId }));
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
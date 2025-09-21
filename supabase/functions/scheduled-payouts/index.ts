import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCHEDULED-PAYOUTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Scheduled payout processing started");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Check if today is a payout day (Fridays for weekly, 1st for monthly)
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 5 = Friday
    const dayOfMonth = today.getDate();
    
    const isWeeklyPayoutDay = dayOfWeek === 5; // Friday
    const isMonthlyPayoutDay = dayOfMonth === 1; // 1st of month
    
    if (!isWeeklyPayoutDay && !isMonthlyPayoutDay) {
      logStep("Not a scheduled payout day", { dayOfWeek, dayOfMonth });
      return new Response(JSON.stringify({ 
        message: "Not a scheduled payout day",
        dayOfWeek,
        dayOfMonth
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const payoutType = isMonthlyPayoutDay ? 'monthly' : 'weekly';
    logStep(`Processing ${payoutType} payouts`);

    // Create payout batch
    const { data: batch } = await supabaseService
      .rpc('create_payout_batch');

    if (!batch) {
      logStep("No eligible payouts found");
      return new Response(JSON.stringify({ 
        message: "No eligible payouts found" 
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep("Payout batch created", { batchId: batch });

    // Process payouts with rate limiting (max 100 per batch)
    const result = await supabaseService.functions.invoke('process-producer-payouts', {
      body: { 
        batchId: batch,
        maxPayouts: 100,
        payoutType 
      }
    });

    if (result.error) {
      throw new Error(`Payout processing failed: ${result.error.message}`);
    }

    logStep("Scheduled payouts completed", { 
      batchId: batch,
      result: result.data 
    });

    return new Response(JSON.stringify({
      success: true,
      batchId: batch,
      payoutType,
      result: result.data
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in scheduled payouts", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
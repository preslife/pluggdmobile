import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[AUTOMATED-EARNINGS] ${step}${detailsStr}`);
};

serve(async (req) => {
  try {
    logStep("Automated earnings update started");

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get request body for specific producer or process all
    const body = await req.json().catch(() => ({}));
    const { producer_id, beat_id } = body;

    let query = supabaseService
      .from('beat_sales')
      .select(`
        *,
        beats!beat_sales_beat_id_fkey(user_id)
      `);

    if (producer_id) {
      query = query.eq('producer_id', producer_id);
    }

    if (beat_id) {
      query = query.eq('beat_id', beat_id);
    }

    const { data: beatSales, error: salesError } = await query;

    if (salesError) {
      throw new Error(`Failed to fetch beat sales: ${salesError.message}`);
    }

    logStep("Beat sales fetched", { count: beatSales?.length || 0 });

    // Calculate commission rates based on user tiers
    const producerIds = [...new Set(beatSales?.map(sale => sale.producer_id) || [])];
    
    const { data: userTiers } = await supabaseService
      .from('user_subscriptions')
      .select('user_id, tier')
      .in('user_id', producerIds)
      .eq('status', 'active');

    const tierCommissionRates = {
      'free': 20.0,    // 20% platform fee
      'creator': 15.0, // 15% platform fee  
      'pro': 10.0      // 10% platform fee
    };

    let updatedCount = 0;

    for (const sale of beatSales || []) {
      const userTier = userTiers?.find(t => t.user_id === sale.producer_id);
      const commissionRate = tierCommissionRates[userTier?.tier || 'free'];
      
      // Recalculate earnings based on current tier
      const platformFee = sale.sale_price * (commissionRate / 100);
      const producerEarnings = sale.sale_price - platformFee;

      // Update if commission rate has changed
      if (Math.abs(sale.commission_rate - commissionRate) > 0.01) {
        const { error: updateError } = await supabaseService
          .from('beat_sales')
          .update({
            commission_rate: commissionRate,
            platform_fee: platformFee,
            producer_earnings: producerEarnings,
            updated_at: new Date().toISOString()
          })
          .eq('id', sale.id);

        if (updateError) {
          logStep("Error updating beat sale", { saleId: sale.id, error: updateError.message });
        } else {
          updatedCount++;
          logStep("Beat sale updated", { 
            saleId: sale.id, 
            oldRate: sale.commission_rate,
            newRate: commissionRate 
          });
        }
      }
    }

    // Update producer earnings summaries
    if (updatedCount > 0) {
      logStep("Triggering producer earnings update");
      
      for (const producerId of producerIds) {
        await supabaseService.rpc('update_producer_earnings', {
          p_producer_id: producerId
        });
      }
    }

    logStep("Automated earnings update completed", { 
      processed: beatSales?.length || 0,
      updated: updatedCount 
    });

    return new Response(JSON.stringify({
      success: true,
      processed: beatSales?.length || 0,
      updated: updatedCount,
      message: `Updated ${updatedCount} beat sales with new commission rates`
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in automated earnings update", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REVENUE-AGGREGATOR] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Starting revenue aggregation");
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const today = new Date().toISOString().split('T')[0];

    // Get all creators who have metrics
    const { data: creators, error: creatorsError } = await supabaseClient
      .from('creator_metrics')
      .select('creator_id')
      .eq('metric_date', today);

    if (creatorsError) {
      throw new Error(`Failed to fetch creators: ${creatorsError.message}`);
    }

    const creatorIds = creators?.map(c => c.creator_id) || [];
    
    // Also get creators with recent battle or event activity
    const { data: recentActivity } = await supabaseClient
      .from('battle_transactions')
      .select('user_id')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .eq('type', 'payout');

    const recentCreators = recentActivity?.map(a => a.user_id) || [];
    const allCreatorIds = [...new Set([...creatorIds, ...recentCreators])];

    logStep("Processing creators", { count: allCreatorIds.length });

    for (const creatorId of allCreatorIds) {
      try {
        await aggregateCreatorRevenue(supabaseClient, creatorId, today);
        logStep("Aggregated revenue for creator", { creatorId });
      } catch (error) {
        logStep("Error aggregating creator revenue", { creatorId, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: allCreatorIds.length 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    logStep("ERROR in revenue aggregator", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function aggregateCreatorRevenue(supabaseClient: any, creatorId: string, date: string) {
  // Calculate battle revenue
  const { data: battleRevenue } = await supabaseClient
    .from('battle_transactions')
    .select('amount_cents')
    .eq('user_id', creatorId)
    .eq('type', 'payout')
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lt('created_at', `${new Date(new Date(date).getTime() + 24*60*60*1000).toISOString().split('T')[0]}T00:00:00.000Z`);

  const battleRevenueCents = battleRevenue?.reduce((sum, t) => sum + t.amount_cents, 0) || 0;

  // Calculate event revenue
  const { data: eventRevenue } = await supabaseClient
    .from('event_tickets')
    .select('events(created_by), amount_paid')
    .eq('events.created_by', creatorId)
    .eq('payment_status', 'completed')
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lt('created_at', `${new Date(new Date(date).getTime() + 24*60*60*1000).toISOString().split('T')[0]}T00:00:00.000Z`);

  const eventRevenueCents = eventRevenue?.reduce((sum, t) => sum + (t.amount_paid * 100), 0) || 0;

  // Calculate fan subscription revenue (today's new subscriptions)
  const { data: fanSubRevenue } = await supabaseClient
    .from('fan_subscriptions')
    .select('price_cents')
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .gte('created_at', `${date}T00:00:00.000Z`)
    .lt('created_at', `${new Date(new Date(date).getTime() + 24*60*60*1000).toISOString().split('T')[0]}T00:00:00.000Z`);

  const fanSubRevenueCents = fanSubRevenue?.reduce((sum, s) => sum + s.price_cents, 0) || 0;

  // Update or insert creator metrics
  const { error } = await supabaseClient
    .from('creator_metrics')
    .upsert({
      creator_id: creatorId,
      metric_date: date,
      battle_revenue_cents: battleRevenueCents,
      event_revenue_cents: eventRevenueCents,
      fan_subscription_revenue: fanSubRevenueCents,
      updated_at: new Date().toISOString()
    }, { 
      onConflict: 'creator_id,metric_date',
      ignoreDuplicates: false 
    });

  if (error) {
    throw new Error(`Failed to update creator metrics: ${error.message}`);
  }

  logStep("Updated creator metrics", { 
    creatorId, 
    battleRevenue: battleRevenueCents,
    eventRevenue: eventRevenueCents,
    fanSubRevenue: fanSubRevenueCents
  });
}
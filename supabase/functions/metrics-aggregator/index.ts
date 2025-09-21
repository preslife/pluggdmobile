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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const today = new Date().toISOString().split('T')[0];
    console.log(`Aggregating metrics for date: ${today}`);

    // Get all creators (users who have created content)
    const { data: creators, error: creatorsError } = await supabaseClient
      .rpc('sql', {
        query: `
          SELECT DISTINCT creator_id as user_id
          FROM (
            SELECT user_id as creator_id FROM releases WHERE user_id IS NOT NULL
            UNION
            SELECT creator_id FROM community_posts WHERE creator_id IS NOT NULL
            UNION
            SELECT created_by as creator_id FROM events WHERE created_by IS NOT NULL
          ) creators
        `
      });

    if (creatorsError) {
      console.error('Error fetching creators:', creatorsError);
      throw creatorsError;
    }

    console.log(`Found ${creators?.length || 0} creators to process`);

    for (const creator of creators || []) {
      const creatorId = creator.user_id;
      
      // Count fan subscriptions
      const { count: subsCount } = await supabaseClient
        .from('fan_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('status', 'active');

      // Calculate revenue from fan subscriptions (today's new subscriptions)
      const { data: revenueData } = await supabaseClient
        .from('fan_subscriptions')
        .select('price_cents')
        .eq('creator_id', creatorId)
        .eq('status', 'active')
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      const revenueCents = revenueData?.reduce((sum, sub) => sum + (sub.price_cents || 0), 0) || 0;

      // Count likes on creator's community posts (today)
      const { count: likesCount } = await supabaseClient
        .from('community_likes')
        .select('*', { count: 'exact', head: true })
        .in('post_id', 
          supabaseClient
            .from('community_posts')
            .select('id')
            .eq('creator_id', creatorId)
        )
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      // Count comments on creator's community posts (today)
      const { count: commentsCount } = await supabaseClient
        .from('community_comments')
        .select('*', { count: 'exact', head: true })
        .in('post_id',
          supabaseClient
            .from('community_posts')
            .select('id')
            .eq('creator_id', creatorId)
        )
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      // Count battle entries (today)
      const { count: battlesEntriesCount } = await supabaseClient
        .from('battle_entries')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', creatorId)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      // Calculate audience insights
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      // New fans 30d
      const { count: newFans30d } = await supabaseClient
        .from('fan_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .gte('created_at', `${thirtyDaysAgo}T00:00:00Z`);

      // Churn 30d  
      const { count: churn30d } = await supabaseClient
        .from('fan_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creatorId)
        .eq('status', 'cancelled')
        .gte('updated_at', `${thirtyDaysAgo}T00:00:00Z`);

      // Basic audience geo (placeholder)
      const audienceGeo = {};

      // Upsert metrics for this creator
      const { error: upsertError } = await supabaseClient
        .from('creator_metrics')
        .upsert({
          creator_id: creatorId,
          metric_date: today,
          subs_count: subsCount || 0,
          revenue_cents: revenueCents,
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          battles_entries_count: battlesEntriesCount || 0,
          audience_geo: audienceGeo,
          retention_30d: 85, // Default value
          new_fans_30d: newFans30d || 0,
          churn_30d: churn30d || 0
        }, { 
          onConflict: 'creator_id,metric_date' 
        });

      if (upsertError) {
        console.error(`Error upserting metrics for creator ${creatorId}:`, upsertError);
      } else {
        console.log(`Updated metrics for creator ${creatorId}: subs=${subsCount}, revenue=${revenueCents}, likes=${likesCount}, comments=${commentsCount}, battles=${battlesEntriesCount}`);
      }
    }

    console.log('Metrics aggregation completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      processed: creators?.length || 0,
      date: today 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Error in metrics-aggregator:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
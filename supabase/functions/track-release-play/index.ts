import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const supabaseService = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  );

  try {
    let userId: string | null = null; // Default to null for anonymous
    
    // Check if user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const { data } = await supabaseClient.auth.getUser(token);
        if (data.user) {
          userId = data.user.id; // Use authenticated user ID
        }
      } catch (authError) {
        console.log('Auth failed, using anonymous user:', authError);
        // Continue with null user ID for anonymous
      }
    }

    const { releaseId, playDuration, deviceType, countryCode } = await req.json();
    
    if (!releaseId) {
      throw new Error('Release ID is required');
    }

    // Get release info
    const { data: release, error: releaseError } = await supabaseService
      .from('releases')
      .select('user_id, title, artist, total_plays')
      .eq('id', releaseId)
      .maybeSingle();

    if (releaseError || !release) {
      throw new Error('Release not found');
    }

    // Record the play
    await supabaseService.from('release_plays').insert({
      release_id: releaseId,
      user_id: userId,
      play_duration: playDuration || null,
      device_type: deviceType || null,
      country_code: countryCode || null,
      played_at: new Date().toISOString()
    });

    // Update release total plays
    await supabaseService
      .from('releases')
      .update({ 
        total_plays: (release.total_plays || 0) + 1 
      })
      .eq('id', releaseId);

    // Update analytics table for the release owner
    const today = new Date().toISOString().split('T')[0];
    
    // Check if analytics record exists for today
    const { data: existingAnalytics } = await supabaseService
      .from('release_analytics')
      .select('id, plays_count')
      .eq('user_id', release.user_id)
      .eq('release_id', releaseId)
      .eq('date_recorded', today)
      .maybeSingle();

    if (existingAnalytics) {
      // Update existing record
      await supabaseService
        .from('release_analytics')
        .update({
          plays_count: existingAnalytics.plays_count + 1
        })
        .eq('id', existingAnalytics.id);
    } else {
      // Create new record
      await supabaseService
        .from('release_analytics')
        .insert({
          user_id: release.user_id,
          release_id: releaseId,
          date_recorded: today,
          plays_count: 1,
          downloads_count: 0,
          revenue_amount: 0,
          unique_listeners: 1
        });
    }

    // Award XP to the release owner if it's not their own play (and user is authenticated)
    if (userId && release.user_id !== userId) {
      const { data: currentStats } = await supabaseService
        .from('user_stats')
        .select('total_points')
        .eq('user_id', release.user_id)
        .maybeSingle();

      await supabaseService
        .from('user_stats')
        .update({
          total_points: (currentStats?.total_points || 0) + 2,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', release.user_id);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Play tracked successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
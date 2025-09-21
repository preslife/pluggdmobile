import { cors } from 'https://deno.land/x/cors@v1.2.2/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Running scheduled content publishing...');

    // Create a Supabase client with service role key for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const now = new Date().toISOString();

    // Auto-publish scheduled releases
    const { data: scheduledReleases, error: releaseError } = await supabase
      .from('releases')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_publish_date', now);

    if (releaseError) {
      console.error('Error fetching scheduled releases:', releaseError);
    } else {
      console.log(`Found ${scheduledReleases?.length || 0} releases to publish`);
      
      if (scheduledReleases && scheduledReleases.length > 0) {
        const { error: updateError } = await supabase
          .from('releases')
          .update({ 
            status: 'live',
            scheduled_publish_date: null 
          })
          .in('id', scheduledReleases.map(r => r.id));

        if (updateError) {
          console.error('Error publishing releases:', updateError);
        } else {
          console.log(`Successfully published ${scheduledReleases.length} releases`);
        }
      }
    }

    // Auto-publish scheduled sample packs
    const { data: scheduledPacks, error: packError } = await supabase
      .from('sample_packs')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_publish_date', now);

    if (packError) {
      console.error('Error fetching scheduled sample packs:', packError);
    } else {
      console.log(`Found ${scheduledPacks?.length || 0} sample packs to publish`);
      
      if (scheduledPacks && scheduledPacks.length > 0) {
        const { error: updateError } = await supabase
          .from('sample_packs')
          .update({ 
            status: 'live',
            scheduled_publish_date: null 
          })
          .in('id', scheduledPacks.map(p => p.id));

        if (updateError) {
          console.error('Error publishing sample packs:', updateError);
        } else {
          console.log(`Successfully published ${scheduledPacks.length} sample packs`);
        }
      }
    }

    // Auto-start scheduled contests
    const { data: scheduledContests, error: contestError } = await supabase
      .from('contests')
      .select('*')
      .eq('status', 'upcoming')
      .lte('start_date', now);

    if (contestError) {
      console.error('Error fetching scheduled contests:', contestError);
    } else {
      console.log(`Found ${scheduledContests?.length || 0} contests to start`);
      
      if (scheduledContests && scheduledContests.length > 0) {
        const { error: updateError } = await supabase
          .from('contests')
          .update({ status: 'active' })
          .in('id', scheduledContests.map(c => c.id));

        if (updateError) {
          console.error('Error starting contests:', updateError);
        } else {
          console.log(`Successfully started ${scheduledContests.length} contests`);
        }
      }
    }

    // Auto-end expired contests
    const { data: expiredContests, error: expiredError } = await supabase
      .from('contests')
      .select('*')
      .eq('status', 'active')
      .lte('end_date', now);

    if (expiredError) {
      console.error('Error fetching expired contests:', expiredError);
    } else {
      console.log(`Found ${expiredContests?.length || 0} contests to end`);
      
      if (expiredContests && expiredContests.length > 0) {
        const { error: updateError } = await supabase
          .from('contests')
          .update({ status: 'ended' })
          .in('id', expiredContests.map(c => c.id));

        if (updateError) {
          console.error('Error ending contests:', updateError);
        } else {
          console.log(`Successfully ended ${expiredContests.length} contests`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Scheduled content processing completed',
        published: {
          releases: scheduledReleases?.length || 0,
          sample_packs: scheduledPacks?.length || 0,
          contests_started: scheduledContests?.length || 0,
          contests_ended: expiredContests?.length || 0
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in scheduled publishing:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get creators with Instagram connections
    const { data: connections, error: connectionsError } = await supabase
      .from('social_connections')
      .select('user_id, connection_data')
      .eq('provider', 'instagram');

    if (connectionsError) throw connectionsError;

    let totalProcessed = 0;

    for (const connection of connections || []) {
      try {
        const accessToken = connection.connection_data?.access_token;
        const pageId = connection.connection_data?.page_id;
        const igBusinessAccountId = connection.connection_data?.ig_business_account_id;
        
        if (!accessToken || !pageId || !igBusinessAccountId) {
          console.log(`Skipping Instagram for user ${connection.user_id}: missing credentials`);
          continue;
        }

        // Note: Instagram Basic Display API doesn't provide DMs
        // This would require Instagram Messaging API which has strict approval requirements
        // For now, we'll log that the feature is not available
        console.log(`Instagram DMs not available for user ${connection.user_id}: requires Instagram Messaging API approval`);
        
        // Instead, we could fetch comments on recent posts if needed
        // But the requirements specified DMs, so we'll mark as unavailable
        
      } catch (error) {
        console.error(`Error processing Instagram for user ${connection.user_id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: totalProcessed,
        provider: 'instagram',
        message: 'Instagram DMs require Messaging API approval'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in inbox-fetch-instagram:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
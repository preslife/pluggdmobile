import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  let logger: ReturnType<typeof createSystemLogger> | null = null;
  const correlationId = generateCorrelationId();

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    logger = createSystemLogger(supabase, {
      component: 'inbox_fetch_instagram',
      feature: 'inbox',
      correlationId,
      message: 'Instagram inbox fetcher',
    });

    await logger.info('inbox_fetch_start', {
      provider: 'instagram',
    });

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
          await logger?.warn('inbox_fetch_credentials_missing', {
            provider: 'instagram',
            user_id: connection.user_id,
          });
          continue;
        }

        // Note: Instagram Basic Display API doesn't provide DMs
        // This would require Instagram Messaging API which has strict approval requirements
        // For now, we'll log that the feature is not available
        await logger?.warn('inbox_fetch_provider_unavailable', {
          provider: 'instagram',
          user_id: connection.user_id,
          reason: 'messaging_api_not_approved',
        });

        // Instead, we could fetch comments on recent posts if needed
        // But the requirements specified DMs, so we'll mark as unavailable

      } catch (error) {
        await logger?.error('inbox_fetch_connection_failed', error, {
          provider: 'instagram',
          user_id: connection.user_id,
        });
      }
    }

    await logger.info('inbox_fetch_complete', {
      provider: 'instagram',
      processed: totalProcessed,
      connections: connections?.length ?? 0,
    });

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
    const fallbackLogger =
      logger ??
      (supabaseUrl && supabaseServiceKey
        ? createSystemLogger(supabase, {
            component: 'inbox_fetch_instagram',
            feature: 'inbox',
            correlationId,
            message: 'Instagram inbox fetcher',
          })
        : null);
    const message = error instanceof Error ? error.message : String(error);
    await fallbackLogger?.error('inbox_fetch_failed', error, {
      provider: 'instagram',
      error: message,
    });
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
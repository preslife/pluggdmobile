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
    const youtubeApiKey = Deno.env.get('YOUTUBE_API_KEY') ?? '';
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }
    if (!youtubeApiKey) {
      throw new Error('YouTube API key not configured');
    }

    logger = createSystemLogger(supabase, {
      component: 'inbox_fetch_youtube',
      feature: 'inbox',
      correlationId,
      message: 'YouTube inbox fetcher',
    });

    await logger.info('inbox_fetch_start', {
      provider: 'youtube',
    });

    // Get creators with YouTube connections
    const { data: connections, error: connectionsError } = await supabase
      .from('social_connections')
      .select('user_id, connection_data')
      .eq('provider', 'youtube');

    if (connectionsError) throw connectionsError;

    let totalProcessed = 0;

    for (const connection of connections || []) {
      try {
        const channelId = connection.connection_data?.channel_id;
        if (!channelId) continue;

        // Fetch recent comments on the creator's channel
        const commentsUrl = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&allThreadsRelatedToChannelId=${channelId}&maxResults=20&order=time&key=${youtubeApiKey}`;

        const response = await fetch(commentsUrl);
        if (!response.ok) {
          await logger?.warn('inbox_fetch_provider_error', {
            provider: 'youtube',
            status: response.status,
            user_id: connection.user_id,
          });
          continue;
        }
        const data = await response.json();

        if (data.items) {
          for (const item of data.items) {
            const comment = item.snippet.topLevelComment.snippet;
            
            // Check if comment already exists
            const { data: existing } = await supabase
              .from('unified_inbox')
              .select('id')
              .eq('message_id', item.id)
              .eq('user_id', connection.user_id)
              .single();

            if (!existing) {
              await supabase.from('unified_inbox').insert({
                user_id: connection.user_id,
                provider: 'youtube',
                message_id: item.id,
                author_name: comment.authorDisplayName,
                author_handle: comment.authorChannelUrl?.split('/').pop() || null,
                body: comment.textDisplay,
                snippet: comment.textDisplay.substring(0, 200),
                permalink: `https://youtube.com/watch?v=${item.snippet.videoId}&lc=${item.id}`,
                thread_id: item.snippet.videoId,
                is_read: false,
                is_starred: false
              });
              totalProcessed++;
            }
          }
        }
      } catch (error) {
        await logger?.error('inbox_fetch_connection_failed', error, {
          provider: 'youtube',
          user_id: connection.user_id,
        });
      }
    }

    await logger.info('inbox_fetch_complete', {
      provider: 'youtube',
      processed: totalProcessed,
      connections: connections?.length ?? 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        provider: 'youtube'
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
            component: 'inbox_fetch_youtube',
            feature: 'inbox',
            correlationId,
            message: 'YouTube inbox fetcher',
          })
        : null);
    const message = error instanceof Error ? error.message : String(error);
    await fallbackLogger?.error('inbox_fetch_failed', error, {
      provider: 'youtube',
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
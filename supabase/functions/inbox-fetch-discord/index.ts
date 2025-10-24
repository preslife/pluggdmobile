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
      component: 'inbox_fetch_discord',
      feature: 'inbox',
      correlationId,
      message: 'Discord inbox fetcher',
    });

    await logger.info('inbox_fetch_start', {
      provider: 'discord',
    });

    // Get creators with Discord connections
    const { data: connections, error: connectionsError } = await supabase
      .from('social_connections')
      .select('user_id, connection_data')
      .eq('provider', 'discord');

    if (connectionsError) throw connectionsError;

    let totalProcessed = 0;

    for (const connection of connections || []) {
      try {
        const botToken = connection.connection_data?.bot_token;
        const channelId = connection.connection_data?.channel_id;

        if (!botToken || !channelId) continue;

        // Fetch recent messages from the Discord channel
        const messagesUrl = `https://discord.com/api/v10/channels/${channelId}/messages?limit=20`;
        
        const response = await fetch(messagesUrl, {
          headers: {
            'Authorization': `Bot ${botToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          await logger?.warn('inbox_fetch_provider_error', {
            provider: 'discord',
            status: response.status,
            user_id: connection.user_id,
          });
          continue;
        }

        const messages = await response.json();

        for (const message of messages) {
          // Skip bot messages and messages from the creator themselves
          if (message.author.bot || message.author.id === connection.connection_data?.user_id) {
            continue;
          }

          // Check if message already exists
          const { data: existing } = await supabase
            .from('unified_inbox')
            .select('id')
            .eq('message_id', message.id)
            .eq('user_id', connection.user_id)
            .single();

          if (!existing) {
            await supabase.from('unified_inbox').insert({
              user_id: connection.user_id,
              provider: 'discord',
              message_id: message.id,
              author_name: message.author.global_name || message.author.username,
              author_handle: message.author.username,
              body: message.content,
              snippet: message.content.substring(0, 200),
              permalink: `https://discord.com/channels/${connection.connection_data?.guild_id}/${channelId}/${message.id}`,
              thread_id: channelId,
              is_read: false,
              is_starred: false
            });
            totalProcessed++;
          }
        }
      } catch (error) {
        await logger?.error('inbox_fetch_connection_failed', error, {
          provider: 'discord',
          user_id: connection.user_id,
        });
      }
    }

    await logger.info('inbox_fetch_complete', {
      provider: 'discord',
      processed: totalProcessed,
      connections: connections?.length ?? 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        provider: 'discord'
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
            component: 'inbox_fetch_discord',
            feature: 'inbox',
            correlationId,
            message: 'Discord inbox fetcher',
          })
        : null);
    const message = error instanceof Error ? error.message : String(error);
    await fallbackLogger?.error('inbox_fetch_failed', error, {
      provider: 'discord',
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
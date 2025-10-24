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
      component: 'inbox_fetch_gmail',
      feature: 'inbox',
      correlationId,
      message: 'Gmail inbox fetcher',
    });

    await logger.info('inbox_fetch_start', {
      provider: 'gmail',
    });

    // Get creators with Gmail connections
    const { data: connections, error: connectionsError } = await supabase
      .from('social_connections')
      .select('user_id, connection_data')
      .eq('provider', 'gmail');

    if (connectionsError) throw connectionsError;

    let totalProcessed = 0;

    for (const connection of connections || []) {
      try {
        const accessToken = connection.connection_data?.access_token;
        if (!accessToken) continue;

        // Fetch recent threads from Gmail API
        const threadsUrl = 'https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=20&q=in:inbox';
        
        const response = await fetch(threadsUrl, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          await logger?.warn('inbox_fetch_provider_error', {
            provider: 'gmail',
            status: response.status,
            user_id: connection.user_id,
          });
          continue;
        }

        const data = await response.json();

        if (data.threads) {
          for (const thread of data.threads) {
            // Get thread details
            const threadUrl = `https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`;
            
            const threadResponse = await fetch(threadUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (!threadResponse.ok) continue;

            const threadData = await threadResponse.json();
            const latestMessage = threadData.messages[threadData.messages.length - 1];
            
            // Extract headers
            let subject = '';
            let fromName = '';
            let fromEmail = '';
            
            for (const header of latestMessage.payload.headers) {
              if (header.name === 'Subject') subject = header.value;
              if (header.name === 'From') {
                const fromMatch = header.value.match(/^(.*?)\s*<(.+)>$/) || header.value.match(/^(.+)$/);
                fromName = fromMatch?.[1]?.trim() || header.value;
                fromEmail = fromMatch?.[2] || header.value;
              }
            }

            // Check if thread already exists
            const { data: existing } = await supabase
              .from('unified_inbox')
              .select('id')
              .eq('message_id', thread.id)
              .eq('user_id', connection.user_id)
              .single();

            if (!existing) {
              await supabase.from('unified_inbox').insert({
                user_id: connection.user_id,
                provider: 'gmail',
                message_id: thread.id,
                author_name: fromName,
                author_handle: fromEmail,
                body: subject,
                snippet: latestMessage.snippet || subject,
                permalink: `https://mail.google.com/mail/u/0/#inbox/${thread.id}`,
                thread_id: thread.id,
                is_read: false,
                is_starred: false
              });
              totalProcessed++;
            }
          }
        }
      } catch (error) {
        await logger?.error('inbox_fetch_connection_failed', error, {
          provider: 'gmail',
          user_id: connection.user_id,
        });
      }
    }

    await logger.info('inbox_fetch_complete', {
      provider: 'gmail',
      processed: totalProcessed,
      connections: connections?.length ?? 0,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        provider: 'gmail'
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
            component: 'inbox_fetch_gmail',
            feature: 'inbox',
            correlationId,
            message: 'Gmail inbox fetcher',
          })
        : null);
    const message = error instanceof Error ? error.message : String(error);
    await fallbackLogger?.error('inbox_fetch_failed', error, {
      provider: 'gmail',
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
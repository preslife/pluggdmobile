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
          console.error(`Gmail API error: ${response.status}`);
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
        console.error(`Error processing Gmail for user ${connection.user_id}:`, error);
      }
    }

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
    console.error('Error in inbox-fetch-gmail:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
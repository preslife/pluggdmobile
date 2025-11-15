import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const googleClientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
const googleClientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";

type ConnectionRow = {
  id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  connection_data: Record<string, unknown> | null;
};

const needsRefresh = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return false;
  // refresh one minute early
  return expiry < Date.now() + 60_000;
};

const refreshAccessToken = async (
  supabase: ReturnType<typeof createClient>,
  connection: ConnectionRow,
  logger: ReturnType<typeof createSystemLogger> | null
): Promise<{ token: string | null; updated: boolean }> => {
  if (!connection.refresh_token) {
    await logger?.warn("inbox_fetch_missing_refresh_token", {
      provider: "gmail",
      user_id: connection.user_id,
    });
    return { token: null, updated: false };
  }

  if (!googleClientId || !googleClientSecret) {
    await logger?.error("inbox_fetch_missing_google_creds", new Error("Missing Google credentials"), {
      provider: "gmail",
    });
    return { token: null, updated: false };
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId,
      client_secret: googleClientSecret,
      refresh_token: connection.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();
    await logger?.warn("inbox_fetch_refresh_failed", {
      provider: "gmail",
      user_id: connection.user_id,
      status: tokenResponse.status,
      body: errorBody,
    });
    return { token: null, updated: false };
  }

  const tokenPayload = await tokenResponse.json();
  const newAccessToken = tokenPayload.access_token as string | undefined;
  if (!newAccessToken) {
    return { token: null, updated: false };
  }

  const expiresAt =
    typeof tokenPayload.expires_in === "number"
      ? new Date(Date.now() + tokenPayload.expires_in * 1000).toISOString()
      : connection.expires_at;

  await supabase
    .from("social_connections")
    .update({
      access_token: newAccessToken,
      refresh_token: tokenPayload.refresh_token ?? connection.refresh_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", connection.id);

  return { token: newAccessToken, updated: true };
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  let logger: ReturnType<typeof createSystemLogger> | null = null;
  const correlationId = generateCorrelationId();

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    logger = createSystemLogger(supabase, {
      component: "inbox_fetch_gmail",
      feature: "inbox",
      correlationId,
      message: "Gmail inbox fetcher",
    });

    await logger.info("inbox_fetch_start", {
      provider: "gmail",
    });

    // Get creators with Gmail connections
    const { data: connections, error: connectionsError } = await supabase
      .from("social_connections")
      .select("id, user_id, access_token, refresh_token, expires_at, connection_data")
      .eq("provider", "gmail");

    if (connectionsError) throw connectionsError;

    let totalProcessed = 0;

    for (const connection of (connections || []) as ConnectionRow[]) {
      try {
        let accessToken = connection.access_token;
        if (!accessToken || needsRefresh(connection.expires_at)) {
          const refreshed = await refreshAccessToken(supabase, connection, logger);
          accessToken = refreshed.token ?? accessToken;
          if (!accessToken) {
            continue;
          }
        }

        // Fetch recent threads from Gmail API
        const threadsUrl = "https://gmail.googleapis.com/gmail/v1/users/me/threads?maxResults=20&q=in:inbox";

        const response = await fetch(threadsUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          await logger?.warn("inbox_fetch_provider_error", {
            provider: "gmail",
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
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
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

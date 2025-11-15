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

type GmailConnection = {
  id: string;
  user_id: string;
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  connection_data: Record<string, unknown> | null;
  account_id: string | null;
  display_name: string | null;
};

const encodeBase64Url = (input: string) =>
  btoa(input)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const needsRefresh = (expiresAt?: string | null) => {
  if (!expiresAt) return false;
  const ts = new Date(expiresAt).getTime();
  if (Number.isNaN(ts)) return false;
  return ts < Date.now() + 60_000;
};

const refreshToken = async (
  supabase: ReturnType<typeof createClient>,
  connection: GmailConnection,
  logger: ReturnType<typeof createSystemLogger> | null
): Promise<string | null> => {
  if (!connection.refresh_token || !googleClientId || !googleClientSecret) {
    await logger?.warn("inbox_send_gmail_refresh_missing", {
      provider: "gmail",
      user_id: connection.user_id,
    });
    return null;
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
    const body = await tokenResponse.text();
    await logger?.warn("inbox_send_gmail_refresh_failed", {
      provider: "gmail",
      user_id: connection.user_id,
      status: tokenResponse.status,
      body,
    });
    return null;
  }

  const tokenPayload = await tokenResponse.json();
  const newAccessToken = tokenPayload.access_token as string | undefined;
  if (!newAccessToken) return null;

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

  return newAccessToken;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const correlationId = generateCorrelationId();
  const logger = createSystemLogger(supabase, {
    component: "inbox_send_gmail",
    feature: "inbox",
    correlationId,
    message: "Gmail inbox composer",
  });

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Supabase credentials not configured");
    }

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const payload = await req.json();
    const to = String(payload.to ?? "").trim();
    const subject = String(payload.subject ?? "").trim();
    const body = String(payload.body ?? "").trim();

    if (!to || !subject || !body) {
      return new Response(JSON.stringify({ error: "Missing fields: to, subject, body" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: connection, error: connectionError } = await supabase
      .from("social_connections")
      .select("id, user_id, access_token, refresh_token, expires_at, connection_data, account_id, display_name")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .maybeSingle();

    if (connectionError) throw connectionError;
    if (!connection) {
      return new Response(JSON.stringify({ error: "Gmail not connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    let accessToken = connection.access_token;
    if (!accessToken || needsRefresh(connection.expires_at)) {
      accessToken = await refreshToken(supabase, connection as GmailConnection, logger);
      if (!accessToken) {
        return new Response(JSON.stringify({ error: "Unable to refresh Gmail token" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }

    const fromAddress =
      (connection.connection_data?.email as string | undefined) ||
      connection.account_id ||
      `${user.email ?? "creator"}@gmail.com`;
    const fromName =
      (connection.connection_data?.display_name as string | undefined) ||
      connection.display_name ||
      user.email ||
      "Pluggd Creator";

    await logger.info("inbox_send_gmail_attempt", {
      provider: "gmail",
      user_id: user.id,
    });

    const rawMessage = [
      `From: ${fromName} <${fromAddress}>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "",
      body,
    ].join("\r\n");

    const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodeBase64Url(rawMessage) }),
    });

    if (!gmailResponse.ok) {
      const errorBody = await gmailResponse.text();
      await logger.error(
        "inbox_send_gmail_failed",
        new Error(`Gmail responded with status ${gmailResponse.status}`),
        { provider: "gmail", user_id: user.id, response: errorBody }
      );

      return new Response(JSON.stringify({ error: "Failed to send Gmail message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    await logger.info("inbox_send_gmail_success", {
      provider: "gmail",
      user_id: user.id,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    await logger.error("inbox_send_gmail_unhandled", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

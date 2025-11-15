import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const correlationId = generateCorrelationId();
  const logger = createSystemLogger(supabase, {
    component: "inbox_send_discord",
    feature: "inbox",
    correlationId,
    message: "Discord inbox composer",
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
    const messageContent = String(payload.content ?? "").trim();
    const channelIdOverride = payload.channel_id ? String(payload.channel_id) : null;

    if (!messageContent) {
      return new Response(JSON.stringify({ error: "Message content required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const { data: connection, error: connectionError } = await supabase
      .from("social_connections")
      .select("id, connection_data")
      .eq("user_id", user.id)
      .eq("provider", "discord")
      .maybeSingle();

    if (connectionError) throw connectionError;
    if (!connection) {
      return new Response(JSON.stringify({ error: "Discord not connected" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const botToken = connection.connection_data?.bot_token as string | undefined;
    const defaultChannelId = connection.connection_data?.channel_id as string | undefined;
    const channelId = channelIdOverride || defaultChannelId;

    if (!botToken || !channelId) {
      return new Response(JSON.stringify({ error: "Missing Discord bot configuration" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    await logger.info("inbox_send_discord_attempt", {
      provider: "discord",
      user_id: user.id,
      channel_id: channelId,
    });

    const discordResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: messageContent,
      }),
    });

    if (!discordResponse.ok) {
      const errorBody = await discordResponse.text();
      await logger.error(
        "inbox_send_discord_failed",
        new Error(`Discord responded with status ${discordResponse.status}`),
        {
          provider: "discord",
          status: discordResponse.status,
          user_id: user.id,
          channel_id: channelId,
          response: errorBody,
        }
      );

      return new Response(JSON.stringify({ error: "Failed to send Discord message" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 502,
      });
    }

    await logger.info("inbox_send_discord_success", {
      provider: "discord",
      user_id: user.id,
      channel_id: channelId,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    await logger.error("inbox_send_discord_unhandled", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

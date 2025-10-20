import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

type ConnectorAction = "status" | "connect" | "disconnect";
type ConnectorMethod = "oauth" | "apiKey";

interface ConnectorRequestBody {
  action: ConnectorAction;
  method?: ConnectorMethod;
  code?: string;
  redirectUri?: string;
  apiKey?: string;
  accountId?: string;
  accountName?: string;
}

interface TikTokTokenResponse {
  data?: {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    open_id?: string;
    scope?: string;
  };
  error?: number;
  description?: string;
}

interface TikTokUserResponse {
  data?: {
    user?: {
      display_name?: string;
      username?: string;
      avatar_url?: string;
      open_id?: string;
    };
  };
  error?: number;
  description?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as ConnectorRequestBody;
    const action = body.action;

    switch (action) {
      case "status": {
        const connection = await getConnection(user.id);
        return new Response(
          JSON.stringify(
            connection
              ? { status: "connected", connection }
              : { status: "disconnected" }
          ),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      case "disconnect": {
        await supabase
          .from("social_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("provider", "tiktok");

        return new Response(JSON.stringify({ status: "disconnected" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "connect": {
        if (body.method === "oauth") {
          const connection = await handleOAuthConnect(user.id, body);
          return new Response(
            JSON.stringify({ status: "connected", connection }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        if (body.method === "apiKey") {
          const connection = await handleApiKeyConnect(user.id, body);
          return new Response(
            JSON.stringify({ status: "connected", connection }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        throw new Error("Unsupported connection method");
      }
      default:
        throw new Error("Unknown action");
    }
  } catch (error) {
    console.error("Error in tiktok-connector:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function getConnection(userId: string) {
  const { data } = await supabase
    .from("social_connections")
    .select(
      "id, provider_user_id, connection_data, access_token, refresh_token, expires_at, created_at, updated_at"
    )
    .eq("user_id", userId)
    .eq("provider", "tiktok")
    .maybeSingle();

  if (!data) {
    return null;
  }

  const connectionData = data.connection_data ?? {};

  return {
    id: data.id,
    accountId: data.provider_user_id ?? connectionData.accountId ?? null,
    accountName: connectionData.accountName ?? null,
    avatarUrl: connectionData.avatarUrl ?? null,
    method: connectionData.method ?? (data.refresh_token ? "oauth" : "apiKey"),
    connectedAt: data.created_at,
    updatedAt: data.updated_at,
    expiresAt: data.expires_at,
    scope: connectionData.scope ?? null,
    sandbox: connectionData.sandbox ?? false,
    lastValidatedAt: connectionData.lastValidatedAt ?? null,
  };
}

async function handleOAuthConnect(userId: string, body: ConnectorRequestBody) {
  if (!body.code || !body.redirectUri) {
    throw new Error("Missing OAuth parameters");
  }

  const clientKey = Deno.env.get("TIKTOK_CLIENT_KEY");
  const clientSecret = Deno.env.get("TIKTOK_CLIENT_SECRET");

  if (!clientKey || !clientSecret) {
    throw new Error("TikTok OAuth credentials are not configured");
  }

  const tokenResponse = await fetch("https://open-api.tiktok.com/oauth/access_token/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_key: clientKey,
      client_secret: clientSecret,
      code: body.code,
      grant_type: "authorization_code",
    }),
  });

  const tokenData = (await tokenResponse.json()) as TikTokTokenResponse;

  if (!tokenResponse.ok || tokenData.error) {
    throw new Error(
      `TikTok token exchange failed: ${tokenData.description ?? tokenResponse.statusText}`
    );
  }

  const accessToken = tokenData.data?.access_token;
  const refreshToken = tokenData.data?.refresh_token;
  const openId = tokenData.data?.open_id;

  if (!accessToken || !openId) {
    throw new Error("Missing TikTok token data");
  }

  const userResponse = await fetch("https://open-api.tiktok.com/user/info/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      access_token: accessToken,
      open_id: openId,
      fields: ["display_name", "username", "avatar_url"],
    }),
  });

  const userData = (await userResponse.json()) as TikTokUserResponse;

  if (!userResponse.ok || userData.error) {
    throw new Error(
      `TikTok user lookup failed: ${userData.description ?? userResponse.statusText}`
    );
  }

  const accountName =
    userData.data?.user?.display_name ||
    userData.data?.user?.username ||
    "TikTok Account";

  const expiresAt = tokenData.data?.expires_in
    ? new Date(Date.now() + tokenData.data.expires_in * 1000).toISOString()
    : null;

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("social_connections")
    .upsert(
      {
        user_id: userId,
        provider: "tiktok",
        provider_user_id: openId,
        access_token: accessToken,
        refresh_token: refreshToken ?? null,
        expires_at: expiresAt,
        connection_data: {
          accountId: openId,
          accountName,
          avatarUrl: userData.data?.user?.avatar_url ?? null,
          method: "oauth",
          scope: tokenData.data?.scope ?? null,
          lastValidatedAt: now,
        },
        updated_at: now,
      },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    throw error;
  }

  return getConnection(userId);
}

async function handleApiKeyConnect(userId: string, body: ConnectorRequestBody) {
  if (!body.apiKey || !body.accountId || !body.accountName) {
    throw new Error("API key connection requires account name, id, and key");
  }

  if (body.apiKey.length < 12) {
    throw new Error("TikTok API key appears to be invalid");
  }

  const requiredPrefix = Deno.env.get("TIKTOK_CONNECTOR_VALIDATION_PREFIX");
  if (requiredPrefix && !body.apiKey.startsWith(requiredPrefix)) {
    throw new Error(
      `API key must start with the configured prefix (${requiredPrefix})`
    );
  }

  const isSandboxKey = Boolean(
    Deno.env.get("TIKTOK_TEST_ACCESS_TOKEN") &&
      body.apiKey === Deno.env.get("TIKTOK_TEST_ACCESS_TOKEN")
  );

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("social_connections")
    .upsert(
      {
        user_id: userId,
        provider: "tiktok",
        provider_user_id: body.accountId,
        access_token: body.apiKey,
        refresh_token: null,
        expires_at: null,
        connection_data: {
          accountId: body.accountId,
          accountName: body.accountName,
          method: "apiKey",
          sandbox: isSandboxKey,
          lastValidatedAt: now,
        },
        updated_at: now,
      },
      { onConflict: "user_id,provider" }
    );

  if (error) {
    throw error;
  }

  return getConnection(userId);
}

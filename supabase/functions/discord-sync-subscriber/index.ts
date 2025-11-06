import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-correlation-id",
};

type SyncAction = "grant" | "revoke" | "sync";

type DiscordSyncRequest = {
  creator_id: string;
  fan_user_id: string;
  action?: SyncAction;
};

type RoleSyncResult = {
  action: "grant" | "revoke";
  tier: string | null;
  role_id: string;
  success: boolean;
  error?: string;
};

const jsonResponse = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase configuration missing" }, 500);
  }

  const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const correlationId = req.headers.get("x-correlation-id") ?? generateCorrelationId();
  const logger = createSystemLogger(serviceClient, {
    component: "discord_sync_subscriber",
    feature: "memberships",
    correlationId,
  });

  let payload: DiscordSyncRequest | null = null;
  try {
    payload = await req.json() as DiscordSyncRequest;
  } catch (error) {
    await logger.error("discord_sync_invalid_json", error);
    return jsonResponse({ error: "Invalid JSON payload" }, 400);
  }

  if (!payload?.creator_id || !payload?.fan_user_id) {
    await logger.warn("discord_sync_missing_parameters", {
      creator_id: payload?.creator_id ?? null,
      fan_user_id: payload?.fan_user_id ?? null,
    });
    return jsonResponse({ error: "creator_id and fan_user_id are required" }, 400);
  }

  const creatorId = payload.creator_id;
  const fanId = payload.fan_user_id;
  const requestedAction: SyncAction = payload.action ?? "sync";

  try {
    const { data: creatorProfile, error: profileError } = await serviceClient
      .from("profiles")
      .select("id, discord_guild_id, discord_role_map")
      .eq("user_id", creatorId)
      .maybeSingle();

    if (profileError) {
      await logger.error("discord_sync_profile_lookup_failed", profileError, { creator_id: creatorId });
      return jsonResponse({ error: "Unable to load creator profile" }, 500);
    }

    if (!creatorProfile?.discord_guild_id || !creatorProfile.discord_role_map) {
      await logger.warn("discord_sync_missing_configuration", { creator_id: creatorId });
      return jsonResponse({
        success: false,
        error: "Creator Discord configuration missing",
      }, 400);
    }

    const guildId = creatorProfile.discord_guild_id as string;
    const roleMap = creatorProfile.discord_role_map as Record<string, string>;

    const { data: creatorDiscord, error: creatorDiscordError } = await serviceClient
      .from("social_connections")
      .select("access_token")
      .eq("user_id", creatorId)
      .eq("provider", "discord")
      .maybeSingle();

    if (creatorDiscordError) {
      await logger.error("discord_sync_creator_token_lookup_failed", creatorDiscordError, { creator_id: creatorId });
      return jsonResponse({ error: "Unable to load creator Discord token" }, 500);
    }

    if (!creatorDiscord?.access_token) {
      await logger.warn("discord_sync_creator_token_missing", { creator_id: creatorId });
      return jsonResponse({ success: false, error: "Creator Discord bot not connected" }, 400);
    }

    const botToken = creatorDiscord.access_token as string;

    const { data: fanDiscord, error: fanDiscordError } = await serviceClient
      .from("social_connections")
      .select("account_id")
      .eq("user_id", fanId)
      .eq("provider", "discord")
      .maybeSingle();

    if (fanDiscordError) {
      await logger.error("discord_sync_fan_lookup_failed", fanDiscordError, { fan_id: fanId });
      return jsonResponse({ error: "Unable to load fan Discord account" }, 500);
    }

    if (!fanDiscord?.account_id) {
      await logger.warn("discord_sync_fan_not_connected", { fan_id: fanId });
      return jsonResponse({ success: false, error: "Fan Discord not connected" }, 400);
    }

    const discordUserId = fanDiscord.account_id as string;
    const ownerId: string = creatorProfile.id as string;
    const ownerType: "profile" = "profile";

    const { data: membership, error: membershipError } = await serviceClient
      .from("memberships")
      .select(
        "id, status, tier_id, membership_tiers!inner(id, name, owner_id, owner_type)"
      )
      .eq("user_id", fanId)
      .eq("status", "active")
      .eq("membership_tiers.owner_id", ownerId)
      .eq("membership_tiers.owner_type", ownerType)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      await logger.error("discord_sync_membership_lookup_failed", membershipError, { fan_id: fanId, creator_id: creatorId });
      return jsonResponse({ error: "Unable to load membership" }, 500);
    }

    const activeTierName = membership?.membership_tiers?.name ?? null;
    const membershipId = membership?.id ?? null;

    let actionToPerform: SyncAction = requestedAction;
    if (requestedAction === "sync") {
      actionToPerform = membership?.status === "active" && activeTierName ? "grant" : "revoke";
    }

    const results: RoleSyncResult[] = [];

    const roleEntries = Object.entries(roleMap ?? {});

    const rolesToRevoke = roleEntries.filter(([tierName]) => {
      if (actionToPerform === "revoke") return true;
      if (actionToPerform === "sync") return tierName !== activeTierName;
      return false;
    });

    for (const [tierName, roleId] of rolesToRevoke) {
      try {
        const response = await serviceClient.functions.invoke("discord-revoke-role", {
          body: {
            guild_id: guildId,
            discord_user_id: discordUserId,
            role_id: roleId,
            bot_token: botToken,
          },
        });

        const success = !response.error;
        const errorMessage = response.error?.message;

        results.push({
          action: "revoke",
          tier: tierName,
          role_id: roleId,
          success,
          error: errorMessage ?? undefined,
        });

        await logger.info("discord_sync_role_revoked", {
          guild_id: guildId,
          fan_id: fanId,
          tier: tierName,
          role_id: roleId,
          success,
          error: errorMessage ?? null,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ action: "revoke", tier: tierName, role_id: roleId, success: false, error: message });
        await logger.error("discord_sync_role_revoke_failed", error, {
          tier: tierName,
          role_id: roleId,
          fan_id: fanId,
        });
      }
    }

    if (actionToPerform === "grant") {
      if (!membership || !activeTierName) {
        results.push({
          action: "grant",
          tier: null,
          role_id: "",
          success: false,
          error: "No active membership for grant action",
        });
        await logger.warn("discord_sync_missing_active_membership", { fan_id: fanId, creator_id: creatorId });
      } else {
        const roleId = roleMap[activeTierName];
        if (!roleId) {
          results.push({
            action: "grant",
            tier: activeTierName,
            role_id: "",
            success: false,
            error: "No role mapped for active tier",
          });
          await logger.warn("discord_sync_missing_role_mapping", {
            tier: activeTierName,
            creator_id: creatorId,
          });
        } else {
          try {
            const response = await serviceClient.functions.invoke("discord-grant-role", {
              body: {
                guild_id: guildId,
                discord_user_id: discordUserId,
                role_id: roleId,
                bot_token: botToken,
              },
            });

            const success = !response.error;
            const errorMessage = response.error?.message;

            results.push({
              action: "grant",
              tier: activeTierName,
              role_id: roleId,
              success,
              error: errorMessage ?? undefined,
            });

            await logger.info("discord_sync_role_granted", {
              guild_id: guildId,
              fan_id: fanId,
              tier: activeTierName,
              role_id: roleId,
              success,
              error: errorMessage ?? null,
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            results.push({ action: "grant", tier: activeTierName, role_id: roleId, success: false, error: message });
            await logger.error("discord_sync_role_grant_failed", error, {
              tier: activeTierName,
              role_id: roleId,
              fan_id: fanId,
            });
          }
        }
      }
    }

    const { data: membershipsForOwner, error: membershipListError } = await serviceClient
      .from("memberships")
      .select("id")
      .eq("user_id", fanId)
      .eq("status", "active")
      .eq("membership_tiers.owner_id", ownerId)
      .eq("membership_tiers.owner_type", ownerType)
      .order("updated_at", { ascending: false });

    if (membershipListError) {
      await logger.warn("discord_sync_membership_list_failed", {
        error: membershipListError.message,
        fan_id: fanId,
        creator_id: creatorId,
      });
    }

    const membershipIds = (membershipsForOwner ?? []).map((m: { id: string }) => m.id);
    if (membershipId && !membershipIds.includes(membershipId)) {
      membershipIds.push(membershipId);
    }

    if (membershipIds.length > 0) {
      const hasFailure = results.some((result) => !result.success);
      const syncUpdate = {
        roles_synced_at: hasFailure ? null : new Date().toISOString(),
        sync_error: hasFailure ? results.filter((r) => !r.success).map((r) => r.error).join("; ") : null,
        updated_at: new Date().toISOString(),
      };

      await serviceClient
        .from("membership_discord_tokens")
        .update(syncUpdate)
        .in("membership_id", membershipIds)
        .eq("discord_user_id", discordUserId);
    }

    const successCount = results.filter((r) => r.success).length;
    const failureCount = results.length - successCount;

    await logger.info("discord_sync_summary", {
      creator_id: creatorId,
      fan_id: fanId,
      requested_action: requestedAction,
      resolved_action: actionToPerform,
      success_count: successCount,
      failure_count: failureCount,
      total: results.length,
    });

    return jsonResponse({
      success: failureCount === 0,
      requestedAction,
      resolvedAction: actionToPerform,
      results,
      summary: {
        successful: successCount,
        failed: failureCount,
        total: results.length,
      },
    }, 200);
  } catch (error) {
    await logger.error("discord_sync_unexpected_error", error, {
      creator_id: payload?.creator_id ?? null,
      fan_id: payload?.fan_user_id ?? null,
      requested_action: payload?.action ?? null,
    });
    return jsonResponse({ error: "Unexpected Discord sync error" }, 500);
  }
});

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { RefreshCw, Loader2, Users, ShieldAlert, CheckCircle2, Clock } from "lucide-react";
import { CreatorStudioLayout } from "@/components/CreatorStudio/CreatorStudioLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalStudioContext } from "@/contexts/StudioContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { setMeta } from "@/lib/seo";

type DiscordTokenRow = Database["public"]["Tables"]["membership_discord_tokens"]["Row"] & {
  membership: (Database["public"]["Tables"]["memberships"]["Row"] & {
    tier: Pick<
      Database["public"]["Tables"]["membership_tiers"]["Row"],
      "id" | "name" | "slug" | "owner_id" | "owner_type" | "stripe_sync_status" | "stripe_synced_at"
    >;
  }) | null;
};

type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name" | "username" | "avatar_url"
>;

type TierOption = Pick<
  Database["public"]["Tables"]["membership_tiers"]["Row"],
  "id" | "name" | "status"
>;

const getStatusBadge = (token: DiscordTokenRow) => {
  const now = Date.now();
  const expiresAt = token.expires_at ? Date.parse(token.expires_at) : null;
  const isExpired = Boolean(expiresAt && expiresAt < now);

  if (token.sync_error) {
    return {
      label: "Error",
      className: "bg-destructive/10 text-destructive border-destructive/30",
      icon: ShieldAlert,
    } as const;
  }

  if (isExpired) {
    return {
      label: "Expired",
      className: "bg-amber-500/10 text-amber-500 border-amber-500/30",
      icon: Clock,
    } as const;
  }

  if (token.roles_synced_at) {
    return {
      label: "Active",
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30",
      icon: CheckCircle2,
    } as const;
  }

  return {
    label: "Pending",
    className: "bg-muted text-muted-foreground border-muted",
    icon: Clock,
  } as const;
};

const formatRelative = (value: string | null) => {
  if (!value) return "Never";
  try {
    return `${formatDistanceToNow(new Date(value), { addSuffix: true })}`;
  } catch {
    return value;
  }
};

const statusSummary = (tokens: DiscordTokenRow[]) => {
  const now = Date.now();
  const totals = {
    total: tokens.length,
    active: 0,
    expired: 0,
    errored: 0,
  };
  let lastSync: string | null = null;

  tokens.forEach((token) => {
    if (token.sync_error) {
      totals.errored += 1;
    } else if (token.expires_at && Date.parse(token.expires_at) < now) {
      totals.expired += 1;
    } else if (token.roles_synced_at) {
      totals.active += 1;
    }

    if (token.roles_synced_at) {
      if (!lastSync || Date.parse(token.roles_synced_at) > Date.parse(lastSync)) {
        lastSync = token.roles_synced_at;
      }
    }
  });

  return { ...totals, lastSync };
};

const StudioMembershipDiscordPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const studioContext = useOptionalStudioContext();

  const activeLabel = studioContext?.mode === "label" ? studioContext.activeLabel : null;
  const ownerType: "profile" | "label" | null = activeLabel ? "label" : user ? "profile" : null;
  const ownerId: string | null = activeLabel ? activeLabel.id : user?.id ?? null;
  const requiresLabelSelection = Boolean(studioContext?.mode === "label" && !activeLabel);

  const [tokens, setTokens] = useState<DiscordTokenRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileSummary>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingTokenId, setSyncingTokenId] = useState<string | null>(null);
  const [guildIdInput, setGuildIdInput] = useState("");
  const [roleMappings, setRoleMappings] = useState<Record<string, string>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [tierOptions, setTierOptions] = useState<TierOption[]>([]);

  useEffect(() => {
    setMeta(
      "Discord Membership Sync — Pluggd Studio",
      "Monitor Discord membership tokens, troubleshoot syncs, and keep your community roles up to date.",
      "/dashboard/studio/membership/discord"
    );
  }, []);

  useEffect(() => {
    if (!ownerType || !ownerId || ownerType !== "profile") {
      setGuildIdInput("");
      setRoleMappings({});
      setTierOptions([]);
      setSettingsLoading(false);
      return;
    }

    let isMounted = true;
    const loadSettings = async () => {
      setSettingsLoading(true);
      try {
        const [{ data: profileData, error: profileError }, { data: tierData, error: tierError }] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, discord_guild_id, discord_role_map")
            .eq("id", ownerId)
            .maybeSingle(),
          supabase
            .from("membership_tiers")
            .select("id, name, status")
            .eq("owner_id", ownerId)
            .eq("owner_type", ownerType)
            .order("tier_order", { ascending: true }),
        ]);

        if (profileError) throw profileError;
        if (tierError) throw tierError;

        if (!isMounted) return;

        setGuildIdInput(profileData?.discord_guild_id ?? "");
        const rawMap = (profileData?.discord_role_map as Record<string, string> | null) ?? {};
        const normalisedMap = Object.fromEntries(
          Object.entries(rawMap).map(([tierId, roleId]) => [tierId, roleId ?? ""]),
        );
        setRoleMappings(normalisedMap);
        setTierOptions((tierData as TierOption[]) ?? []);
      } catch (err) {
        console.error("[StudioMembershipDiscord] settings fetch failed", err);
        if (isMounted) {
          setTierOptions([]);
          setGuildIdInput("");
          setRoleMappings({});
        }
      } finally {
        if (isMounted) {
          setSettingsLoading(false);
        }
      }
    };

    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, [ownerId, ownerType]);

  const fetchTokens = useCallback(async () => {
    if (!ownerType || !ownerId) {
      setTokens([]);
      setProfiles({});
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("membership_discord_tokens")
        .select(
          `id, membership_id, discord_user_id, discord_username, expires_at, roles_synced_at, sync_error, created_at, updated_at,
           membership:memberships!inner (
             id,
             user_id,
             status,
             billing_period,
             stripe_subscription_id,
             tier:membership_tiers!inner (
               id,
               name,
               slug,
               owner_id,
               owner_type,
               stripe_sync_status,
               stripe_synced_at
             )
           )`
        )
        .order("roles_synced_at", { ascending: false, nullsLast: false })
        .limit(200);

      if (fetchError) throw fetchError;

      const rows = ((data ?? []) as DiscordTokenRow[]).filter(
        (row) =>
          row.membership?.tier?.owner_type === ownerType && row.membership?.tier?.owner_id === ownerId
      );
      setTokens(rows);

      const fanIds = Array.from(
        new Set(
          rows
            .map((row) => row.membership?.user_id)
            .filter((value): value is string => Boolean(value))
        )
      );

      if (fanIds.length) {
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("id, display_name, username, avatar_url")
          .in("id", fanIds);

        if (profileError) throw profileError;

        const profileMap: Record<string, ProfileSummary> = {};
        (profileRows ?? []).forEach((profile) => {
          profileMap[profile.id] = profile as ProfileSummary;
        });
        setProfiles(profileMap);
      } else {
        setProfiles({});
      }
    } catch (err: any) {
      console.error("[StudioMembershipDiscord] fetch error", err);
      setError(err?.message ?? "Failed to load Discord sync activity.");
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    void fetchTokens();
  }, [fetchTokens]);

  const handleRoleMappingChange = useCallback((tierId: string, value: string) => {
    setRoleMappings((prev) => ({
      ...prev,
      [tierId]: value,
    }));
  }, []);

  const handleSaveSettings = useCallback(async () => {
    if (!ownerId || ownerType !== "profile") return;

    const sanitisedMap = Object.fromEntries(
      Object.entries(roleMappings)
        .map(([tierId, roleId]) => [tierId, roleId.trim()])
        .filter(([, roleId]) => Boolean(roleId)),
    );

    setSettingsSaving(true);
    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          discord_guild_id: guildIdInput.trim() || null,
          discord_role_map: Object.keys(sanitisedMap).length ? sanitisedMap : null,
        })
        .eq("id", ownerId);

      if (updateError) throw updateError;

      toast({
        title: "Discord settings saved",
        description: "Guild and role mapping updated successfully.",
      });
    } catch (err: any) {
      console.error("[StudioMembershipDiscord] save settings error", err);
      toast({
        title: "Unable to save settings",
        description: err?.message ?? "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSettingsSaving(false);
    }
  }, [guildIdInput, ownerId, ownerType, roleMappings, toast]);

  const handleSyncToken = useCallback(
    async (token: DiscordTokenRow) => {
      if (!ownerType || !ownerId) return;

      if (ownerType !== "profile") {
        toast({
          title: "Manual sync unavailable",
          description: "Discord automation currently supports creator workspaces. Switch to a profile to trigger manual sync.",
          variant: "destructive",
        });
        return;
      }

      if (!token.membership?.user_id) {
        toast({
          title: "Missing fan account",
          description: "We could not identify the fan for this membership. Wait for the next automatic sync.",
          variant: "destructive",
        });
        return;
      }

      setSyncingTokenId(token.id);
      try {
        const { error: invokeError } = await supabase.functions.invoke("discord-sync-subscriber", {
          body: {
            creator_id: ownerId,
            fan_user_id: token.membership.user_id,
            action: "sync",
          },
        });

        if (invokeError) {
          throw new Error(invokeError.message ?? "Unable to trigger Discord sync");
        }

        toast({
          title: "Sync started",
          description: `Requested Discord role sync for ${token.discord_username ?? token.discord_user_id}.`,
        });
        await fetchTokens();
      } catch (err: any) {
        console.error("[StudioMembershipDiscord] manual sync error", err);
        toast({
          title: "Discord sync failed",
          description: err?.message ?? "Unable to run Discord sync right now.",
          variant: "destructive",
        });
      } finally {
        setSyncingTokenId(null);
      }
    },
    [fetchTokens, ownerId, ownerType, toast]
  );

  const handleSyncAll = useCallback(async () => {
    if (!ownerType || !ownerId) return;

    if (ownerType !== "profile") {
      toast({
        title: "Manual sync unavailable",
        description: "Switch to a creator workspace to trigger Discord syncs manually.",
        variant: "destructive",
      });
      return;
    }

    const eligible = tokens.filter((token) => token.membership?.user_id);
    if (!eligible.length) {
      toast({ title: "Nothing to sync", description: "All Discord roles are up to date." });
      return;
    }

    setSyncingAll(true);
    try {
      for (const token of eligible) {
        const { error: invokeError } = await supabase.functions.invoke("discord-sync-subscriber", {
          body: {
            creator_id: ownerId,
            fan_user_id: token.membership!.user_id,
            action: "sync",
          },
        });

        if (invokeError) {
          throw new Error(invokeError.message ?? "Unable to trigger Discord sync");
        }
      }

      toast({
        title: "Sync queued",
        description: `Requested Discord sync for ${eligible.length} supporter${eligible.length === 1 ? "" : "s"}.`,
      });
      await fetchTokens();
    } catch (err: any) {
      console.error("[StudioMembershipDiscord] bulk sync error", err);
      toast({
        title: "Discord sync failed",
        description: err?.message ?? "Unable to run the bulk sync right now.",
        variant: "destructive",
      });
    } finally {
      setSyncingAll(false);
    }
  }, [fetchTokens, ownerId, ownerType, toast, tokens]);

  const metrics = useMemo(() => statusSummary(tokens), [tokens]);

  if (requiresLabelSelection) {
    return (
      <CreatorStudioLayout>
        <div className="px-4 pb-10">
          <Card>
            <CardHeader>
              <CardTitle>Select a label workspace</CardTitle>
              <CardDescription>Choose a label from the Studio header to manage its Discord membership sync.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </CreatorStudioLayout>
    );
  }

  if (!ownerType || !ownerId) {
    return (
      <CreatorStudioLayout>
        <div className="px-4 pb-10">
          <Card>
            <CardHeader>
              <CardTitle>Sign in to manage Discord sync</CardTitle>
              <CardDescription>Sign in or switch to your creator profile to view membership-linked Discord activity.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </CreatorStudioLayout>
    );
  }

  return (
    <CreatorStudioLayout>
      <div className="space-y-8 px-4 pb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Discord Role Sync</h1>
            <p className="text-muted-foreground">
              Track membership-linked Discord access and trigger manual syncs for your supporters.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fetchTokens()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
            <Button onClick={() => handleSyncAll()} disabled={syncingAll || loading || tokens.length === 0}>
              {syncingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}
              Sync active members
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Unable to load Discord sync status</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total linked supporters</CardDescription>
              <CardTitle className="text-3xl">{metrics.total}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Discord tokens created for your memberships.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active roles</CardDescription>
              <CardTitle className="text-3xl text-emerald-500">{metrics.active}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Supporters with an up-to-date Discord role.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Errored tokens</CardDescription>
              <CardTitle className="text-3xl text-destructive">{metrics.errored}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Failed sync attempts needing manual attention.
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Last successful sync</CardDescription>
              <CardTitle className="text-xl">
                {metrics.lastSync ? formatRelative(metrics.lastSync) : "No successful sync yet"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm text-muted-foreground">
              Automatic sync runs every few minutes.
            </CardContent>
          </Card>
        </div>

        {ownerType === "profile" ? (
          <Card>
            <CardHeader>
              <CardTitle>Discord server settings</CardTitle>
              <CardDescription>Link your guild and map membership tiers to Discord role IDs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="discord-guild-id">Discord server ID</Label>
                      <Input
                        id="discord-guild-id"
                        value={guildIdInput}
                        onChange={(event) => setGuildIdInput(event.target.value)}
                        placeholder="123456789012345678"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enable developer mode in Discord → Right click your server name → Copy Server ID.
                      </p>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p className="font-medium">Need help?</p>
                      <p>
                        Invite the Pluggd bot to your guild, ensure it has “Manage Roles”, and keep its role above the ones you want to
                        assign. Mapping a tier below lets us grant the right role automatically after checkout.
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Membership tier role mapping</Label>
                        <p className="text-xs text-muted-foreground">
                          Optional. Provide the Discord role ID for each tier to grant on successful sync.
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setRoleMappings({})}
                        disabled={settingsSaving || Object.keys(roleMappings).length === 0}
                      >
                        Clear mappings
                      </Button>
                    </div>

                    {tierOptions.filter((tier) => tier.status === "active").length === 0 ? (
                      <p className="text-xs text-muted-foreground">Publish a membership tier to configure role mapping.</p>
                    ) : (
                      <div className="space-y-3">
                        {tierOptions
                          .filter((tier) => tier.status === "active")
                          .map((tier) => (
                            <div key={tier.id} className="space-y-1">
                              <Label htmlFor={`role-${tier.id}`} className="text-sm font-medium">
                                {tier.name}
                              </Label>
                              <Input
                                id={`role-${tier.id}`}
                                placeholder="Discord role ID"
                                value={roleMappings[tier.id] ?? ""}
                                onChange={(event) => handleRoleMappingChange(tier.id, event.target.value)}
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={handleSaveSettings} disabled={settingsSaving}>
                      {settingsSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Save settings
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <AlertTitle>Discord settings are read-only in label workspaces</AlertTitle>
            <AlertDescription>
              Switch to a creator profile to configure guild IDs and role mappings. You can still view token activity below.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Discord access tokens</CardTitle>
            <CardDescription>
              Each supporter generates a token when they connect Discord. Tokens are refreshed automatically by webhook events.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[0, 1, 2, 3, 4].map((index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : tokens.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center text-muted-foreground">
                <Users className="h-10 w-10" />
                <div>
                  <p className="font-medium text-foreground">No supporters connected yet</p>
                  <p className="text-sm">Ask your members to link Discord from their profile to unlock automatic role syncs.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supporter</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Discord</TableHead>
                      <TableHead>Last synced</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tokens.map((token) => {
                      const membership = token.membership;
                      const tier = membership?.tier;
                      const fanProfile = membership?.user_id ? profiles[membership.user_id] : undefined;
                      const badge = getStatusBadge(token);
                      const StatusIcon = badge.icon;

                      return (
                        <TableRow key={token.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {fanProfile?.display_name || fanProfile?.username || membership?.user_id || "Unknown supporter"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {membership?.status ? membership.status.replace(/_/g, " ") : "membership"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{tier?.name ?? "Unknown tier"}</span>
                              <span className="text-xs text-muted-foreground">
                                {tier?.stripe_sync_status === "synced"
                                  ? `Synced ${tier?.stripe_synced_at ? formatRelative(tier.stripe_synced_at) : "recently"}`
                                  : `Stripe sync: ${tier?.stripe_sync_status ?? "pending"}`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{token.discord_username ?? "Unnamed user"}</span>
                              <span className="text-xs text-muted-foreground">{token.discord_user_id}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span>{formatRelative(token.roles_synced_at)}</span>
                              <span className="text-xs text-muted-foreground">
                                Expires {formatRelative(token.expires_at)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("flex items-center gap-1 border", badge.className)}>
                              <StatusIcon className="h-3 w-3" />
                              {badge.label}
                            </Badge>
                            {token.sync_error && (
                              <span className="mt-1 block text-xs text-destructive">
                                {token.sync_error}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleSyncToken(token)}
                              disabled={syncingTokenId === token.id || syncingAll || ownerType !== "profile"}
                            >
                              {syncingTokenId === token.id ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                              )}
                              Sync
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </CreatorStudioLayout>
  );
};

export default StudioMembershipDiscordPage;

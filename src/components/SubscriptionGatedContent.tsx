import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ContentGateType, ContentType } from "@/types/memberships";
import { logger } from "@/lib/logger";
import { cn, formatCurrency } from "@/lib/utils";
import { fetchMembershipAccessRules } from "@/services/memberships/accessRules";

type OwnerType = "profile" | "label";

type GateRecord = Awaited<ReturnType<typeof fetchMembershipAccessRules>>;

interface TierSummary {
  id: string;
  name: string;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string | null;
}

interface SubscriptionGatedContentProps {
  children: ReactNode;
  contentId: string;
  contentType: ContentType;
  creatorId: string;
  ctaHref?: string;
  ctaLabel?: string;
  fallbackText?: string;
  previewContent?: ReactNode;
  className?: string;
  minimalWrapper?: boolean;
}

const formatTierPrice = (tier: TierSummary | null) => {
  if (!tier) return null;
  const price = tier.price_monthly ?? tier.price_yearly ?? tier.price_lifetime;
  if (price == null) return null;
  const normalised = price > 1000 ? price / 100 : price;
  return formatCurrency(normalised, tier.currency ?? "USD");
};

export const SubscriptionGatedContent = ({
  children,
  contentId,
  contentType,
  creatorId,
  ctaHref,
  ctaLabel = "Unlock with Membership",
  fallbackText = "This content is exclusive to supporters",
  previewContent,
  className,
  minimalWrapper = false,
}: SubscriptionGatedContentProps) => {
  const { user } = useAuth();
  const [gateConfig, setGateConfig] = useState<GateRecord | undefined>(undefined);
  const [tiers, setTiers] = useState<TierSummary[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(false);
  const [impressionLogged, setImpressionLogged] = useState(false);
  const [unlockLogged, setUnlockLogged] = useState(false);
  const [denialLogged, setDenialLogged] = useState(false);

  // Fetch gate configuration for the content
  useEffect(() => {
    let isMounted = true;
    const loadGate = async () => {
      if (!contentId) {
        setGateConfig(null);
        return;
      }

      try {
        const rule = await fetchMembershipAccessRules(contentType, contentId);

        if (!isMounted) return;

        setGateConfig(rule ?? null);
      } catch (error: any) {
        if (!isMounted) return;
        console.error("Unexpected error loading gate configuration", error);
        void logger.error("gate_config_load_failed", {
          contentId,
          contentType,
          error: error?.message ?? String(error),
        });
        setGateConfig(null);
      }
    };

    loadGate();

    return () => {
      isMounted = false;
    };
  }, [contentId, contentType]);

  const tierOwnerKey = useMemo(() => {
    if (!gateConfig?.owner_id || !gateConfig.owner_type) return null;
    return `${gateConfig.owner_type}:${gateConfig.owner_id}`;
  }, [gateConfig?.owner_id, gateConfig?.owner_type]);

  // Fetch tier metadata for messaging purposes
  useEffect(() => {
    let active = true;
    const loadTiers = async () => {
    if (!gateConfig || !gateConfig.owner_id || !gateConfig.owner_type) {
      if (active) setTiers([]);
      return;
    }

      const { data, error } = await supabase
        .from("membership_tiers")
        .select("id, name, tier_order, price_monthly, price_yearly, price_lifetime, currency")
        .eq("owner_id", gateConfig.owner_id)
        .eq("owner_type", gateConfig.owner_type)
        .eq("status", "active")
        .order("tier_order", { ascending: true });

      if (!active) return;

      if (error) {
        console.error("Failed to load membership tiers", error);
        void logger.warn("membership_tier_lookup_failed", {
          contentId,
          contentType,
          ownerId: gateConfig.owner_id,
          ownerType: gateConfig.owner_type,
          error: error.message,
        });
        setTiers([]);
        return;
      }

      setTiers(data ?? []);
    };

    loadTiers();

    return () => {
      active = false;
    };
  }, [tierOwnerKey, gateConfig, contentId, contentType]);

  const allowedTierNames = useMemo(() => {
    if (!gateConfig) return [] as string[];
    if (gateConfig.allowed_tier_ids && gateConfig.allowed_tier_ids.length > 0) {
      const map = new Map(tiers.map((tier) => [tier.id, tier.name] as const));
      return gateConfig.allowed_tier_ids.map((id) => map.get(id)).filter(Boolean) as string[];
    }
    return [];
  }, [gateConfig, tiers]);

  const minimumTier = useMemo(() => {
    if (!gateConfig?.minimum_tier_id) return null;
    return tiers.find((tier) => tier.id === gateConfig.minimum_tier_id) ?? null;
  }, [gateConfig?.minimum_tier_id, tiers]);

  const requirementDescription = useMemo(() => {
    if (!gateConfig) return null;

    const formatTierList = (names: string[]) => {
      if (names.length === 0) return null;
      if (names.length === 1) return names[0];
      return `${names.slice(0, -1).join(", ")} or ${names.slice(-1)}`;
    };

    switch (gateConfig.gate_type) {
      case "any_tier":
        return "Join any active membership tier to unlock this content.";
      case "specific_tier": {
        const list = formatTierList(allowedTierNames);
        return list ? `Unlock with the ${list} membership.` : "Unlock with the required membership tier.";
      }
      case "tier_or_higher": {
        const price = formatTierPrice(minimumTier);
        const base = minimumTier ? `Unlock with the ${minimumTier.name} tier or higher.` : "Unlock with the required membership tier or higher.";
        return price ? `${base} Starts at ${price}.` : base;
      }
      default:
        return null;
    }
  }, [allowedTierNames, gateConfig, minimumTier]);

  const gateKey = useMemo(() => {
    if (!gateConfig) return null;
    return [
      gateConfig.gate_type,
      gateConfig.minimum_tier_id ?? "",
      (gateConfig.allowed_tier_ids ?? []).join("|"),
    ].join(":");
  }, [gateConfig]);

  const checkAccess = useCallback(async () => {
    if (!gateConfig || !user?.id) return;

    setCheckingAccess(true);
    const started = performance.now();

    const { data, error } = await supabase.rpc("check_content_access", {
      p_content_id: contentId,
      p_content_type: contentType,
      p_user_id: user.id,
    });

    const duration = performance.now() - started;
    void logger.apiCall(
      "rpc",
      "check_content_access",
      duration,
      error ? 500 : 200,
      {
        contentId,
        contentType,
        gateType: gateConfig.gate_type,
      }
    );

    if (error) {
      console.error("Failed to verify gated content access", error);
      void logger.error("gate_access_check_failed", {
        contentId,
        contentType,
        gateType: gateConfig.gate_type,
        error: error.message,
      });
      setHasAccess(false);
    } else {
      setHasAccess(Boolean(data));
    }

    setCheckingAccess(false);
  }, [gateConfig, user?.id, contentId, contentType]);

  // Run initial access check
  useEffect(() => {
    if (gateConfig === undefined) return;

    if (gateConfig === null) {
      setHasAccess(true);
      setCheckingAccess(false);
      return;
    }

    if (!user?.id) {
      setHasAccess(false);
      setCheckingAccess(false);
      return;
    }

    checkAccess();
  }, [gateConfig, user?.id, checkAccess]);

  // Subscribe to realtime membership changes
  useEffect(() => {
    if (!user?.id || !gateConfig) return;

    const channel = supabase
      .channel(`membership-gate-${contentType}-${contentId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "memberships",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          checkAccess();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fan_subscriptions",
          filter: `fan_id=eq.${user.id}`,
        },
        () => {
          checkAccess();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, gateConfig, checkAccess, contentId, contentType, gateKey]);

  // Log impressions and unlocks for analytics/system logs
  useEffect(() => {
    if (!gateConfig || checkingAccess) return;
    if (hasAccess || impressionLogged) return;

    void logger.info("membership_gate_impression", {
      contentId,
      contentType,
      gateType: gateConfig.gate_type,
      ownerId: gateConfig.owner_id,
      ownerType: gateConfig.owner_type,
      viewerId: user?.id,
    });
    setImpressionLogged(true);
  }, [gateConfig, hasAccess, impressionLogged, checkingAccess, contentId, contentType, user?.id]);

  useEffect(() => {
    if (!gateConfig || !hasAccess || unlockLogged) return;

    void logger.info("membership_gate_unlocked", {
      contentId,
      contentType,
      gateType: gateConfig.gate_type,
      ownerId: gateConfig.owner_id,
      ownerType: gateConfig.owner_type,
      viewerId: user?.id,
    });
    setUnlockLogged(true);
  }, [gateConfig, hasAccess, unlockLogged, contentId, contentType, user?.id]);

  useEffect(() => {
    if (!gateConfig || checkingAccess) return;
    if (hasAccess || denialLogged) return;

    void logger.userAction("membership_gate_denied", "SubscriptionGatedContent", {
      contentId,
      contentType,
      gateType: gateConfig.gate_type,
      ownerId: gateConfig.owner_id,
      ownerType: gateConfig.owner_type,
      viewerId: user?.id,
    });
    setDenialLogged(true);
  }, [gateConfig, hasAccess, checkingAccess, denialLogged, contentId, contentType, user?.id]);

  useEffect(() => {
    if (gateConfig === null) {
      setDenialLogged(false);
      setImpressionLogged(false);
      setUnlockLogged(false);
    }
  }, [gateConfig]);

  useEffect(() => {
    if (hasAccess) {
      setDenialLogged(false);
    }
  }, [hasAccess]);

  const isLoading = gateConfig === undefined || (gateConfig !== null && checkingAccess);
  const gateActive = gateConfig !== null;
  const locked = gateActive && !hasAccess;
  const overlayDescription = gateConfig?.preview_text || fallbackText;
  const finalCtaHref = ctaHref || `/creator/${creatorId}#membership`;

  if (!gateActive) {
    return <div className={className}>{children}</div>;
  }

  if (isLoading) {
    if (minimalWrapper) {
      return (
        <div className={cn("flex items-center justify-center gap-3 py-6 text-sm text-muted-foreground", className)}>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Checking your membership status…</span>
        </div>
      );
    }

    return (
      <Card className={cn("flex items-center justify-center py-12", className)}>
        <CardContent className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Checking your membership status…</span>
        </CardContent>
      </Card>
    );
  }

  const handleJoinClick = () => {
    if (typeof window === "undefined") return;
    window.location.href = finalCtaHref;
  };

  const handleSignIn = () => {
    if (typeof window === "undefined") return;
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/auth?redirect=${redirect}`;
  };

  const previewSection = locked && previewContent ? (
    <Card className="border-dashed border-primary/30 bg-muted/40">
      <CardContent className="space-y-3 p-6">
        <div className="text-xs font-semibold uppercase tracking-wide text-primary">Preview</div>
        {gateConfig?.preview_text && (
          <p className="text-sm text-muted-foreground">{gateConfig.preview_text}</p>
        )}
        <div>{previewContent}</div>
      </CardContent>
    </Card>
  ) : null;

  const wrapperClass = minimalWrapper
    ? "relative"
    : "relative overflow-hidden rounded-xl border border-muted bg-card";

  return (
    <div className={cn(minimalWrapper ? "space-y-3" : "space-y-4", className)}>
      <div className={wrapperClass}>
        <div
          className={cn(
            "transition-all duration-300",
            locked ? "pointer-events-none select-none blur-sm" : ""
          )}
        >
          {children}
        </div>

        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/80 p-6 text-center backdrop-blur-sm">
            <div className="flex items-center justify-center rounded-full bg-primary/10 p-3">
              {gateConfig?.gate_type === "specific_tier" ? (
                <Crown className="h-8 w-8 text-primary" />
              ) : (
                <Lock className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="space-y-2 max-w-md">
              <h3 className="text-lg font-semibold">Exclusive supporter content</h3>
              <p className="text-sm text-muted-foreground">{overlayDescription}</p>
              {requirementDescription && (
                <p className="text-xs text-muted-foreground">{requirementDescription}</p>
              )}
            </div>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button onClick={handleJoinClick} size="lg" className="min-w-[180px]">
                {ctaLabel}
              </Button>
              {!user?.id && (
                <Button variant="outline" onClick={handleSignIn} size="lg">
                  Sign in to continue
                </Button>
              )}
              {user?.id && (
                <Button
                  variant="outline"
                  onClick={checkAccess}
                  size="lg"
                  disabled={checkingAccess}
                >
                  {checkingAccess ? "Rechecking…" : "Refresh access"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {previewSection}
    </div>
  );
};
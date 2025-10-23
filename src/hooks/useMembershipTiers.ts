import { useCallback, useEffect, useMemo, useState } from "react";
import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalStudioContext } from "@/contexts/StudioContext";
import { useLogger } from "@/hooks/useLogger";

type OwnerType = "profile" | "label";

type TierStatus = "draft" | "active" | "archived" | string;

type BillingPeriod = "monthly" | "yearly" | "lifetime" | string;

export interface MembershipTier {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string;
  status: TierStatus;
  max_members: number | null;
  current_members: number;
  color: string | null;
  emoji: string | null;
  image_url: string | null;
  features: string[];
  created_at: string;
  updated_at: string;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  stripe_price_lifetime_id: string | null;
  stripe_synced_at: string | null;
  stripe_sync_status: string | null;
  stripe_sync_error: string | null;
}

export interface UpsertMembershipTierInput {
  name: string;
  description?: string;
  priceMonthly?: number | null;
  priceYearly?: number | null;
  priceLifetime?: number | null;
  currency?: string;
  status?: TierStatus;
  features?: string[];
  color?: string | null;
  emoji?: string | null;
  maxMembers?: number | null;
  imageUrl?: string | null;
  order?: number;
}

export interface MembershipTiersHook {
  tiers: MembershipTier[];
  loading: boolean;
  mutating: boolean;
  error: string | null;
  ownerType: OwnerType | null;
  ownerId: string | null;
  requiresLabelSelection: boolean;
  createTier: (input: UpsertMembershipTierInput) => Promise<void>;
  updateTier: (tierId: string, input: UpsertMembershipTierInput) => Promise<void>;
  deleteTier: (tierId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64) || "tier";

const withRandomSuffix = (slug: string) => `${slug}-${Math.random().toString(36).slice(-4)}`;

interface MembershipTierError extends Error {
  code?: string;
  slug?: string | null;
  original?: unknown;
}

const parseErrorDetails = (details?: string | null): Record<string, unknown> | null => {
  if (!details || typeof details !== "string") {
    return null;
  }

  try {
    return JSON.parse(details);
  } catch (_error) {
    if (typeof details === "string" && details.startsWith("{")) {
      return null;
    }
    return null;
  }
};

const friendlyMessageForCode = (code: string): string | null => {
  switch (code) {
    case "duplicate_slug":
      return "A membership tier with this slug already exists.";
    case "tier_has_members":
      return "You need to move or cancel existing members before deleting this tier.";
    case "not_authorised":
      return "You don't have permission to manage this membership tier.";
    case "not_authenticated":
      return "You need to sign in to manage membership tiers.";
    case "invalid_owner_id":
    case "invalid_owner_type":
      return "The selected owner is invalid.";
    case "invalid_price_monthly":
    case "invalid_price_yearly":
    case "invalid_price_lifetime":
    case "invalid_price_format":
      return "One or more prices are invalid. Please enter whole cents.";
    case "invalid_currency":
      return "Currency must be a valid three-letter ISO code.";
    case "invalid_features":
      return "Features must be provided as a list of strings.";
    case "invalid_max_members":
      return "Maximum members must be zero or a positive number.";
    case "invalid_tier_order":
      return "Tier order must be a number.";
    case "invalid_slug":
      return "Tier slug must include letters or numbers.";
    case "name_required":
      return "Please provide a tier name.";
    case "tier_not_found":
      return "This membership tier could not be found.";
    default:
      return null;
  }
};

const normaliseTierError = (err: unknown): MembershipTierError => {
  if (err && typeof err === "object" && "message" in err) {
    const supabaseError = err as PostgrestError & { details?: string | null };
    const detailPayload = parseErrorDetails(supabaseError.details) ?? {};
    const code = String(
      (detailPayload.code as string | undefined) ??
        supabaseError.message ??
        supabaseError.code ??
        "unknown_error"
    );

    const message =
      friendlyMessageForCode(code) ??
      (typeof supabaseError.hint === "string" && supabaseError.hint.trim() ? supabaseError.hint : null) ??
      (typeof supabaseError.message === "string" && supabaseError.message.trim()
        ? supabaseError.message
        : "Unexpected error");

    const error: MembershipTierError = new Error(message);
    error.code = code;
    error.slug = typeof detailPayload.slug === "string" ? detailPayload.slug : null;
    error.original = err;
    return error;
  }

  if (err instanceof Error) {
    return err;
  }

  const fallback: MembershipTierError = new Error("Unexpected error");
  fallback.code = "unknown_error";
  fallback.original = err;
  return fallback;
};

const centsFromAmount = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(0, Math.round(value * 100));
};

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

const normaliseFeatures = (value: any): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => typeof item === "string" && item.trim().length > 0);
      }
    } catch {
      /* ignore */
    }
  }

  return [];
};

const mapTier = (row: any): MembershipTier => ({
  id: row.id,
  owner_type: row.owner_type,
  owner_id: row.owner_id,
  name: row.name,
  slug: row.slug,
  description: row.description ?? null,
  tier_order: row.tier_order ?? 0,
  price_monthly: row.price_monthly ?? null,
  price_yearly: row.price_yearly ?? null,
  price_lifetime: row.price_lifetime ?? null,
  currency: row.currency ?? "USD",
  status: row.status ?? "active",
  max_members: row.max_members ?? null,
  current_members: row.current_members ?? 0,
  color: row.color ?? null,
  emoji: row.emoji ?? null,
  image_url: row.image_url ?? null,
  features: normaliseFeatures(row.features),
  created_at: row.created_at,
  updated_at: row.updated_at,
  stripe_product_id: row.stripe_product_id ?? null,
  stripe_price_monthly_id: row.stripe_price_monthly_id ?? null,
  stripe_price_yearly_id: row.stripe_price_yearly_id ?? null,
  stripe_price_lifetime_id: row.stripe_price_lifetime_id ?? null,
  stripe_synced_at: row.stripe_synced_at ?? null,
  stripe_sync_status: row.stripe_sync_status ?? null,
  stripe_sync_error: row.stripe_sync_error ?? null,
});

type TierInsertPayload = {
  owner_type: OwnerType;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string;
  status: TierStatus;
  features: string[];
  color: string | null;
  emoji: string | null;
  max_members: number | null;
  image_url: string | null;
};

const buildOptimisticTier = (
  id: string,
  payload: TierInsertPayload
): MembershipTier => {
  const timestamp = new Date().toISOString();
  return {
    id,
    owner_type: payload.owner_type,
    owner_id: payload.owner_id,
    name: payload.name,
    slug: payload.slug,
    description: payload.description,
    tier_order: payload.tier_order,
    price_monthly: payload.price_monthly,
    price_yearly: payload.price_yearly,
    price_lifetime: payload.price_lifetime,
    currency: payload.currency,
    status: payload.status,
    max_members: payload.max_members,
    current_members: 0,
    color: payload.color,
    emoji: payload.emoji,
    image_url: payload.image_url,
    features: payload.features,
    created_at: timestamp,
    updated_at: timestamp,
    stripe_product_id: null,
    stripe_price_monthly_id: null,
    stripe_price_yearly_id: null,
    stripe_price_lifetime_id: null,
    stripe_synced_at: null,
    stripe_sync_status: "pending",
    stripe_sync_error: null,
  };
};

export function useMembershipTiers(): MembershipTiersHook {
  const { user, loading: authLoading } = useAuth();
  const studioContext = useOptionalStudioContext();

  const activeLabel = studioContext?.mode === "label" ? studioContext.activeLabel : null;
  const ownerType: OwnerType | null = activeLabel ? "label" : user ? "profile" : null;
  const ownerId: string | null = activeLabel ? activeLabel.id : user?.id ?? null;

  const loggerMetadata = useMemo(() => ({ ownerType, ownerId }), [ownerType, ownerId]);
  const { logger: membershipLogger, logUserAction } = useLogger({
    component: 'useMembershipTiers',
    feature: 'membership',
    metadata: loggerMetadata,
  });

  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiresLabelSelection = Boolean(studioContext?.mode === "label" && !activeLabel);

  const fetchTiers = useCallback(async () => {
    if (authLoading) return;

    if (!ownerType || !ownerId) {
      setTiers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    void membershipLogger.info("membership_tiers_fetch_start", {
      owner_type: ownerType,
      owner_id: ownerId,
    });

    const { data, error } = await supabase
      .from("membership_tiers")
      .select("*")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
      .order("tier_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      const normalisedError = normaliseTierError(error);
      setError(normalisedError.message);
      setTiers([]);
      setLoading(false);
      void membershipLogger.error(
        "membership_tiers_fetch_failed",
        {
          owner_type: ownerType,
          owner_id: ownerId,
        },
        toError(error)
      );
      return;
    }

    setTiers((data ?? []).map(mapTier));
    setLoading(false);
    void membershipLogger.info("membership_tiers_fetch_success", {
      owner_type: ownerType,
      owner_id: ownerId,
      tier_count: data?.length ?? 0,
    });
  }, [authLoading, ownerId, ownerType]);

  useEffect(() => {
    if (!authLoading) {
      fetchTiers();
    }
  }, [authLoading, fetchTiers]);

  const refresh = useCallback(async () => {
    await fetchTiers();
  }, [fetchTiers]);

  const runMutation = useCallback(
    async (fn: () => Promise<void>) => {
      if (!ownerType || !ownerId) {
        throw new Error("You need an active label or creator profile to manage tiers.");
      }

      setMutating(true);
      setError(null);

      try {
        await fn();
        await fetchTiers();
      } catch (err: unknown) {
        const normalised = normaliseTierError(err);
        setError(normalised.message ?? "Unexpected error");
        throw normalised;
      } finally {
        setMutating(false);
      }
    },
    [fetchTiers, ownerId, ownerType]
  );

  const createTier = useCallback(
    async (input: UpsertMembershipTierInput) => {
      if (!ownerType || !ownerId) {
        throw new Error("You need an active label or creator profile to manage tiers.");
      }

      const order = typeof input.order === "number" ? input.order : tiers.length;
      const payload: TierInsertPayload = {
        owner_type: ownerType!,
        owner_id: ownerId!,
        name: input.name.trim(),
        slug: withRandomSuffix(slugify(input.name.trim())),
        description: input.description?.trim() || null,
        tier_order: order,
        price_monthly: centsFromAmount(input.priceMonthly),
        price_yearly: centsFromAmount(input.priceYearly),
        price_lifetime: centsFromAmount(input.priceLifetime),
        currency: input.currency || "USD",
        status: (input.status || "active") as TierStatus,
        features: input.features && input.features.length ? input.features : [],
        color: input.color || null,
        emoji: input.emoji || null,
        max_members: input.maxMembers ?? null,
        image_url: input.imageUrl || null,
      };

      void logUserAction("membership_tier_create_attempt", {
        owner_type: ownerType,
        owner_id: ownerId,
        input_name: input.name,
      });

      try {
        await runMutation(async () => {
          const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(-6)}`;
          const optimisticTier = buildOptimisticTier(optimisticId, payload);

          setTiers((prev) => [...prev, optimisticTier]);

          try {
            const { data, error } = await supabase.rpc("create_membership_tier", {
              p_input: payload,
            });
            if (error) throw error;

            if (data) {
              setTiers((prev) =>
                prev.map((tier) => (tier.id === optimisticId ? mapTier(data) : tier))
              );
            }
          } catch (err) {
            setTiers((prev) => prev.filter((tier) => tier.id !== optimisticId));
            throw err;
          }
        });

        void membershipLogger.info("membership_tier_create_success", {
          owner_type: ownerType,
          owner_id: ownerId,
          input_name: input.name,
        });
      } catch (err) {
        void membershipLogger.error("membership_tier_create_failed", {
          owner_type: ownerType,
          owner_id: ownerId,
          input_name: input.name,
        }, toError(err));
        throw err;
      }
    },
    [ownerId, ownerType, runMutation, tiers.length]
  );

  const updateTier = useCallback(
    async (tierId: string, input: UpsertMembershipTierInput) => {
      const existing = tiers.find((tier) => tier.id === tierId);
      if (!existing) {
        throw new Error("Membership tier not found");
      }

      const payload: Record<string, any> = {
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        price_monthly: centsFromAmount(input.priceMonthly),
        price_yearly: centsFromAmount(input.priceYearly),
        price_lifetime: centsFromAmount(input.priceLifetime),
        currency: input.currency || "USD",
        status: (input.status || "active") as TierStatus,
        features: input.features && input.features.length ? input.features : [],
        color: input.color || null,
        emoji: input.emoji || null,
        max_members: input.maxMembers ?? null,
        image_url: input.imageUrl || null,
      };

      if (typeof input.order === "number") {
        payload.tier_order = input.order;
      }

      void logUserAction("membership_tier_update_attempt", {
        tier_id: tierId,
        owner_type: existing.owner_type,
        owner_id: existing.owner_id,
      });

      try {
        await runMutation(async () => {
          const optimisticTier: MembershipTier = {
            ...existing,
            name: payload.name,
            description: payload.description,
            price_monthly: payload.price_monthly,
            price_yearly: payload.price_yearly,
            price_lifetime: payload.price_lifetime,
            currency: payload.currency,
            status: payload.status,
            features: payload.features,
            color: payload.color,
            emoji: payload.emoji,
            max_members: payload.max_members,
            image_url: payload.image_url,
            tier_order: payload.tier_order ?? existing.tier_order,
            updated_at: new Date().toISOString(),
          };

          setTiers((prev) =>
            prev.map((tier) => (tier.id === tierId ? optimisticTier : tier))
          );

          try {
            const { data, error } = await supabase.rpc("update_membership_tier", {
              p_tier_id: tierId,
              p_input: payload,
            });
            if (error) throw error;

            if (data) {
              setTiers((prev) =>
                prev.map((tier) => (tier.id === tierId ? mapTier(data) : tier))
              );
            }
          } catch (err) {
            setTiers((prev) =>
              prev.map((tier) => (tier.id === tierId ? existing : tier))
            );
            throw err;
          }
        });

        void membershipLogger.info("membership_tier_update_success", {
          tier_id: tierId,
          owner_type: existing.owner_type,
          owner_id: existing.owner_id,
        });
      } catch (err) {
        void membershipLogger.error("membership_tier_update_failed", {
          tier_id: tierId,
          owner_type: existing.owner_type,
          owner_id: existing.owner_id,
        }, toError(err));
        throw err;
      }
    },
    [runMutation, tiers]
  );

  const deleteTier = useCallback(
    async (tierId: string) => {
      const existing = tiers.find((tier) => tier.id === tierId);
      if (!existing) {
        throw new Error("Membership tier not found");
      }

      const previousTiers = tiers.slice();

      void logUserAction("membership_tier_delete_attempt", {
        tier_id: tierId,
        owner_type: existing.owner_type,
        owner_id: existing.owner_id,
      });

      try {
        await runMutation(async () => {
          setTiers((prev) => prev.filter((tier) => tier.id !== tierId));

          try {
            const { error } = await supabase.rpc("delete_membership_tier", {
              p_tier_id: tierId,
            });
            if (error) throw error;
          } catch (err) {
            setTiers(previousTiers);
            throw err;
          }
        });

        void membershipLogger.info("membership_tier_delete_success", {
          tier_id: tierId,
          owner_type: existing.owner_type,
          owner_id: existing.owner_id,
        });
      } catch (err) {
        void membershipLogger.error("membership_tier_delete_failed", {
          tier_id: tierId,
          owner_type: existing.owner_type,
          owner_id: existing.owner_id,
        }, toError(err));
        throw err;
      }
    },
    [runMutation, tiers]
  );

  return useMemo(
    () => ({
      tiers,
      loading,
      mutating,
      error,
      ownerType,
      ownerId,
      requiresLabelSelection,
      createTier,
      updateTier,
      deleteTier,
      refresh,
    }),
    [createTier, deleteTier, error, loading, mutating, ownerId, ownerType, refresh, requiresLabelSelection, tiers, updateTier]
  );
}

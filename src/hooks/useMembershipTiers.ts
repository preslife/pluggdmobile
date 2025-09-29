import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalStudioContext } from "@/contexts/StudioContext";

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

const centsFromAmount = (value?: number | null) => {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(0, Math.round(value * 100));
};

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
});

export function useMembershipTiers(): MembershipTiersHook {
  const { user, loading: authLoading } = useAuth();
  const studioContext = useOptionalStudioContext();

  const activeLabel = studioContext?.mode === "label" ? studioContext.activeLabel : null;
  const ownerType: OwnerType | null = activeLabel ? "label" : user ? "profile" : null;
  const ownerId: string | null = activeLabel ? activeLabel.id : user?.id ?? null;

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

    const { data, error } = await supabase
      .from("membership_tiers")
      .select("*")
      .eq("owner_type", ownerType)
      .eq("owner_id", ownerId)
      .order("tier_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setError(error.message);
      setTiers([]);
      setLoading(false);
      return;
    }

    setTiers((data ?? []).map(mapTier));
    setLoading(false);
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
      } catch (err: any) {
        setError(err?.message ?? "Unexpected error");
        throw err;
      } finally {
        setMutating(false);
      }
    },
    [fetchTiers, ownerId, ownerType]
  );

  const createTier = useCallback(
    async (input: UpsertMembershipTierInput) => {
      const order = typeof input.order === "number" ? input.order : tiers.length;
      const payload = {
        owner_type: ownerType,
        owner_id: ownerId,
        name: input.name.trim(),
        slug: withRandomSuffix(slugify(input.name.trim())),
        description: input.description?.trim() || null,
        tier_order: order,
        price_monthly: centsFromAmount(input.priceMonthly),
        price_yearly: centsFromAmount(input.priceYearly),
        price_lifetime: centsFromAmount(input.priceLifetime),
        currency: input.currency || "USD",
        status: input.status || "active",
        features: input.features && input.features.length ? input.features : [],
        color: input.color || null,
        emoji: input.emoji || null,
        max_members: input.maxMembers ?? null,
        image_url: input.imageUrl || null,
      };

      await runMutation(async () => {
        const { error } = await supabase.from("membership_tiers").insert(payload);
        if (error) throw error;
      });
    },
    [ownerId, ownerType, runMutation, tiers.length]
  );

  const updateTier = useCallback(
    async (tierId: string, input: UpsertMembershipTierInput) => {
      const payload: Record<string, any> = {
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        price_monthly: centsFromAmount(input.priceMonthly),
        price_yearly: centsFromAmount(input.priceYearly),
        price_lifetime: centsFromAmount(input.priceLifetime),
        currency: input.currency || "USD",
        status: input.status || "active",
        features: input.features && input.features.length ? input.features : [],
        color: input.color || null,
        emoji: input.emoji || null,
        max_members: input.maxMembers ?? null,
        image_url: input.imageUrl || null,
      };

      if (typeof input.order === "number") {
        payload.tier_order = input.order;
      }

      await runMutation(async () => {
        const { error } = await supabase
          .from("membership_tiers")
          .update(payload)
          .eq("id", tierId);
        if (error) throw error;
      });
    },
    [runMutation]
  );

  const deleteTier = useCallback(
    async (tierId: string) => {
      await runMutation(async () => {
        const { error } = await supabase.from("membership_tiers").delete().eq("id", tierId);
        if (error) throw error;
      });
    },
    [runMutation]
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

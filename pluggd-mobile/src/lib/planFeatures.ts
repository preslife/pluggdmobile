// Which plan each paid feature needs (approved by the founder on 24 October 2026).
// The database holds the same list in public.plan_feature_minimum_tier (latest definition in
// migration 20261024143953_plan_perks_phase2.sql); planFeatures.test.ts keeps the two in step.
// Shared by the website (src/lib/planFeatures.ts) and edge functions, so it imports nothing.

export type PlanTier = "free" | "starter" | "creator" | "pro";

export const PLAN_TIER_RANK: Record<PlanTier, number> = { free: 0, starter: 1, creator: 2, pro: 3 };

export const PLAN_FEATURE_MINIMUM_TIER = {
  sell_sample_packs: "starter",
  catalogue_import: "starter",
  analytics_dashboard: "starter",
  sell_tickets: "creator",
  fan_memberships: "creator",
  crowdfunding: "creator",
  sell_merch: "creator",
  fan_contacts: "creator",
  scheduled_releases: "creator",
  creator_fund: "creator",
  verified_badge: "creator",
  full_analytics: "creator",
  label_studio: "pro",
  custom_licence_templates: "pro",
  api_access: "pro",
  priority_support: "pro",
  priority_placement: "pro",
} as const satisfies Record<string, PlanTier>;

export type PlanFeature = keyof typeof PLAN_FEATURE_MINIMUM_TIER;

export const planTierFrom = (value: unknown): PlanTier =>
  value === "starter" || value === "creator" || value === "pro" ? value : "free";

export const planAllowsFeature = (tier: unknown, feature: PlanFeature): boolean =>
  PLAN_TIER_RANK[planTierFrom(tier)] >= PLAN_TIER_RANK[PLAN_FEATURE_MINIMUM_TIER[feature]];

export interface PlanRequirement {
  tier: Exclude<PlanTier, "free">;
  feature: string;
}

/**
 * Reads a "needs a higher plan" refusal from a database error (hint
 * plan_required:<plan>:<feature>) or an edge function body (error: upgrade_required).
 */
export function readPlanRequirement(error: unknown): PlanRequirement | null {
  if (!error || typeof error !== "object") return null;
  const record = error as { hint?: unknown; error?: unknown; required_tier?: unknown; feature?: unknown };
  const hint = typeof record.hint === "string" ? record.hint.match(/^plan_required:(starter|creator|pro):([a-z_]+)$/) : null;
  if (hint) return { tier: hint[1] as PlanRequirement["tier"], feature: hint[2] };
  if (record.error === "upgrade_required") {
    const tier = planTierFrom(record.required_tier);
    if (tier !== "free") return { tier, feature: typeof record.feature === "string" ? record.feature : "" };
  }
  return null;
}

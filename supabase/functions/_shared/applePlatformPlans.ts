export type ApplePlatformPlanTier = "starter" | "creator" | "pro";
export type ApplePlatformPlanBillingCycle = "monthly" | "yearly";

export type ApplePlatformPlan = {
  tier: ApplePlatformPlanTier;
  label: string;
  billingCycle: ApplePlatformPlanBillingCycle;
  commissionRate: number;
  serviceLevel: 1 | 2 | 3;
};

/**
 * Server-owned allowlist for PLUGGD's own digital-feature subscriptions.
 * App Store Connect owns storefront price/localisation. These products live in
 * one PLUGGD Plans subscription group, separate from creator membership groups.
 */
export const APPLE_PLATFORM_PLANS: Record<string, ApplePlatformPlan> = {
  "com.pluggd.mobile.plan.starter.monthly": {
    tier: "starter",
    label: "PLUGGD Starter",
    billingCycle: "monthly",
    commissionRate: 12.5,
    serviceLevel: 3,
  },
  "com.pluggd.mobile.plan.starter.yearly": {
    tier: "starter",
    label: "PLUGGD Starter",
    billingCycle: "yearly",
    commissionRate: 12.5,
    serviceLevel: 3,
  },
  "com.pluggd.mobile.plan.creator.monthly": {
    tier: "creator",
    label: "PLUGGD Creator",
    billingCycle: "monthly",
    commissionRate: 5,
    serviceLevel: 2,
  },
  "com.pluggd.mobile.plan.creator.yearly": {
    tier: "creator",
    label: "PLUGGD Creator",
    billingCycle: "yearly",
    commissionRate: 5,
    serviceLevel: 2,
  },
  "com.pluggd.mobile.plan.pro.monthly": {
    tier: "pro",
    label: "PLUGGD Pro",
    billingCycle: "monthly",
    commissionRate: 0,
    serviceLevel: 1,
  },
  "com.pluggd.mobile.plan.pro.yearly.v2": {
    tier: "pro",
    label: "PLUGGD Pro",
    billingCycle: "yearly",
    commissionRate: 0,
    serviceLevel: 1,
  },
};

export function applePlatformPlan(productId: string) {
  return APPLE_PLATFORM_PLANS[productId] ?? null;
}

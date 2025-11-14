import { formatCurrency } from "@/lib/utils";
import type { ContentGateType } from "@/types/memberships";

export interface MembershipGateRule {
  gate_type: ContentGateType;
  minimum_tier_id?: string | null;
  allowed_tier_ids?: string[] | null;
}

export interface MembershipTierSummary {
  id: string;
  name: string;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string | null;
}

const formatTierPrice = (tier: MembershipTierSummary | null) => {
  if (!tier) return null;
  const price = tier.price_monthly ?? tier.price_yearly ?? tier.price_lifetime;
  if (price == null) return null;
  return formatCurrency(price / 100, tier.currency ?? "USD");
};

export const describeMembershipGate = (
  rule: MembershipGateRule | null | undefined,
  tiers: MembershipTierSummary[],
): string | null => {
  if (!rule) return null;

  const findTier = (id?: string | null) => (id ? tiers.find((tier) => tier.id === id) ?? null : null);

  switch (rule.gate_type) {
    case "any_tier":
      return "Any active membership unlocks this content.";
    case "specific_tier": {
      const allowedNames =
        rule.allowed_tier_ids
          ?.map((id) => findTier(id)?.name)
          .filter((value): value is string => Boolean(value)) ?? [];
      if (allowedNames.length === 0) {
        return "Exclusive to select membership tiers.";
      }
      if (allowedNames.length === 1) {
        return `Exclusive to ${allowedNames[0]} members.`;
      }
      const last = allowedNames.pop();
      return `Exclusive to ${allowedNames.join(", ")} or ${last} members.`;
    }
    case "tier_or_higher": {
      const minimumTier = findTier(rule.minimum_tier_id);
      const base = minimumTier
        ? `Unlocked at ${minimumTier.name} tier or above.`
        : "Unlocked above the required tier.";
      const price = formatTierPrice(minimumTier);
      return price ? `${base} Starts at ${price}.` : base;
    }
    default:
      return null;
  }
};

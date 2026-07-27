import { describe, expect, it } from "vitest";
import {
  resolveCommercePolicy,
  type CommercePolicyRequest,
  type CommercePolicyRule,
  type PurchaseKind,
} from "../_shared/commercePolicy";

const baseRules: Record<PurchaseKind, CommercePolicyRule> = {
  credit_pack: {
    purchase_kind: "credit_pack",
    enabled: true,
    primary_rail: "apple_iap",
    storefront_config: { primary: ["*"] },
    server_flags: { apple_iap_enabled: true },
    required_entitlement: "provisioned_credit_pack",
    cta: "Buy credits",
    policy_version: "test-v1",
  },
  release_unlock: {
    purchase_kind: "release_unlock",
    enabled: true,
    primary_rail: "credits",
    alternative_rail: "stripe_checkout",
    storefront_config: { primary: ["*"], alternative: ["US"] },
    server_flags: {
      credits_enabled: true,
      external_checkout_enabled: true,
    },
    policy_version: "test-v1",
  },
  tip: {
    purchase_kind: "tip",
    enabled: true,
    primary_rail: "credits",
    storefront_config: { primary: ["*"] },
    server_flags: { credits_enabled: true },
    policy_version: "test-v1",
  },
  live_gift: {
    purchase_kind: "live_gift",
    enabled: true,
    primary_rail: "credits",
    storefront_config: { primary: ["*"] },
    server_flags: { credits_enabled: true },
    policy_version: "test-v1",
  },
  creator_membership: {
    purchase_kind: "creator_membership",
    enabled: true,
    primary_rail: "apple_subscription",
    storefront_config: { primary: ["*"] },
    server_flags: { apple_subscription_enabled: true },
    required_entitlement: "active_provisioned_membership_product",
    policy_version: "test-v1",
  },
  beat_license: {
    purchase_kind: "beat_license",
    enabled: true,
    primary_rail: "stripe_checkout",
    storefront_config: { primary: ["US"] },
    server_flags: {
      external_checkout_enabled: true,
      require_professional_license: true,
    },
    policy_version: "test-v1",
  },
  event_ticket: {
    purchase_kind: "event_ticket",
    enabled: true,
    primary_rail: "stripe_checkout",
    storefront_config: { primary: ["*"] },
    server_flags: {
      external_checkout_enabled: true,
      require_physical_classification: true,
    },
    policy_version: "test-v1",
  },
  physical_merch: {
    purchase_kind: "physical_merch",
    enabled: true,
    primary_rail: "stripe_checkout",
    storefront_config: { primary: ["*"] },
    server_flags: {
      external_checkout_enabled: true,
      require_physical_classification: true,
    },
    policy_version: "test-v1",
  },
};

const decide = (
  purchaseKind: PurchaseKind,
  overrides: Partial<CommercePolicyRequest> = {},
  rule: CommercePolicyRule | null = baseRules[purchaseKind],
) =>
  resolveCommercePolicy(
    {
      purchaseKind,
      storefront: "GB",
      platform: "ios",
      ...overrides,
    },
    rule,
  );

describe("hybrid commerce storefront and item matrix", () => {
  it.each([
    ["credit_pack", "apple_iap"],
    ["release_unlock", "credits"],
    ["tip", "credits"],
    ["live_gift", "credits"],
    ["creator_membership", "apple_subscription"],
  ] as const)("%s uses its App Store-safe primary rail in GB", (kind, rail) => {
    expect(decide(kind).permittedRail).toBe(rail);
  });

  it("keeps release credits global but limits its external alternative to US", () => {
    expect(decide("release_unlock", {
      storefront: "US",
      optionId: "external",
    }).permittedRail).toBe("stripe_checkout");
    expect(decide("release_unlock", {
      storefront: "GB",
      optionId: "external",
    }).permittedRail).toBe("unavailable");
    expect(decide("release_unlock", {
      storefront: "JP",
    }).permittedRail).toBe("credits");
  });

  it("allows verified professional beat licensing in US only", () => {
    expect(decide("beat_license", {
      storefront: "US",
      classification: "professional_off_app",
    }).permittedRail).toBe("stripe_checkout");
    expect(decide("beat_license", {
      storefront: "GB",
      classification: "professional_off_app",
    }).permittedRail).toBe("unavailable");
    expect(decide("beat_license", {
      storefront: "US",
      classification: "digital",
    }).permittedRail).toBe("unavailable");
  });

  it.each(["event_ticket", "physical_merch"] as const)(
    "allows %s only after server physical classification",
    (kind) => {
      expect(decide(kind, { classification: "physical" }).permittedRail)
        .toBe("stripe_checkout");
      expect(decide(kind, { classification: "virtual" }).permittedRail)
        .toBe("unavailable");
      expect(decide(kind, { classification: null }).permittedRail)
        .toBe("unavailable");
    },
  );
});

describe("hybrid commerce default deny", () => {
  it("denies missing rules, disabled flags, unknown storefronts, and non-iOS", () => {
    expect(decide("credit_pack", {}, null).permittedRail).toBe("unavailable");
    expect(decide("credit_pack", { storefront: "ZZ" }).permittedRail)
      .toBe("unavailable");
    expect(decide("credit_pack", { platform: "android" }).permittedRail)
      .toBe("unavailable");
    expect(decide("credit_pack", {}, {
      ...baseRules.credit_pack,
      server_flags: { apple_iap_enabled: false },
    }).permittedRail).toBe("unavailable");
    expect(decide("credit_pack", {}, {
      ...baseRules.credit_pack,
      enabled: false,
    }).permittedRail).toBe("unavailable");
    expect(decide("credit_pack", {}, {
      ...baseRules.credit_pack,
      server_flags: { kill_switch: true },
    }).permittedRail).toBe("unavailable");
  });

  it("does not expose a CTA or entitlement on a denied decision", () => {
    expect(decide("creator_membership", { storefront: null })).toMatchObject({
      permittedRail: "unavailable",
      requiredEntitlement: null,
      cta: null,
    });
  });
});

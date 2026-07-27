export const PURCHASE_KINDS = [
  "credit_pack",
  "release_unlock",
  "tip",
  "live_gift",
  "creator_membership",
  "beat_license",
  "event_ticket",
  "physical_merch",
] as const;

export const PAYMENT_RAILS = [
  "apple_iap",
  "apple_subscription",
  "credits",
  "stripe_checkout",
  "unavailable",
] as const;

export type PurchaseKind = typeof PURCHASE_KINDS[number];
export type PaymentRail = typeof PAYMENT_RAILS[number];
export type ItemClassification =
  | "digital"
  | "physical"
  | "virtual"
  | "hybrid"
  | "professional_off_app"
  | "unclassified";

export type CommercePolicyRequest = {
  purchaseKind: PurchaseKind;
  itemId?: string | null;
  optionId?: string | null;
  classification?: ItemClassification | null;
  storefront?: string | null;
  platform?: string | null;
};

export type CommercePolicyRule = {
  purchase_kind: PurchaseKind;
  enabled: boolean;
  primary_rail: PaymentRail;
  alternative_rail?: PaymentRail | null;
  storefront_config?: {
    primary?: string[];
    alternative?: string[];
  } | null;
  server_flags?: Record<string, boolean> | null;
  required_entitlement?: string | null;
  cta?: string | null;
  policy_version: string;
};

export type CommercePolicyDecision = {
  permittedRail: PaymentRail;
  storefront: string | null;
  reason: string;
  requiredEntitlement: string | null;
  cta: string | null;
  policyVersion: string | null;
};

const ISO_ALPHA_2 = new Set(
  "AD AE AF AG AI AL AM AO AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  ),
);

const DEFAULT_DENY_REASON =
  "This purchase is not available in your current storefront.";

export function defaultDeny(
  storefront?: string | null,
  reason = DEFAULT_DENY_REASON,
  policyVersion: string | null = null,
): CommercePolicyDecision {
  return {
    permittedRail: "unavailable",
    storefront: normalizeStorefront(storefront),
    reason,
    requiredEntitlement: null,
    cta: null,
    policyVersion,
  };
}

export function normalizeStorefront(value?: string | null): string | null {
  const normalized = value?.trim().toUpperCase() ?? "";
  return ISO_ALPHA_2.has(normalized) ? normalized : null;
}

function storefrontAllowed(
  storefront: string,
  allowed: string[] | undefined,
): boolean {
  if (!allowed?.length) return false;
  const normalized = allowed
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toUpperCase());
  return normalized.includes("*") || normalized.includes(storefront);
}

function flagAllowsRail(
  rail: PaymentRail,
  flags: Record<string, boolean>,
): boolean {
  if (rail === "unavailable") return false;
  const flag = {
    apple_iap: "apple_iap_enabled",
    apple_subscription: "apple_subscription_enabled",
    credits: "credits_enabled",
    stripe_checkout: "external_checkout_enabled",
  }[rail];
  return flags[flag] !== false;
}

function requestWantsAlternative(request: CommercePolicyRequest): boolean {
  return request.purchaseKind === "release_unlock" &&
    ["external", "cash", "stripe_checkout"].includes(
      request.optionId?.toLowerCase() ?? "",
    );
}

export function resolveCommercePolicy(
  request: CommercePolicyRequest,
  rule: CommercePolicyRule | null | undefined,
): CommercePolicyDecision {
  const storefront = normalizeStorefront(request.storefront);
  if (!storefront) {
    return defaultDeny(request.storefront, "Storefront could not be verified.");
  }
  if (request.platform?.toLowerCase() !== "ios") {
    return defaultDeny(storefront, "No mobile commerce policy is enabled for this platform.");
  }
  if (!rule || rule.purchase_kind !== request.purchaseKind || !rule.enabled) {
    return defaultDeny(storefront, "No enabled commerce policy exists for this purchase.");
  }

  const flags = rule.server_flags ?? {};
  if (flags.kill_switch === true) {
    return defaultDeny(
      storefront,
      "This purchase is temporarily unavailable.",
      rule.policy_version,
    );
  }
  if (flags.require_physical_classification === true &&
    request.classification !== "physical") {
    return defaultDeny(
      storefront,
      "External checkout requires a server-verified physical item.",
      rule.policy_version,
    );
  }
  if (flags.require_professional_license === true &&
    request.classification !== "professional_off_app") {
    return defaultDeny(
      storefront,
      "External checkout requires a professional off-app licence.",
      rule.policy_version,
    );
  }

  const useAlternative = requestWantsAlternative(request);
  const rail = useAlternative ? rule.alternative_rail : rule.primary_rail;
  const allowed = useAlternative
    ? rule.storefront_config?.alternative
    : rule.storefront_config?.primary;

  if (!rail || !(PAYMENT_RAILS as readonly string[]).includes(rail) ||
    !storefrontAllowed(storefront, allowed) ||
    !flagAllowsRail(rail, flags)) {
    return defaultDeny(storefront, DEFAULT_DENY_REASON, rule.policy_version);
  }

  return {
    permittedRail: rail,
    storefront,
    reason: useAlternative
      ? "This storefront is eligible for hosted external checkout."
      : "Purchase method confirmed by server policy.",
    requiredEntitlement: rule.required_entitlement ?? null,
    cta: rule.cta ?? null,
    policyVersion: rule.policy_version,
  };
}

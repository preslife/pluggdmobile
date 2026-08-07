import {
  defaultDeny,
  resolveCommercePolicy,
  type CommercePolicyDecision,
  type CommercePolicyRule,
} from "../_shared/commercePolicy.ts";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type User = { id: string; email?: string | null };
type BeatCheckoutSource = {
  beat: {
    id: string;
    user_id: string;
    title: string;
    producer_name?: string | null;
    is_published: boolean;
  };
  option: {
    id: string;
    beat_id: string;
    license_type: string;
    price_pence: number;
    is_available: boolean;
  };
  contract: {
    id: string;
    beat_id: string;
    producer_id: string;
    artist_id: string;
    template_type: string;
    status: string;
    amount_cents: number | null;
    currency: string;
    producer_signature?: string | null;
    artist_signature?: string | null;
    digital_delivery_requested?: boolean | null;
    digital_delivery_consent_text?: string | null;
    digital_delivery_consent_version?: string | null;
    digital_delivery_consented_at?: string | null;
    contract_data?: Record<string, unknown> | null;
    pricing_snapshot?: Record<string, unknown> | null;
  };
};

export type ExternalCheckoutRecord = {
  id: string;
  stripe_checkout_session_id?: string | null;
  status: string;
  provider_metadata?: Record<string, unknown> | null;
};

type StripeSession = { id: string; url: string | null };
type PayoutAccount = {
  stripe_account_id: string;
  onboarding_complete: boolean;
  payouts_enabled: boolean;
};

export interface BeatCheckoutDependencies {
  authenticate(req: Request): Promise<User | null>;
  loadSource(input: {
    beatId: string;
    licenseOptionId: string;
    contractId: string;
  }): Promise<BeatCheckoutSource | null>;
  loadPolicy(): Promise<CommercePolicyRule | null>;
  loadPayoutAccount(producerId: string): Promise<PayoutAccount | null>;
  findCheckout(idempotencyKey: string): Promise<ExternalCheckoutRecord | null>;
  createCheckout(input: Record<string, unknown>): Promise<ExternalCheckoutRecord>;
  createStripeSession(
    input: Record<string, unknown>,
    idempotencyKey: string,
  ): Promise<StripeSession>;
  updateCheckout(
    id: string,
    input: Record<string, unknown>,
  ): Promise<void>;
  updateContract(
    id: string,
    input: Record<string, unknown>,
  ): Promise<void>;
  now(): Date;
  allowedWebOrigins?: string[];
}

type Body = {
  beatId?: unknown;
  licenseOptionId?: unknown;
  contractId?: unknown;
  requestId?: unknown;
  returnUrl?: unknown;
  storefront?: unknown;
  licenseFee?: unknown;
  amount?: unknown;
  platform?: unknown;
};

const RETURN_URL = "pluggd://commerce/success";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
const id = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

function checkoutUrl(metadata: Record<string, unknown> | null | undefined) {
  return typeof metadata?.checkout_url === "string"
    ? metadata.checkout_url
    : null;
}

function deny(decision: CommercePolicyDecision) {
  return json({
    error: decision.reason,
    decision,
  }, 403);
}

function permittedWebReturnUrl(
  value: string,
  allowedOrigins: string[],
): boolean {
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    return (url.protocol === "https:" || local) &&
      allowedOrigins.includes(url.origin) &&
      url.pathname.startsWith("/beat/");
  } catch {
    return false;
  }
}

function appendQuery(url: string, query: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

export async function handleCreateBeatPurchase(
  req: Request,
  deps: BeatCheckoutDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const user = await deps.authenticate(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  if (body.licenseFee !== undefined || body.amount !== undefined) {
    return json({ error: "Client-provided pricing is not accepted" }, 400);
  }

  const beatId = id(body.beatId);
  const licenseOptionId = id(body.licenseOptionId);
  const contractId = id(body.contractId);
  const requestId = id(body.requestId);
  const returnUrl = id(body.returnUrl);
  const storefront = id(body.storefront);
  const platform = body.platform === "web" ? "web" : "ios";
  if (!beatId || !licenseOptionId || !contractId || !returnUrl) {
    return json({
      error:
        "beatId, licenseOptionId, contractId and returnUrl are required",
    }, 400);
  }
  if (requestId && !/^[A-Za-z0-9_-]{8,100}$/.test(requestId)) {
    return json({ error: "Request ID is invalid" }, 400);
  }
  const validReturnUrl = platform === "ios"
    ? returnUrl === RETURN_URL
    : permittedWebReturnUrl(returnUrl, deps.allowedWebOrigins ?? []);
  if (!validReturnUrl) {
    return json({ error: "Return URL is not permitted" }, 400);
  }

  const source = await deps.loadSource({ beatId, licenseOptionId, contractId });
  if (!source || !source.beat.is_published || !source.option.is_available) {
    return json({ error: "Licence is unavailable" }, 404);
  }
  if (source.beat.user_id === user.id) {
    return json({ error: "You cannot license your own beat" }, 403);
  }

  const { option, contract, beat } = source;
  const snapshotOptionId = contract.pricing_snapshot?.license_option_id ??
    contract.contract_data?.license_option_id;
  if (
    contract.artist_id !== user.id ||
    contract.beat_id !== beat.id ||
    contract.producer_id !== beat.user_id ||
    contract.template_type !== option.license_type ||
    snapshotOptionId !== option.id
  ) {
    return json({ error: "Contract does not match this licence" }, 403);
  }
  if (
    contract.status !== "signed" ||
    !contract.artist_signature ||
    !contract.producer_signature
  ) {
    return json({ error: "The licence contract must be signed first" }, 409);
  }
  if (
    contract.digital_delivery_requested !== true ||
    !contract.digital_delivery_consent_text ||
    !contract.digital_delivery_consent_version ||
    !contract.digital_delivery_consented_at
  ) {
    return json({
      error: "Separate consent for immediate digital delivery is required",
      code: "DIGITAL_DELIVERY_CONSENT_REQUIRED",
    }, 409);
  }

  const amountCents = Number(contract.amount_cents);
  if (
    !Number.isSafeInteger(amountCents) || amountCents <= 0 ||
    amountCents !== option.price_pence ||
    contract.currency !== "GBP"
  ) {
    return json({ error: "Licence pricing changed; prepare a new contract" }, 409);
  }

  const rule = await deps.loadPolicy();
  const decision = platform === "web" && rule?.enabled &&
      rule.primary_rail === "stripe_checkout" &&
      rule.server_flags?.kill_switch !== true &&
      rule.server_flags?.external_checkout_enabled !== false
    ? {
      permittedRail: "stripe_checkout" as const,
      storefront: storefront ?? null,
      reason: "Professional beat licensing uses hosted checkout.",
      requiredEntitlement: null,
      cta: rule.cta ?? "Continue securely",
      policyVersion: rule.policy_version,
    }
    : rule
    ? resolveCommercePolicy({
      purchaseKind: "beat_license",
      itemId: beat.id,
      optionId: option.id,
      classification: "professional_off_app",
      storefront,
      platform,
    }, rule)
    : defaultDeny(storefront, "Commerce policy could not be verified.");
  if (decision.permittedRail !== "stripe_checkout") return deny(decision);

  const payout = await deps.loadPayoutAccount(beat.user_id);
  const connectEnabled = Boolean(
    payout?.stripe_account_id &&
      payout.onboarding_complete &&
      payout.payouts_enabled,
  );
  if (!connectEnabled) {
    return json({
      error:
        "This producer must finish Stripe Connect onboarding before accepting licence payments.",
    }, 409);
  }

  const idempotencyKey =
    `beat-license:${user.id}:${beat.id}:${option.id}:${contract.id}:${requestId ?? "initial"}`;
  const existing = await deps.findCheckout(idempotencyKey);
  const existingUrl = checkoutUrl(existing?.provider_metadata);
  if (
    existing?.stripe_checkout_session_id &&
    existingUrl &&
    ["created", "open"].includes(existing.status)
  ) {
    return json({
      url: existingUrl,
      checkoutUrl: existingUrl,
      sessionId: existing.stripe_checkout_session_id,
      orderId: contract.id,
    });
  }

  const pricingSnapshot = {
    beat_id: beat.id,
    beat_title: beat.title,
    producer_id: beat.user_id,
    license_option_id: option.id,
    license_type: option.license_type,
    contract_id: contract.id,
    amount_cents: amountCents,
    currency: "GBP",
  };

  let checkout = existing;
  if (!checkout) {
    try {
      checkout = await deps.createCheckout({
        user_id: user.id,
        purchase_kind: "beat_license",
        resource_id: beat.id,
        variant_id: option.id,
        quantity: 1,
        amount_cents: amountCents,
        currency: "GBP",
        status: "created",
        idempotency_key: idempotencyKey,
        policy_version: decision.policyVersion,
        pricing_snapshot: pricingSnapshot,
        provider_metadata: { contract_id: contract.id },
      });
    } catch {
      checkout = await deps.findCheckout(idempotencyKey);
      if (!checkout) throw new Error("Unable to initialise checkout");
    }
  }

  const platformFeeCents = Math.round(amountCents * 0.20);
  const metadata = {
    purchase_kind: "beat_license",
    external_checkout_id: checkout.id,
    beat_id: beat.id,
    license_option_id: option.id,
    contract_id: contract.id,
    producer_id: beat.user_id,
    artist_id: user.id,
    amount_cents: String(amountCents),
    currency: "GBP",
    policy_version: decision.policyVersion ?? "",
  };

  const stripeSession = await deps.createStripeSession({
    mode: "payment",
    customer_email: user.email ?? undefined,
    line_items: [{
      price_data: {
        currency: "gbp",
        unit_amount: amountCents,
        product_data: {
          name: `${option.license_type.replaceAll("_", " ")} — ${beat.title}`,
          description:
            `Professional off-app usage licence by ${beat.producer_name ?? "PLUGGD creator"}`,
          metadata,
        },
      },
      quantity: 1,
    }],
    success_url: appendQuery(
      returnUrl,
      `status=success&sessionId={CHECKOUT_SESSION_ID}&kind=beat_license&itemId=${beat.id}`,
    ),
    cancel_url: appendQuery(
      returnUrl,
      `status=cancelled&kind=beat_license&itemId=${beat.id}`,
    ),
    expires_at: Math.floor(
      new Date(deps.now().getTime() + 30 * 60 * 1000).getTime() / 1000,
    ),
    metadata,
    payment_intent_data: connectEnabled
      ? {
        application_fee_amount: platformFeeCents,
        transfer_data: { destination: payout!.stripe_account_id },
        metadata,
      }
      : { metadata },
  }, idempotencyKey);

  if (!stripeSession.url) throw new Error("Stripe returned no checkout URL");
  await deps.updateCheckout(checkout.id, {
    stripe_checkout_session_id: stripeSession.id,
    status: "open",
    provider_metadata: {
      contract_id: contract.id,
      checkout_url: stripeSession.url,
      connect_destination: payout!.stripe_account_id,
      platform_fee_cents: platformFeeCents,
    },
    expires_at: new Date(deps.now().getTime() + 30 * 60 * 1000).toISOString(),
    updated_at: deps.now().toISOString(),
  });
  await deps.updateContract(contract.id, {
    stripe_checkout_session_id: stripeSession.id,
    idempotency_key: idempotencyKey,
    policy_version: decision.policyVersion,
    pricing_snapshot: pricingSnapshot,
    updated_at: deps.now().toISOString(),
  });

  return json({
    url: stripeSession.url,
    checkoutUrl: stripeSession.url,
    sessionId: stripeSession.id,
    orderId: contract.id,
  });
}

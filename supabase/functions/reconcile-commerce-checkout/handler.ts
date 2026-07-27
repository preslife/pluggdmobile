export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type User = { id: string };
export type CheckoutReconciliationRecord = {
  id: string;
  user_id: string;
  purchase_kind: string;
  resource_id: string;
  variant_id?: string | null;
  quantity: number;
  amount_cents: number;
  currency: string;
  stripe_checkout_session_id?: string | null;
  status: string;
  completed_at?: string | null;
  refunded_at?: string | null;
  pricing_snapshot?: Record<string, unknown> | null;
  provider_metadata?: Record<string, unknown> | null;
};

export interface ReconcileCheckoutDependencies {
  authenticate(req: Request): Promise<User | null>;
  loadOwnedCheckout(
    userId: string,
    sessionId: string,
  ): Promise<CheckoutReconciliationRecord | null>;
  loadEntitlement(
    checkout: CheckoutReconciliationRecord,
  ): Promise<Record<string, unknown> | null>;
}

type Body = {
  sessionId?: unknown;
  purchaseKind?: unknown;
  itemId?: unknown;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function publicState(status: string) {
  if (status === "completed") return "success";
  if (["cancelled", "expired", "failed"].includes(status)) return "cancelled";
  if (["refunded", "partially_refunded", "disputed"].includes(status)) {
    return "revoked";
  }
  return "pending";
}

export async function handleReconcileCommerceCheckout(
  req: Request,
  deps: ReconcileCheckoutDependencies,
): Promise<Response> {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }
  const user = await deps.authenticate(req);
  if (!user) return json({ error: "Unauthorized" }, 401);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const sessionId = typeof body.sessionId === "string"
      ? body.sessionId.trim()
      : "";
  if (!sessionId) return json({ error: "sessionId is required" }, 400);

  // purchaseKind and itemId are deliberately ignored. Provider-owned records
  // are the only authority for what was purchased.
  const checkout = await deps.loadOwnedCheckout(user.id, sessionId);
  if (!checkout) return json({ error: "Checkout session not found" }, 404);

  const entitlement = await deps.loadEntitlement(checkout);
  const entitlementId = typeof entitlement?.id === "string"
    ? entitlement.id
    : null;
  const orderId = typeof checkout.provider_metadata?.ticket_order_id === "string"
    ? checkout.provider_metadata.ticket_order_id
    : checkout.purchase_kind === "beat_license" &&
        typeof checkout.provider_metadata?.contract_id === "string"
    ? checkout.provider_metadata.contract_id
    : checkout.purchase_kind === "physical_merch" &&
        typeof checkout.provider_metadata?.merch_order_id === "string"
    ? checkout.provider_metadata.merch_order_id
    : checkout.purchase_kind === "release_unlock" &&
        typeof checkout.provider_metadata?.release_purchase_id === "string"
    ? checkout.provider_metadata.release_purchase_id
    : null;
  return json({
    sessionId: checkout.stripe_checkout_session_id ?? checkout.id,
    checkoutId: checkout.id,
    state: publicState(checkout.status),
    status: checkout.status,
    purchaseKind: checkout.purchase_kind,
    itemId: checkout.resource_id,
    optionId: checkout.variant_id ?? null,
    quantity: checkout.quantity,
    amountCents: checkout.amount_cents,
    currency: checkout.currency,
    completedAt: checkout.completed_at ?? null,
    refundedAt: checkout.refunded_at ?? null,
    orderId,
    entitlementId,
    entitlement,
  });
}

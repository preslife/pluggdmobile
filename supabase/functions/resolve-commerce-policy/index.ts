import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  defaultDeny,
  PURCHASE_KINDS,
  resolveCommercePolicy,
  type CommercePolicyRequest,
  type CommercePolicyRule,
  type ItemClassification,
  type PurchaseKind,
} from "../_shared/commercePolicy.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isPurchaseKind = (value: unknown): value is PurchaseKind =>
  typeof value === "string" &&
  (PURCHASE_KINDS as readonly string[]).includes(value);

async function verifyClassification(
  client: ReturnType<typeof createClient>,
  request: CommercePolicyRequest,
): Promise<ItemClassification | null> {
  if (!request.itemId) return null;

  if (request.purchaseKind === "event_ticket") {
    const { data, error } = await client
      .from("events")
      .select("commerce_classification")
      .eq("id", request.itemId)
      .maybeSingle();
    if (error || data?.commerce_classification !== "physical") return null;
    return "physical";
  }

  if (request.purchaseKind === "physical_merch") {
    if (request.optionId === "creator_merchandise") {
      const { data, error } = await client
        .from("creator_merchandise")
        .select("product_type,status,requires_shipping")
        .eq("id", request.itemId)
        .maybeSingle();
      if (
        error || !data?.requires_shipping ||
        !["active", "published", "approved"].includes(data.status)
      ) {
        return null;
      }
      return "physical";
    }

    const { data, error } = await client
      .from("store_products")
      .select("product_type,is_active")
      .eq("id", request.itemId)
      .maybeSingle();
    if (error || !data?.is_active || data.product_type !== "merchandise") {
      return null;
    }
    return "physical";
  }

  return request.classification ?? null;
}

async function hasRequiredProductMapping(
  client: ReturnType<typeof createClient>,
  request: CommercePolicyRequest,
): Promise<boolean> {
  if (request.purchaseKind !== "creator_membership") return true;
  if (!request.itemId || !request.optionId) return false;

  const { data, error } = await client
    .from("membership_iap_products")
    .select("id,product_id,subscription_group_id,price_point_cents")
    .eq("creator_id", request.itemId)
    .eq("membership_tier_id", request.optionId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return !error &&
    Boolean(
      data?.id &&
        data.product_id &&
        data.subscription_group_id &&
        Number(data.price_point_cents) > 0,
    );
}

serve(async (req) => {
  // Every unknown or unverifiable request resolves to an unavailable decision.
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ decision: defaultDeny(null, "Method not allowed.") }, 405);
  }

  try {
    const body = await req.json();
    if (!isPurchaseKind(body?.purchaseKind)) {
      return json({
        decision: defaultDeny(body?.storefront, "Unknown purchase kind."),
      });
    }

    const request: CommercePolicyRequest = {
      purchaseKind: body.purchaseKind,
      itemId: typeof body.itemId === "string" ? body.itemId : null,
      optionId: typeof body.optionId === "string" ? body.optionId : null,
      classification: typeof body.classification === "string"
        ? body.classification
        : null,
      storefront: typeof body.storefront === "string" ? body.storefront : null,
      platform: typeof body.platform === "string" ? body.platform : null,
    };

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const { data: rule, error } = await service
      .from("commerce_policy_rules")
      .select(
        "purchase_kind,enabled,primary_rail,alternative_rail,storefront_config,server_flags,required_entitlement,cta,policy_version",
      )
      .eq("purchase_kind", request.purchaseKind)
      .maybeSingle();

    if (error || !rule) {
      return json({
        decision: defaultDeny(
          request.storefront,
          "Commerce policy could not be verified.",
        ),
      });
    }

    if (!await hasRequiredProductMapping(service, request)) {
      return json({
        decision: defaultDeny(
          request.storefront,
          "This membership does not have an active provisioned App Store product.",
          rule.policy_version,
        ),
      });
    }

    request.classification = await verifyClassification(service, request);
    return json({
      decision: resolveCommercePolicy(
        request,
        rule as CommercePolicyRule,
      ),
    });
  } catch {
    return json({
      decision: defaultDeny(null, "Commerce policy could not be verified."),
    });
  }
});

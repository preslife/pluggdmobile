import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const supabaseService = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

const stripe = new Stripe(stripeSecret, {
  apiVersion: "2023-10-16",
});

type TierPayload = {
  id: string;
  owner_type: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  price_lifetime: number | null;
  currency: string;
  status: string;
  max_members: number | null;
  current_members: number;
  color: string | null;
  emoji: string | null;
  image_url: string | null;
  features: unknown;
  created_at: string;
  updated_at: string;
  stripe_product_id?: string | null;
  stripe_price_monthly_id?: string | null;
  stripe_price_yearly_id?: string | null;
  stripe_price_lifetime_id?: string | null;
};

type SyncPayload = {
  action: "create" | "update" | "delete";
  payload: {
    tier: TierPayload;
    actor_id?: string | null;
    previous?: {
      stripe_product_id?: string | null;
      stripe_price_monthly_id?: string | null;
      stripe_price_yearly_id?: string | null;
      stripe_price_lifetime_id?: string | null;
    } | null;
  };
};

const logError = async (message: string, details: Record<string, unknown>) => {
  try {
    await supabaseService.from("system_logs").insert({
      level: "error",
      component: "membership_tier_stripe",
      action: details.action ?? "unknown",
      message,
      metadata: details,
      user_id: (details.actor_id as string | null) ?? null,
    });
  } catch (loggingError) {
    console.error("[membership-tier-stripe] Failed to write system log", loggingError);
  }
};

const deactivatePrice = async (priceId: string | null | undefined) => {
  if (!priceId) return;
  try {
    await stripe.prices.update(priceId, { active: false });
  } catch (error) {
    console.warn("[membership-tier-stripe] Unable to deactivate price", priceId, error);
  }
};

const ensureProduct = async (tier: TierPayload, previousProductId?: string | null) => {
  const metadata = {
    tierId: tier.id,
    ownerType: tier.owner_type,
    ownerId: tier.owner_id,
    slug: tier.slug,
  } satisfies Stripe.MetadataParam;

  if (previousProductId) {
    const updated = await stripe.products.update(previousProductId, {
      name: tier.name,
      description: tier.description ?? undefined,
      active: tier.status === "active",
      metadata,
    });
    return updated.id;
  }

  const created = await stripe.products.create({
    name: tier.name,
    description: tier.description ?? undefined,
    active: tier.status === "active",
    metadata,
  });

  return created.id;
};

const ensurePrice = async (
  tier: TierPayload,
  amount: number | null,
  cadence: "month" | "year" | null,
  existingId?: string | null
): Promise<string | null> => {
  if (amount == null) {
    await deactivatePrice(existingId);
    return null;
  }

  if (existingId) {
    try {
      const existing = await stripe.prices.retrieve(existingId);
      const matchesAmount = existing.unit_amount === amount;
      const matchesCurrency = existing.currency === tier.currency.toLowerCase();
      const matchesCadence = cadence
        ? existing.recurring?.interval === cadence
        : !existing.recurring;
      if (matchesAmount && matchesCurrency && matchesCadence && existing.active) {
        return existing.id;
      }
      if (existing.active) {
        await stripe.prices.update(existing.id, { active: false });
      }
    } catch (error) {
      console.warn("[membership-tier-stripe] Unable to reuse existing price", existingId, error);
    }
  }

  const params: Stripe.PriceCreateParams = {
    currency: tier.currency.toLowerCase(),
    unit_amount: amount,
    product: tier.stripe_product_id ?? undefined,
    nickname: cadence ? `${tier.name} (${cadence})` : `${tier.name} (lifetime)`,
  };

  if (!params.product) {
    throw new Error("Stripe product must be set before creating prices");
  }

  if (cadence) {
    params.recurring = { interval: cadence };
  }

  const created = await stripe.prices.create(params);
  return created.id;
};

const syncTier = async (input: SyncPayload["payload"], action: SyncPayload["action"]) => {
  const { tier, previous } = input;
  const actorId = input.actor_id ?? null;

  if (!stripeSecret) {
    throw new Error("Stripe secret key is not configured");
  }

  const currency = tier.currency?.toLowerCase() || "usd";
  tier.currency = currency.toUpperCase();

  const response = {
    stripe_product_id: tier.stripe_product_id ?? previous?.stripe_product_id ?? null,
    stripe_price_ids: {
      monthly: tier.stripe_price_monthly_id ?? previous?.stripe_price_monthly_id ?? null,
      yearly: tier.stripe_price_yearly_id ?? previous?.stripe_price_yearly_id ?? null,
      lifetime: tier.stripe_price_lifetime_id ?? previous?.stripe_price_lifetime_id ?? null,
    },
  };

  if (action === "delete") {
    if (response.stripe_product_id) {
      await stripe.products.update(response.stripe_product_id, { active: false });
    }
    await deactivatePrice(response.stripe_price_ids.monthly);
    await deactivatePrice(response.stripe_price_ids.yearly);
    await deactivatePrice(response.stripe_price_ids.lifetime);
    return response;
  }

  const productId = await ensureProduct(tier, response.stripe_product_id);
  response.stripe_product_id = productId;
  tier.stripe_product_id = productId;

  response.stripe_price_ids.monthly = await ensurePrice(
    tier,
    tier.price_monthly,
    "month",
    response.stripe_price_ids.monthly
  );

  response.stripe_price_ids.yearly = await ensurePrice(
    tier,
    tier.price_yearly,
    "year",
    response.stripe_price_ids.yearly
  );

  response.stripe_price_ids.lifetime = await ensurePrice(
    tier,
    tier.price_lifetime,
    null,
    response.stripe_price_ids.lifetime
  );

  return response;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let action: SyncPayload["action"] | "membership-tier-sync" = "membership-tier-sync";
  let actorId: string | null = null;
  let tierId: string | null = null;

  try {
    const payload = (await req.json()) as SyncPayload;
    if (!payload || !payload.action || !payload.payload?.tier) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    action = payload.action;
    actorId = payload.payload.actor_id ?? null;
    tierId = payload.payload.tier?.id ?? null;

    const { action: actionName, payload: tierPayload } = payload;
    if (!["create", "update", "delete"].includes(actionName)) {
      return new Response(JSON.stringify({ error: "Unsupported action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await syncTier(tierPayload, actionName);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    await logError(message, {
      action,
      actor_id: actorId,
      tier_id: tierId,
      error: message,
      stack,
    });

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

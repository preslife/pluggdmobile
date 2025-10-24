import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";

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

const MAX_RETRIES = 3;
const RETRY_DELAY_BASE_MS = 500;

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
    attempt?: number | null;
    correlation_id?: string | null;
    job_id?: string | null;
    queued_at?: string | null;
    scheduled_at?: string | null;
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

const syncTier = async (
  input: SyncPayload["payload"],
  action: SyncPayload["action"],
  _context: { correlationId?: string | null; jobId?: string | null } = {}
) => {
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

  let logger = null as ReturnType<typeof createSystemLogger> | null;
  let action: SyncPayload["action"] | "membership-tier-sync" = "membership-tier-sync";
  let actorId: string | null = null;
  let tierId: string | null = null;
  let correlationId: string | null = generateCorrelationId();
  let jobId: string | null = null;
  let queueAttempt: number | null = null;

  try {
    const payload = (await req.json().catch(() => null)) as SyncPayload | null;
    if (!payload || !payload.action || !payload.payload?.tier) {
      const invalidLogger = createSystemLogger(supabaseService, {
        component: "membership_tier_stripe",
        feature: "membership",
        correlationId,
        message: "Membership tier Stripe sync",
      });
      await invalidLogger.warn("membership_tier_sync_invalid_payload", {
        received_action: payload?.action ?? null,
      });
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    action = payload.action;
    actorId = payload.payload.actor_id ?? null;
    tierId = payload.payload.tier?.id ?? null;
    correlationId = payload.payload.correlation_id ?? correlationId;
    jobId = payload.payload.job_id ?? null;
    queueAttempt = payload.payload.attempt ?? null;

    logger = createSystemLogger(supabaseService, {
      component: "membership_tier_stripe",
      feature: "membership",
      userId: actorId,
      correlationId: correlationId ?? undefined,
      message: "Membership tier Stripe sync",
    });

    const { action: actionName, payload: tierPayload } = payload;
    if (!["create", "update", "delete"].includes(actionName)) {
      await logger.warn("membership_tier_sync_invalid_action", {
        action: actionName,
        actor_id: actorId,
        tier_id: tierId,
      });
      return new Response(JSON.stringify({ error: "Unsupported action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await logger.info("membership_tier_sync_start", {
      action: actionName,
      actor_id: actorId,
      tier_id: tierId,
      correlation_id: correlationId,
      job_id: jobId,
      queue_attempt: queueAttempt,
      queued_at: payload.payload.queued_at ?? null,
      scheduled_at: payload.payload.scheduled_at ?? null,
    });

    let attempt = 0;
    const result = await (async () => {
      let lastError: unknown;
      while (attempt < MAX_RETRIES) {
        attempt += 1;
        try {
          return await syncTier(tierPayload, actionName, { correlationId, jobId });
        } catch (error) {
          lastError = error;
          if (attempt >= MAX_RETRIES) {
            throw error;
          }
          await logger!.warn("membership_tier_sync_retry", {
            action: actionName,
            actor_id: actorId,
            tier_id: tierId,
            attempt,
            correlation_id: correlationId,
            job_id: jobId,
            error: error instanceof Error ? error.message : String(error),
          });
          const delay = RETRY_DELAY_BASE_MS * Math.pow(2, attempt - 1);
          await sleep(delay);
        }
      }
      throw lastError ?? new Error("Unknown sync failure");
    })();

    await logger.info("membership_tier_sync_success", {
      action: actionName,
      actor_id: actorId,
      tier_id: tierId,
      correlation_id: correlationId,
      job_id: jobId,
      attempts: attempt,
      queue_attempt: queueAttempt,
      stripe_product_id: result?.stripe_product_id ?? null,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    const activeLogger =
      logger ??
      createSystemLogger(supabaseService, {
        component: "membership_tier_stripe",
        feature: "membership",
        userId: actorId,
        correlationId: correlationId ?? undefined,
        message: "Membership tier Stripe sync",
      });
    await activeLogger.error("membership_tier_sync_failed", error, {
      action,
      actor_id: actorId,
      tier_id: tierId,
      error: message,
      stack,
      correlation_id: correlationId,
      job_id: jobId,
      queue_attempt: queueAttempt,
    });

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { createHash } from "node:crypto";
import {
  AppStoreConnectClient,
  type JsonApiResource,
} from "../_shared/appStoreConnect.ts";
import { createSystemLogger, generateCorrelationId } from "../_shared/systemLog.ts";
import { membershipReviewScreenshotBase64 } from "./membershipReviewScreenshot.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const provisionerSecret = Deno.env.get("MEMBERSHIP_IAP_PROVISIONER_SECRET") ?? "";
const priceBatchSize = Math.max(
  1,
  Math.min(40, Number(Deno.env.get("MEMBERSHIP_IAP_PRICE_BATCH_SIZE") ?? "20")),
);

const service = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type ProvisioningJob = {
  id: string;
  creator_profile_id: string;
  creator_id: string;
  membership_tier_id: string;
  billing_period: "monthly" | "yearly";
  desired_product_id: string;
  status: string;
  attempts: number;
  progress: Record<string, unknown> | null;
};

type JobContext = {
  job: ProvisioningJob;
  catalogue: {
    status: string;
    reference_name: string;
    locale: string;
    apple_group_id: string | null;
  };
  profile: {
    user_id: string;
    full_name: string | null;
    username: string | null;
    is_creator: boolean | null;
    is_verified: boolean | null;
    verification_status: string | null;
  };
  tier: {
    id: string;
    owner_id: string;
    owner_type: string;
    name: string;
    description: string | null;
    tier_order: number;
    price_monthly: number | null;
    price_yearly: number | null;
    currency: string;
    status: string;
  };
};

const currencyTerritory: Record<string, string> = {
  GBP: "GBR",
  USD: "USA",
  EUR: "IRL",
  CAD: "CAN",
  AUD: "AUS",
  NZD: "NZL",
  JPY: "JPN",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function assertAuthorized(request: Request) {
  if (!provisionerSecret) {
    throw new Error("MEMBERSHIP_IAP_PROVISIONER_SECRET is not configured");
  }
  const supplied = request.headers.get("x-pluggd-provisioner-secret") ?? "";
  if (supplied.length !== provisionerSecret.length || supplied !== provisionerSecret) {
    throw new Error("Provisioner authorization failed");
  }
}

function resourceAttributes(resource: JsonApiResource | undefined) {
  return resource?.attributes ?? {};
}

function relationshipId(resource: JsonApiResource, name: string) {
  const data = resource.relationships?.[name]?.data;
  return !Array.isArray(data) && data ? data.id : null;
}

function conciseName(value: string, max: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= max ? compact : compact.slice(0, max - 1).trimEnd() + "…";
}

function membershipReviewScreenshotBytes() {
  const binary = atob(membershipReviewScreenshotBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function stateIsApproved(state: unknown) {
  return state === "APPROVED" || state === "READY_FOR_SALE";
}

async function loadContext(job: ProvisioningJob): Promise<JobContext> {
  const [catalogueResult, profileResult, tierResult] = await Promise.all([
    service
      .from("creator_membership_iap_catalogues")
      .select("status,reference_name,locale,apple_group_id")
      .eq("creator_profile_id", job.creator_profile_id)
      .single(),
    service
      .from("profiles")
      .select("user_id,full_name,username,is_creator,is_verified,verification_status")
      .eq("id", job.creator_profile_id)
      .single(),
    service
      .from("membership_tiers")
      .select("id,owner_id,owner_type,name,description,tier_order,price_monthly,price_yearly,currency,status")
      .eq("id", job.membership_tier_id)
      .single(),
  ]);

  if (catalogueResult.error) throw catalogueResult.error;
  if (profileResult.error) throw profileResult.error;
  if (tierResult.error) throw tierResult.error;

  const context = {
    job,
    catalogue: catalogueResult.data,
    profile: profileResult.data,
    tier: tierResult.data,
  } as JobContext;

  if (context.catalogue.status !== "approved") {
    throw new Error("Creator membership selling is not approved");
  }
  if (
    context.profile.user_id !== job.creator_id ||
    context.profile.is_creator !== true ||
    context.profile.is_verified !== true ||
    context.profile.verification_status !== "approved"
  ) {
    throw new Error("Creator verification is not approved");
  }
  if (
    context.tier.owner_type !== "profile" ||
    context.tier.owner_id !== job.creator_profile_id ||
    context.tier.status !== "active"
  ) {
    throw new Error("Membership tier is not an active tier owned by this creator");
  }
  const price = job.billing_period === "yearly"
    ? context.tier.price_yearly
    : context.tier.price_monthly;
  if (!price || price <= 0) throw new Error("Membership tier has no valid server-owned price");
  return context;
}

async function ensureGroup(
  apple: AppStoreConnectClient,
  context: JobContext,
) {
  if (context.catalogue.apple_group_id) return context.catalogue.apple_group_id;
  const groups = await apple.list(
    `/v1/apps/${apple.appId}/subscriptionGroups?limit=200`,
  );
  const existing = groups.find(
    (entry) => resourceAttributes(entry).referenceName === context.catalogue.reference_name,
  );
  const group = existing ?? (await apple.request("POST", "/v1/subscriptionGroups", {
    data: {
      type: "subscriptionGroups",
      attributes: { referenceName: context.catalogue.reference_name },
      relationships: {
        app: { data: { type: "apps", id: apple.appId } },
      },
    },
  })).data as JsonApiResource;
  if (!group?.id) throw new Error("Apple did not return a subscription group identifier");

  const { error } = await service
    .from("creator_membership_iap_catalogues")
    .update({ apple_group_id: group.id, last_error: null, updated_at: new Date().toISOString() })
    .eq("creator_profile_id", context.job.creator_profile_id);
  if (error) throw error;
  return group.id;
}

async function ensureSubscription(
  apple: AppStoreConnectClient,
  context: JobContext,
  groupId: string,
) {
  const subscriptions = await apple.list(
    `/v1/subscriptionGroups/${groupId}/subscriptions?limit=200`,
  );
  const existing = subscriptions.find(
    (entry) => resourceAttributes(entry).productId === context.job.desired_product_id,
  );
  if (existing) return existing;

  const creatorName = context.profile.full_name || context.profile.username || "Creator";
  const periodLabel = context.job.billing_period === "yearly" ? "Annual" : "Monthly";
  const created = await apple.request("POST", "/v1/subscriptions", {
    data: {
      type: "subscriptions",
      attributes: {
        name: conciseName(`${creatorName} · ${context.tier.name} · ${periodLabel}`, 64),
        productId: context.job.desired_product_id,
        familySharable: false,
        subscriptionPeriod: context.job.billing_period === "yearly" ? "ONE_YEAR" : "ONE_MONTH",
        reviewNote: "Creator-specific PLUGGD membership. Fans may support multiple creators independently.",
        groupLevel: Math.max(1, Math.min(100, Number(context.tier.tier_order || 0) + 1)),
      },
      relationships: {
        group: { data: { type: "subscriptionGroups", id: groupId } },
      },
    },
  });
  const resource = created.data as JsonApiResource;
  if (!resource?.id) throw new Error("Apple did not return a subscription identifier");
  return resource;
}

async function ensureGroupLocalization(
  apple: AppStoreConnectClient,
  context: JobContext,
  groupId: string,
) {
  const localizations = await apple.list(
    `/v1/subscriptionGroups/${groupId}/subscriptionGroupLocalizations?limit=200`,
  );
  if (localizations.some(
    (entry) => resourceAttributes(entry).locale === context.catalogue.locale,
  )) return;

  const creatorName = context.profile.full_name || context.profile.username || "Creator";
  await apple.request("POST", "/v1/subscriptionGroupLocalizations", {
    data: {
      type: "subscriptionGroupLocalizations",
      attributes: {
        locale: context.catalogue.locale,
        name: conciseName(`${creatorName} memberships`, 75),
      },
      relationships: {
        subscriptionGroup: { data: { type: "subscriptionGroups", id: groupId } },
      },
    },
  });
}

async function ensureLocalization(
  apple: AppStoreConnectClient,
  context: JobContext,
  subscriptionId: string,
) {
  const localizations = await apple.list(
    `/v1/subscriptions/${subscriptionId}/subscriptionLocalizations?limit=200`,
  );
  if (localizations.some(
    (entry) => resourceAttributes(entry).locale === context.catalogue.locale,
  )) return;

  const creatorName = context.profile.full_name || context.profile.username || "Creator";
  await apple.request("POST", "/v1/subscriptionLocalizations", {
    data: {
      type: "subscriptionLocalizations",
      attributes: {
        locale: context.catalogue.locale,
        name: conciseName(`${creatorName} · ${context.tier.name}`, 30),
        description: conciseName(
          context.tier.description || "Members-only updates and direct creator support.",
          45,
        ),
      },
      relationships: {
        subscription: { data: { type: "subscriptions", id: subscriptionId } },
      },
    },
  });
}

async function ensurePrices(
  apple: AppStoreConnectClient,
  context: JobContext,
  subscriptionId: string,
) {
  const currency = context.tier.currency.toUpperCase();
  const territory = currencyTerritory[currency];
  if (!territory) throw new Error(`No approved base territory is configured for ${currency}`);
  const priceMinor = context.job.billing_period === "yearly"
    ? context.tier.price_yearly!
    : context.tier.price_monthly!;
  const targetPrice = (priceMinor / 100).toFixed(2);

  const pricePoints = await apple.list(
    `/v1/subscriptions/${subscriptionId}/pricePoints?filter[territory]=${territory}&limit=200`,
  );
  const basePoint = pricePoints.find((entry) => {
    const customerPrice = Number(resourceAttributes(entry).customerPrice);
    return Number.isFinite(customerPrice) && Math.abs(customerPrice - Number(targetPrice)) < 0.001;
  });
  if (!basePoint) {
    throw new Error(`Apple has no ${currency} ${targetPrice} price point for this subscription`);
  }

  const equalized = await apple.list(
    `/v1/subscriptionPricePoints/${encodeURIComponent(basePoint.id)}/equalizations?limit=200`,
  );
  const desiredPoints = [basePoint, ...equalized].filter((entry, index, rows) =>
    rows.findIndex((candidate) => candidate.id === entry.id) === index
  );
  const configured = await apple.list(
    `/v1/subscriptions/${subscriptionId}/prices?include=territory&limit=200`,
  );
  const configuredTerritories = new Set(
    configured.map((entry) => relationshipId(entry, "territory")).filter(Boolean),
  );
  const missing = desiredPoints.filter((entry) => {
    const pointTerritory = relationshipId(entry, "territory") ||
      (entry.id === basePoint.id ? territory : null);
    return pointTerritory && !configuredTerritories.has(pointTerritory);
  });

  for (const point of missing.slice(0, priceBatchSize)) {
    const pointTerritory = relationshipId(point, "territory") || territory;
    await apple.request("POST", "/v1/subscriptionPrices", {
      data: {
        type: "subscriptionPrices",
        attributes: { preserveCurrentPrice: false, planType: "MONTHLY" },
        relationships: {
          subscription: { data: { type: "subscriptions", id: subscriptionId } },
          territory: { data: { type: "territories", id: pointTerritory } },
          subscriptionPricePoint: {
            data: { type: "subscriptionPricePoints", id: point.id },
          },
        },
      },
    });
  }

  return {
    complete: missing.length <= priceBatchSize,
    configured: desiredPoints.length - Math.max(0, missing.length - priceBatchSize),
    total: desiredPoints.length,
    territories: desiredPoints
      .map((entry) => relationshipId(entry, "territory") || (entry.id === basePoint.id ? territory : null))
      .filter((value): value is string => Boolean(value)),
  };
}

async function ensureAvailability(
  apple: AppStoreConnectClient,
  subscriptionId: string,
  territories: string[],
) {
  const existing = await apple.list(
    `/v1/subscriptions/${subscriptionId}/planAvailabilities?limit=200`,
  );
  if (existing.some((entry) => resourceAttributes(entry).planType === "MONTHLY")) return;
  await apple.request("POST", "/v1/subscriptionPlanAvailabilities", {
    data: {
      type: "subscriptionPlanAvailabilities",
      attributes: { availableInNewTerritories: true, planType: "MONTHLY" },
      relationships: {
        availableTerritories: {
          data: territories.map((id) => ({ type: "territories", id })),
        },
        subscription: { data: { type: "subscriptions", id: subscriptionId } },
      },
    },
  });
}

async function ensureReviewScreenshot(
  apple: AppStoreConnectClient,
  subscriptionId: string,
) {
  let existing: { data?: JsonApiResource | JsonApiResource[] | null } = { data: null };
  try {
    existing = await apple.request(
      "GET",
      `/v1/subscriptions/${subscriptionId}/appStoreReviewScreenshot`,
    );
  } catch (error) {
    if (!String(error).includes("404 GET")) throw error;
  }
  if (existing.data && !Array.isArray(existing.data)) {
    const deliveryState = resourceAttributes(existing.data).assetDeliveryState as
      | { state?: string; errors?: unknown[] | null }
      | undefined;
    if (deliveryState?.errors?.length) {
      throw new Error("Apple rejected the membership review screenshot");
    }
    return;
  }

  const screenshot = membershipReviewScreenshotBytes();
  const reservation = await apple.request(
    "POST",
    "/v1/subscriptionAppStoreReviewScreenshots",
    {
      data: {
        type: "subscriptionAppStoreReviewScreenshots",
        attributes: {
          fileName: "pluggd-membership-review.png",
          fileSize: screenshot.byteLength,
        },
        relationships: {
          subscription: { data: { type: "subscriptions", id: subscriptionId } },
        },
      },
    },
  );
  const resource = reservation.data as JsonApiResource;
  if (!resource?.id) throw new Error("Apple did not create a review screenshot reservation");
  await apple.uploadReservedAsset(resource, screenshot);
  const checksum = createHash("md5").update(screenshot).digest("hex");
  await apple.request(
    "PATCH",
    `/v1/subscriptionAppStoreReviewScreenshots/${resource.id}`,
    {
      data: {
        type: "subscriptionAppStoreReviewScreenshots",
        id: resource.id,
        attributes: { uploaded: true, sourceFileChecksum: checksum },
      },
    },
  );
}

async function persistProvisioned(
  context: JobContext,
  groupId: string,
  subscription: JsonApiResource,
) {
  const state = String(resourceAttributes(subscription).state ?? "PREPARE_FOR_SUBMISSION");
  const active = stateIsApproved(state);
  const price = context.job.billing_period === "yearly"
    ? context.tier.price_yearly!
    : context.tier.price_monthly!;
  const now = new Date().toISOString();
  const { error: productError } = await service
    .from("membership_iap_products")
    .upsert({
      creator_id: context.job.creator_id,
      membership_tier_id: context.job.membership_tier_id,
      product_id: context.job.desired_product_id,
      status: active ? "active" : "provisioned",
      billing_period: context.job.billing_period,
      subscription_group_id: groupId,
      price_point_cents: price,
      currency: context.tier.currency.toUpperCase(),
      apple_subscription_id: subscription.id,
      apple_state: state,
      provisioning_job_id: context.job.id,
      last_synced_at: now,
      last_error: null,
      updated_at: now,
    }, { onConflict: "product_id" });
  if (productError) throw productError;

  const { error: jobError } = await service
    .from("membership_iap_provisioning_jobs")
    .update({
      status: active ? "active" : "awaiting_review",
      apple_group_id: groupId,
      apple_subscription_id: subscription.id,
      apple_state: state,
      completed_at: active ? now : null,
      next_attempt_at: active
        ? now
        : new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
      updated_at: now,
    })
    .eq("id", context.job.id);
  if (jobError) throw jobError;
}

async function processJob(apple: AppStoreConnectClient, job: ProvisioningJob) {
  const context = await loadContext(job);
  const groupId = await ensureGroup(apple, context);
  await ensureGroupLocalization(apple, context, groupId);
  const subscription = await ensureSubscription(apple, context, groupId);
  await ensureLocalization(apple, context, subscription.id);
  await ensureReviewScreenshot(apple, subscription.id);
  const prices = await ensurePrices(apple, context, subscription.id);

  if (!prices.complete) {
    const { error } = await service
      .from("membership_iap_provisioning_jobs")
      .update({
        status: "pricing",
        apple_group_id: groupId,
        apple_subscription_id: subscription.id,
        progress: { configured_prices: prices.configured, total_prices: prices.total },
        next_attempt_at: new Date(Date.now() + 15_000).toISOString(),
        locked_at: null,
        locked_by: null,
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    if (error) throw error;
    return { id: job.id, status: "pricing", ...prices };
  }

  await ensureAvailability(apple, subscription.id, prices.territories);
  const refreshed = await apple.request("GET", `/v1/subscriptions/${subscription.id}`);
  const finalSubscription = refreshed.data as JsonApiResource;
  await persistProvisioned(context, groupId, finalSubscription);
  return {
    id: job.id,
    status: stateIsApproved(resourceAttributes(finalSubscription).state)
      ? "active"
      : "awaiting_review",
    productId: job.desired_product_id,
  };
}

async function recordFailure(job: ProvisioningJob, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const terminal = job.attempts >= 8;
  await service
    .from("membership_iap_provisioning_jobs")
    .update({
      status: terminal ? "failed" : "queued",
      next_attempt_at: new Date(Date.now() + Math.min(60, 2 ** job.attempts) * 60_000).toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);
  await service
    .from("creator_membership_iap_catalogues")
    .update({ last_error: message, updated_at: new Date().toISOString() })
    .eq("creator_profile_id", job.creator_profile_id);
  return { id: job.id, status: terminal ? "failed" : "queued", error: message };
}

serve(async (request) => {
  const correlationId = generateCorrelationId();
  const logger = createSystemLogger(service, {
    component: "membership_iap_provisioner",
    feature: "membership",
    correlationId,
    message: "Creator membership App Store provisioning",
  });

  try {
    if (request.method !== "POST") return json(405, { error: "Method not allowed" });
    if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase service configuration is missing");
    assertAuthorized(request);
    const payload = await request.json().catch(() => ({}));
    const limit = Math.max(1, Math.min(3, Number(payload?.limit ?? 1)));
    const workerId = `edge:${correlationId}`;
    const { data, error } = await service.rpc("claim_membership_iap_provisioning_jobs", {
      p_limit: limit,
      p_worker_id: workerId,
    });
    if (error) throw error;

    const apple = new AppStoreConnectClient();
    const results = [];
    for (const job of (data ?? []) as ProvisioningJob[]) {
      try {
        results.push(await processJob(apple, job));
      } catch (jobError) {
        results.push(await recordFailure(job, jobError));
      }
    }
    await logger.info("membership_iap_provisioning_complete", {
      claimed: (data ?? []).length,
      results,
    });
    return json(200, { claimed: (data ?? []).length, results, correlationId });
  } catch (error) {
    await logger.error("membership_iap_provisioning_failed", error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("authorization") ? 401 : 500;
    return json(status, { error: message, correlationId });
  }
});

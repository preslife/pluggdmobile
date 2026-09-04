import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  handlePrepareBeatLicense,
  hasCompleteLicenceTerms,
  majorUnitsToMinorUnits,
  type PrepareBeatLicenseDependencies,
} from "../prepare-beat-license/handler.ts";
import {
  handleCreateBeatPurchase,
  type BeatCheckoutDependencies,
} from "../create-beat-purchase/handler.ts";
import {
  handleCreateEventCheckout,
  type EventCheckoutDependencies,
} from "../create-event-checkout/handler.ts";
import {
  handleReconcileCommerceCheckout,
  type ReconcileCheckoutDependencies,
} from "../reconcile-commerce-checkout/handler.ts";

const request = (body: unknown) =>
  new Request("https://functions.test", {
    method: "POST",
    headers: {
      Authorization: "Bearer token",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

const hybridMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260727100000_hybrid_commerce_foundation.sql",
  ),
  "utf8",
);
const productionLicenceMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260801164449_production_beat_licence_compliance.sql",
  ),
  "utf8",
);
const restrictedCommerceFunctionsMigration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260801171605_restrict_internal_commerce_functions.sql",
  ),
  "utf8",
);
const secureDownloadFunction = readFileSync(
  resolve(process.cwd(), "supabase/functions/download-signed-url/index.ts"),
  "utf8",
);
const spendCreditsFunction = readFileSync(
  resolve(process.cwd(), "supabase/functions/spend-credits/index.ts"),
  "utf8",
);

describe("hybrid commerce migration compatibility", () => {
  it("upgrades the deployed legacy ticket order schema without replacing it", () => {
    expect(hybridMigration).toContain(
      "alter table public.ticket_orders\n  add column if not exists ticket_tier_id",
    );
    expect(hybridMigration).toContain(
      "total_amount_cents = coalesce(total_amount_cents, total_cents)",
    );
    expect(hybridMigration).toContain(
      "stripe_checkout_session_id = stripe_session_id",
    );
    expect(hybridMigration).toContain(
      "create unique index if not exists ticket_orders_idempotency_uidx",
    );
    expect(hybridMigration).toContain(
      "alter table public.releases\n  add column if not exists credits_price numeric",
    );
    expect(hybridMigration).not.toContain("drop table public.ticket_orders");
  });

  it("ships complete Stripe-only production licence terms and consent evidence", () => {
    const templateSection = productionLicenceMigration.split("-- Preserve any producer-written terms")[0];
    expect(productionLicenceMigration).toContain("PLUGGD BASIC BEAT LICENCE AGREEMENT — v1.0");
    expect(productionLicenceMigration).toContain("PLUGGD EXCLUSIVE BEAT LICENCE AGREEMENT — v1.0");
    expect(productionLicenceMigration).toContain("digital_delivery_consent_text");
    expect(productionLicenceMigration).toContain("producer_authorization_snapshot");
    expect(templateSection).not.toMatch(/valid PLUGGD credits/i);
    expect(templateSection).not.toMatch(/\[Full legal text continues|\[Additional legal terms continue/i);
  });

  it("keeps internal commerce primitives off the public PostgREST surface", () => {
    expect(restrictedCommerceFunctionsMigration).toContain(
      "fn_enforce_exclusive_license_grant(uuid, uuid, uuid)",
    );
    expect(restrictedCommerceFunctionsMigration).toContain(
      "fn_resolve_sale_allocations",
    );
    expect(restrictedCommerceFunctionsMigration).toContain(
      "fn_build_license_certificate(text)",
    );
    expect(restrictedCommerceFunctionsMigration).toContain(
      "from public, anon, authenticated",
    );
    expect(restrictedCommerceFunctionsMigration).toContain("to service_role");
  });

  it("delivers beat files only after verified payment completion", () => {
    expect(secureDownloadFunction).toContain('purchase.status !== "completed"');
    expect(secureDownloadFunction).toContain(
      "Beat files are available after verified payment",
    );
  });

  it("fails closed before unlocking an ineligible or non-deliverable release", () => {
    expect(spendCreditsFunction).toContain('kind === "spend_unlock"');
    expect(spendCreditsFunction).toContain('refType !== "release"');
    expect(spendCreditsFunction).toContain('release.approved !== true');
    expect(spendCreditsFunction).toContain('release.catalogue_mode ?? "pluggd"');
    expect(spendCreditsFunction).toContain('release.catalogue_import_job_id');
    expect(spendCreditsFunction).toContain('"takedown"');
    expect(spendCreditsFunction).toContain('storageLocation(release?.download_url)');
    expect(spendCreditsFunction).toContain('.createSignedUrl(deliverable.path, 30)');
    expect(spendCreditsFunction).toContain('"RELEASE_DELIVERY_UNAVAILABLE"');
    expect(spendCreditsFunction.indexOf('kind === "spend_unlock"')).toBeLessThan(
      spendCreditsFunction.indexOf('service.rpc("spend_mobile_credits"'),
    );
  });
});

const policy = (kind: "beat_license" | "event_ticket", overrides = {}) => ({
  purchase_kind: kind,
  enabled: true,
  primary_rail: "stripe_checkout" as const,
  storefront_config: { primary: kind === "beat_license" ? ["US"] : ["*"] },
  server_flags: kind === "beat_license"
    ? {
      external_checkout_enabled: true,
      require_professional_license: true,
    }
    : {
      external_checkout_enabled: true,
      require_physical_classification: true,
    },
  policy_version: "test-v1",
  ...overrides,
});

function prepareDeps(
  overrides: Partial<PrepareBeatLicenseDependencies> = {},
): PrepareBeatLicenseDependencies {
  return {
    authenticate: async () => ({ id: "buyer" }),
    loadBeat: async () => ({
      id: "beat",
      user_id: "producer",
      title: "After Hours",
      is_published: true,
    }),
    loadLicenseOption: async () => ({
      id: "option",
      beat_id: "beat",
      license_type: "premium_lease",
      price_pence: 4900,
      is_available: true,
    }),
    loadContractTemplate: async () => ({
      template_type: "premium_lease",
      title: "Premium licence",
      legal_text: ("{artist_name} licenses {beat_title} for £{amount}. " +
        "The parties agree to the published usage rights, restrictions, deliverables, term, territory, credit, payment, warranty, liability, termination and governing-law clauses. ").repeat(5),
      features: ["100,000 streams"],
      restrictions: ["Non-exclusive"],
      deliverables: ["WAV", "Stems"],
      is_active: true,
    }),
    loadDisplayName: async (userId) =>
      userId === "producer" ? "Night Signal" : "Maya",
    findPendingContract: async () => null,
    createContract: async (input) => ({
      id: "contract",
      status: "pending",
      legal_text: String(input.legal_text),
      amount_cents: Number(input.amount_cents),
      currency: String(input.currency),
      producer_signature: String(input.producer_signature),
      artist_signature: null,
    }),
    now: () => new Date("2026-07-27T12:00:00Z"),
    ...overrides,
  };
}

function beatDeps(
  overrides: Partial<BeatCheckoutDependencies> = {},
): BeatCheckoutDependencies {
  return {
    authenticate: async () => ({ id: "buyer", email: "buyer@example.com" }),
    loadSource: async () => ({
      beat: {
        id: "beat",
        user_id: "producer",
        title: "After Hours",
        is_published: true,
      },
      option: {
        id: "option",
        beat_id: "beat",
        license_type: "premium_lease",
        price_pence: 4900,
        is_available: true,
      },
      contract: {
        id: "contract",
        beat_id: "beat",
        producer_id: "producer",
        artist_id: "buyer",
        template_type: "premium_lease",
        status: "signed",
        amount_cents: 4900,
        currency: "GBP",
        producer_signature: "catalogue-offer:option",
        artist_signature: "signed",
        digital_delivery_requested: true,
        digital_delivery_consent_text: "I request immediate access to the licensed digital files and understand the cancellation consequences.",
        digital_delivery_consent_version: "2026-08-01.1",
        digital_delivery_consented_at: "2026-07-27T11:55:00Z",
        pricing_snapshot: { license_option_id: "option" },
      },
    }),
    loadPolicy: async () => policy("beat_license"),
    loadPayoutAccount: async () => ({
      stripe_account_id: "acct_test",
      onboarding_complete: true,
      payouts_enabled: true,
    }),
    findCheckout: async () => null,
    createCheckout: async () => ({
      id: "external",
      status: "created",
      provider_metadata: {},
    }),
    createStripeSession: async () => ({
      id: "cs_beat",
      url: "https://checkout.stripe.com/beat",
    }),
    updateCheckout: async () => {},
    updateContract: async () => {},
    now: () => new Date("2026-07-27T12:00:00Z"),
    ...overrides,
  };
}

function eventDeps(
  overrides: Partial<EventCheckoutDependencies> = {},
): EventCheckoutDependencies {
  return {
    authenticate: async () => ({ id: "buyer", email: "buyer@example.com" }),
    loadSource: async () => ({
      event: {
        id: "event",
        title: "Southbank Sessions",
        commerce_classification: "physical",
      },
      tier: {
        id: "tier",
        event_id: "event",
        name: "General admission",
        price_cents: 2500,
        fee_cents: 150,
        currency: "GBP",
        capacity: 100,
        reserved_quantity: 10,
        sold_quantity: 20,
        available_quantity: 70,
        max_per_order: 4,
        is_active: true,
      },
    }),
    loadPolicy: async () => policy("event_ticket"),
    findCheckout: async () => null,
    findOrder: async () => null,
    reserveAndCreateOrder: async () => ({ id: "order", status: "reserved" }),
    createCheckout: async () => ({
      id: "external",
      status: "created",
      provider_metadata: {},
    }),
    createStripeSession: async () => ({
      id: "cs_event",
      url: "https://checkout.stripe.com/event",
    }),
    updateCheckout: async () => {},
    updateOrder: async () => {},
    releaseReservation: async () => {},
    now: () => new Date("2026-07-27T12:00:00Z"),
    ...overrides,
  };
}

describe("prepare-beat-license", () => {
  it("converts the deployed decimal catalogue price into trusted minor units", () => {
    expect(majorUnitsToMinorUnits(34.99)).toBe(3499);
    expect(majorUnitsToMinorUnits("79.99")).toBe(7999);
    expect(majorUnitsToMinorUnits(null)).toBe(0);
  });

  it("fails closed when a catalogue agreement still contains placeholder terms", async () => {
    expect(hasCompleteLicenceTerms("[Full legal text continues...]"))
      .toBe(false);
    const response = await handlePrepareBeatLicense(
      request({ beatId: "beat", licenseOptionId: "option" }),
      prepareDeps({
        loadContractTemplate: async () => ({
          template_type: "premium_lease",
          title: "Premium licence",
          legal_text: "[Full legal text continues...]",
          is_active: true,
        }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("LICENCE_TERMS_INCOMPLETE");
  });

  it("requires authentication and blocks self-purchase", async () => {
    const unauthenticated = await handlePrepareBeatLicense(
      request({ beatId: "beat", licenseOptionId: "option" }),
      prepareDeps({ authenticate: async () => null }),
    );
    expect(unauthenticated.status).toBe(401);

    const self = await handlePrepareBeatLicense(
      request({ beatId: "beat", licenseOptionId: "option" }),
      prepareDeps({
        loadBeat: async () => ({
          id: "beat",
          user_id: "buyer",
          title: "Mine",
          is_published: true,
        }),
      }),
    );
    expect(self.status).toBe(403);
  });

  it("requires explicit producer authorization before offering an Exclusive licence", async () => {
    const response = await handlePrepareBeatLicense(
      request({ beatId: "beat", licenseOptionId: "option" }),
      prepareDeps({
        loadLicenseOption: async () => ({
          id: "option",
          beat_id: "beat",
          license_type: "exclusive_rights",
          price_pence: 50000,
          is_available: true,
        }),
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("PRODUCER_AUTHORIZATION_REQUIRED");
  });

  it("uses server price/legal terms and reuses a pending contract", async () => {
    const createContract = vi.fn();
    const response = await handlePrepareBeatLicense(
      request({ beatId: "beat", licenseOptionId: "option", price: 1 }),
      prepareDeps({
        findPendingContract: async () => ({
          id: "existing",
          status: "pending",
          legal_text: ("Trusted immutable licence snapshot with complete rights, restrictions, delivery, payment, warranty, termination and governing law. ").repeat(6),
          amount_cents: 4900,
          currency: "GBP",
          producer_signature: "catalogue",
        }),
        createContract,
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).contract.id).toBe("existing");
    expect(createContract).not.toHaveBeenCalled();
  });
});

describe("create-beat-purchase", () => {
  const body = {
    beatId: "beat",
    licenseOptionId: "option",
    contractId: "contract",
    returnUrl: "pluggd://commerce/success",
    storefront: "US",
  };

  it("rejects client pricing, unsigned contracts and mismatched ownership", async () => {
    const tampered = await handleCreateBeatPurchase(
      request({ ...body, licenseFee: 1 }),
      beatDeps(),
    );
    expect(tampered.status).toBe(400);

    const unsigned = await handleCreateBeatPurchase(
      request(body),
      beatDeps({
        loadSource: async () => ({
          ...(await beatDeps().loadSource({
            beatId: "beat",
            licenseOptionId: "option",
            contractId: "contract",
          }))!,
          contract: {
            ...(await beatDeps().loadSource({
              beatId: "beat",
              licenseOptionId: "option",
              contractId: "contract",
            }))!.contract,
            status: "pending",
            artist_signature: null,
          },
        }),
      }),
    );
    expect(unsigned.status).toBe(409);

    const mismatch = await handleCreateBeatPurchase(
      request(body),
      beatDeps({
        loadSource: async () => {
          const source = (await beatDeps().loadSource({
            beatId: "beat",
            licenseOptionId: "option",
            contractId: "contract",
          }))!;
          return {
            ...source,
            contract: { ...source.contract, artist_id: "someone-else" },
          };
        },
      }),
    );
    expect(mismatch.status).toBe(403);
  });

  it("requires the separate immediate-delivery consent before checkout", async () => {
    const response = await handleCreateBeatPurchase(
      request(body),
      beatDeps({
        loadSource: async () => {
          const source = (await beatDeps().loadSource({
            beatId: "beat",
            licenseOptionId: "option",
            contractId: "contract",
          }))!;
          return {
            ...source,
            contract: {
              ...source.contract,
              digital_delivery_requested: false,
              digital_delivery_consent_text: null,
              digital_delivery_consent_version: null,
              digital_delivery_consented_at: null,
            },
          };
        },
      }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).code).toBe("DIGITAL_DELIVERY_CONSENT_REQUIRED");
  });

  it("allows only same-origin web returns from the configured site", async () => {
    const response = await handleCreateBeatPurchase(
      request({
        ...body,
        platform: "web",
        storefront: "GB",
        returnUrl: "https://pluggd.fm/beat/beat",
      }),
      beatDeps({ allowedWebOrigins: ["https://pluggd.fm"] }),
    );
    expect(response.status).toBe(200);

    const denied = await handleCreateBeatPurchase(
      request({
        ...body,
        platform: "web",
        storefront: "GB",
        returnUrl: "https://evil.test/beat/beat",
      }),
      beatDeps({ allowedWebOrigins: ["https://pluggd.fm"] }),
    );
    expect(denied.status).toBe(400);
  });

  it("defaults closed for unknown storefront and honours the kill switch", async () => {
    expect((await handleCreateBeatPurchase(
      request({ ...body, storefront: "??" }),
      beatDeps(),
    )).status).toBe(403);
    expect((await handleCreateBeatPurchase(
      request(body),
      beatDeps({
        loadPolicy: async () =>
          policy("beat_license", { server_flags: { kill_switch: true } }),
      }),
    )).status).toBe(403);
  });

  it("allowlists return URLs and reuses an open checkout", async () => {
    expect((await handleCreateBeatPurchase(
      request({ ...body, returnUrl: "https://evil.test" }),
      beatDeps(),
    )).status).toBe(400);
    const stripe = vi.fn();
    const response = await handleCreateBeatPurchase(
      request(body),
      beatDeps({
        findCheckout: async () => ({
          id: "external",
          status: "open",
          stripe_checkout_session_id: "cs_existing",
          provider_metadata: {
            checkout_url: "https://checkout.stripe.com/existing",
          },
        }),
        createStripeSession: stripe,
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).sessionId).toBe("cs_existing");
    expect(stripe).not.toHaveBeenCalled();
  });

  it("requires a payout-ready Stripe Connect account", async () => {
    const response = await handleCreateBeatPurchase(
      request(body),
      beatDeps({ loadPayoutAccount: async () => null }),
    );
    expect(response.status).toBe(409);
    expect((await response.json()).error).toMatch(/Stripe Connect/i);
  });
});

describe("create-event-checkout", () => {
  const body = {
    eventId: "event",
    ticketTypeId: "tier",
    quantity: 2,
    returnUrl: "pluggd://commerce/success",
    storefront: "GB",
  };

  it("rejects virtual events, invalid quantity and insufficient capacity", async () => {
    expect((await handleCreateEventCheckout(
      request(body),
      eventDeps({
        loadSource: async () => {
          const source = (await eventDeps().loadSource("event", "tier"))!;
          return {
            ...source,
            event: { ...source.event, commerce_classification: "virtual" },
          };
        },
      }),
    )).status).toBe(403);
    expect((await handleCreateEventCheckout(
      request({ ...body, quantity: 5 }),
      eventDeps(),
    )).status).toBe(409);
    expect((await handleCreateEventCheckout(
      request({ ...body, quantity: 3 }),
      eventDeps({
        loadSource: async () => {
          const source = (await eventDeps().loadSource("event", "tier"))!;
          return {
            ...source,
            tier: { ...source.tier, available_quantity: 2 },
          };
        },
      }),
    )).status).toBe(409);
  });

  it("validates tier ownership, sale windows, trusted pricing and the policy kill switch", async () => {
    const source = (await eventDeps().loadSource("event", "tier"))!;

    expect((await handleCreateEventCheckout(
      request(body),
      eventDeps({
        loadSource: async () => ({
          ...source,
          tier: { ...source.tier, event_id: "different-event" },
        }),
      }),
    )).status).toBe(400);

    expect((await handleCreateEventCheckout(
      request(body),
      eventDeps({
        loadSource: async () => ({
          ...source,
          tier: { ...source.tier, sale_starts_at: "2026-01-02T00:00:00.000Z" },
        }),
        now: () => new Date("2026-01-01T00:00:00.000Z"),
      }),
    )).status).toBe(409);

    expect((await handleCreateEventCheckout(
      request(body),
      eventDeps({
        loadSource: async () => ({
          ...source,
          tier: { ...source.tier, price_cents: 24.5 },
        }),
      }),
    )).status).toBe(409);

    expect((await handleCreateEventCheckout(
      request(body),
      eventDeps({
        loadPolicy: async () =>
          policy("event_ticket", { server_flags: { kill_switch: true } }),
      }),
    )).status).toBe(403);
  });

  it("rejects bad return URLs and reuses an existing session", async () => {
    expect((await handleCreateEventCheckout(
      request({ ...body, returnUrl: "https://evil.test" }),
      eventDeps(),
    )).status).toBe(400);
    const reserve = vi.fn();
    const response = await handleCreateEventCheckout(
      request(body),
      eventDeps({
        findCheckout: async () => ({
          id: "external",
          status: "open",
          stripe_checkout_session_id: "cs_existing",
          provider_metadata: {
            checkout_url: "https://checkout.stripe.com/existing",
          },
        }),
        findOrder: async () => ({ id: "order", status: "checkout_open" }),
        reserveAndCreateOrder: reserve,
      }),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).orderId).toBe("order");
    expect(reserve).not.toHaveBeenCalled();
  });

  it("releases reserved inventory when Stripe session creation fails", async () => {
    const releaseReservation = vi.fn(async () => {});
    await expect(handleCreateEventCheckout(
      request(body),
      eventDeps({
        releaseReservation,
        createStripeSession: async () => {
          throw new Error("Stripe unavailable");
        },
      }),
    )).rejects.toThrow("Stripe unavailable");
    expect(releaseReservation).toHaveBeenCalledWith({
      orderId: "order",
      ticketTierId: "tier",
      quantity: 2,
    });
  });
});

describe("reconcile-commerce-checkout", () => {
  it("requires ownership and ignores client kind/item claims", async () => {
    const lookup = vi.fn(async (userId: string) =>
      userId === "buyer"
        ? {
          id: "external",
          user_id: "buyer",
          purchase_kind: "beat_license",
          resource_id: "real-beat",
          variant_id: "real-option",
          quantity: 1,
          amount_cents: 4900,
          currency: "GBP",
          stripe_checkout_session_id: "cs_real",
          status: "completed",
        }
        : null);
    const deps: ReconcileCheckoutDependencies = {
      authenticate: async () => ({ id: "buyer" }),
      loadOwnedCheckout: lookup,
      loadEntitlement: async () => ({ active: true }),
    };
    const response = await handleReconcileCommerceCheckout(
      request({
        sessionId: "cs_real",
        purchaseKind: "physical_merch",
        itemId: "fake-item",
      }),
      deps,
    );
    const result = await response.json();
    expect(result.purchaseKind).toBe("beat_license");
    expect(result.itemId).toBe("real-beat");
    expect(lookup).toHaveBeenCalledWith("buyer", "cs_real");

    const missing = await handleReconcileCommerceCheckout(
      request({ sessionId: "cs_other" }),
      { ...deps, loadOwnedCheckout: async () => null },
    );
    expect(missing.status).toBe(404);
  });
});

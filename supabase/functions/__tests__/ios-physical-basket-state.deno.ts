import {
  expireHybridCheckout,
  reinstateHybridCheckout,
  reverseHybridCheckout,
} from "../stripe-webhook/hybridCommerce.ts";

const assert = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};

const logger = {
  info: async () => {},
  warn: async () => {},
  error: async () => {},
};

function checkoutQuery(result: unknown, calls: string[]) {
  const query: Record<string, any> = {};
  query.select = () => query;
  query.eq = (column: string, value: unknown) => {
    calls.push(`eq:${column}:${String(value)}`);
    return query;
  };
  query.maybeSingle = async () => ({ data: result, error: null });
  return query;
}

Deno.test("refund-before-completion resolves the trusted checkout ID and releases atomically", async () => {
  const calls: string[] = [];
  let lookup = 0;
  const checkout = {
    id: "10000000-0000-4000-8000-000000000001",
    user_id: "10000000-0000-4000-8000-000000000002",
    purchase_kind: "physical_merch",
    amount_cents: 2500,
    status: "open",
    stripe_payment_intent_id: null,
    provider_metadata: {
      ios_physical_basket: true,
      inventory_state: "reserved",
      order_id: "10000000-0000-4000-8000-000000000003",
    },
  };
  const client = {
    from: (table: string) => {
      assert(table === "external_checkout_sessions", "unexpected direct table write");
      lookup += 1;
      return checkoutQuery(lookup === 1 ? null : checkout, calls);
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      calls.push(`rpc:${name}:${String(args.p_checkout_status)}`);
      return { data: { status: "refunded" }, error: null };
    },
  };

  const processed = await reverseHybridCheckout(
    client,
    "pi_refund_first",
    2500,
    "refund",
    logger,
    checkout.id,
  );
  assert(processed, "refund should be processed");
  assert(
    calls.includes(`eq:id:${checkout.id}`),
    "provider checkout ID fallback was not used",
  );
  assert(
    calls.includes("rpc:release_ios_physical_basket_inventory:refunded"),
    "full refund did not use the atomic inventory release",
  );
});

Deno.test("inventory release failure leaves expiry unrecorded for webhook retry", async () => {
  const calls: string[] = [];
  const checkout = {
    id: "20000000-0000-4000-8000-000000000001",
    purchase_kind: "physical_merch",
    status: "open",
    provider_metadata: { ios_physical_basket: true, inventory_state: "reserved" },
  };
  const client = {
    from: (table: string) => {
      calls.push(`from:${table}`);
      return checkoutQuery(checkout, calls);
    },
    rpc: async (name: string) => {
      calls.push(`rpc:${name}`);
      return { data: null, error: { message: "injected rollback" } };
    },
  };

  let rejected = false;
  try {
    await expireHybridCheckout(
      client,
      {
        id: "cs_failed_release",
        metadata: { external_checkout_id: checkout.id },
      },
      logger,
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "release failure must reject for webhook replay");
  assert(
    calls.filter((call) => call === "from:external_checkout_sessions").length === 1,
    "checkout was marked expired after the atomic release failed",
  );
  assert(
    calls.includes(`eq:id:${checkout.id}`) &&
      !calls.some((call) => call.startsWith("eq:stripe_checkout_session_id:")),
    "signed checkout ID fallback was not preserved for an unlinked provider session",
  );
});

Deno.test("a mismatched linked provider session cannot expire trusted inventory", async () => {
  const calls: string[] = [];
  const checkout = {
    id: "25000000-0000-4000-8000-000000000001",
    purchase_kind: "physical_merch",
    status: "open",
    stripe_checkout_session_id: "cs_trusted",
    provider_metadata: { ios_physical_basket: true, inventory_state: "reserved" },
  };
  const client = {
    from: () => checkoutQuery(checkout, calls),
    rpc: async () => {
      calls.push("unexpected:release");
      return { data: null, error: null };
    },
  };

  let rejected = false;
  try {
    await expireHybridCheckout(
      client,
      {
        id: "cs_attacker",
        metadata: { external_checkout_id: checkout.id },
      },
      logger,
    );
  } catch {
    rejected = true;
  }
  assert(rejected, "mismatched provider session must be rejected");
  assert(!calls.includes("unexpected:release"), "mismatched session released inventory");
});

Deno.test("dispute-win marker is written only after the physical order succeeds", async () => {
  const calls: string[] = [];
  const checkout = {
    id: "30000000-0000-4000-8000-000000000001",
    user_id: "30000000-0000-4000-8000-000000000002",
    purchase_kind: "physical_merch",
    status: "disputed",
    stripe_payment_intent_id: "pi_disputed",
    provider_metadata: {
      ios_physical_basket: true,
      order_id: "30000000-0000-4000-8000-000000000003",
    },
  };
  const client = {
    from: (table: string) => {
      calls.push(`from:${table}`);
      if (table === "external_checkout_sessions") {
        return checkoutQuery(checkout, calls);
      }
      if (table === "orders") {
        const query: Record<string, any> = {};
        query.update = () => query;
        query.eq = () => query;
        query.select = async () => ({ data: null, error: { message: "injected order failure" } });
        return query;
      }
      throw new Error(`unexpected table ${table}`);
    },
  };

  let rejected = false;
  try {
    await reinstateHybridCheckout(client, "pi_disputed", logger);
  } catch {
    rejected = true;
  }
  assert(rejected, "order failure must reject for webhook replay");
  assert(
    calls.filter((call) => call === "from:external_checkout_sessions").length === 1,
    "checkout was marked complete before the order recovered",
  );
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { useMembershipTiers } from "@/hooks/useMembershipTiers";
import type { UpsertMembershipTierInput } from "@/hooks/useMembershipTiers";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
    loading: false,
  }),
}));

vi.mock("@/contexts/StudioContext", () => ({
  useOptionalStudioContext: () => undefined,
}));

const createResponse = <T,>(data: T) => ({ data, error: null });

const createDeferred = <T,>() => {
  let resolve: (value: T | PromiseLike<T>) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
};

vi.mock("@/integrations/supabase/client", () => {
  const state: { data: any[] } = { data: [] };

  const createBuilder = () => {
    const result = Promise.resolve(createResponse(state.data));
    const builder: any = {
      eq: () => builder,
      order: () => builder,
      then: (onFulfilled: any, onRejected: any) => result.then(onFulfilled, onRejected),
      catch: (onRejected: any) => result.catch(onRejected),
    };
    return builder;
  };

  const fromMock = vi.fn(() => ({
    select: vi.fn(() => createBuilder()),
  }));

  const rpcMock = vi.fn();

  return {
    supabase: {
      from: fromMock,
      rpc: rpcMock,
    },
    supabaseMockUtils: {
      setSelectResponse: (data: any[]) => {
        state.data = data;
      },
      rpcMock,
      fromMock,
    },
  };
});

interface SupabaseTierRow {
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
  features: string[];
  created_at: string;
  updated_at: string;
  stripe_product_id: string | null;
  stripe_price_monthly_id: string | null;
  stripe_price_yearly_id: string | null;
  stripe_price_lifetime_id: string | null;
}

describe("useMembershipTiers", () => {
  const supabaseModule = (await import("@/integrations/supabase/client")) as any;
  const { setSelectResponse, rpcMock } = supabaseModule.supabaseMockUtils as {
    setSelectResponse: (data: any[]) => void;
    rpcMock: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    setSelectResponse([]);
    rpcMock.mockReset();
  });

  const baseTierRow = (): SupabaseTierRow => ({
    id: "tier-001",
    owner_type: "profile",
    owner_id: "user-123",
    name: "Gold",
    slug: "gold",
    description: "",
    tier_order: 0,
    price_monthly: 999,
    price_yearly: null,
    price_lifetime: null,
    currency: "USD",
    status: "active",
    max_members: null,
    current_members: 0,
    color: null,
    emoji: null,
    image_url: null,
    features: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    stripe_product_id: "prod_123",
    stripe_price_monthly_id: "price_monthly_123",
    stripe_price_yearly_id: null,
    stripe_price_lifetime_id: null,
  });

  const createInput = (): UpsertMembershipTierInput => ({
    name: "Gold",
    priceMonthly: 9.99,
    status: "active",
    features: ["Perk"],
  });

  it("performs optimistic create and reconciles with server", async () => {
    const deferred = createDeferred(createResponse(baseTierRow()));

    rpcMock.mockImplementation((fn: string) => {
      if (fn === "create_membership_tier") {
        return deferred.promise;
      }
      return Promise.resolve(createResponse(null));
    });

    const { result } = renderHook(() => useMembershipTiers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const payload = createInput();
    let createPromise: Promise<void>;

    await act(async () => {
      createPromise = result.current.createTier(payload);
    });

    expect(result.current.tiers).toHaveLength(1);
    expect(result.current.tiers[0].id).toMatch(/^optimistic-/);

    const serverRow = baseTierRow();
    setSelectResponse([serverRow]);
    deferred.resolve(createResponse(serverRow));

    await act(async () => {
      await createPromise;
    });

    await waitFor(() => expect(result.current.tiers[0].id).toBe(serverRow.id));
    expect(result.current.tiers[0].stripe_product_id).toBe("prod_123");
  });

  it("reverts optimistic create on error and exposes the message", async () => {
    rpcMock.mockImplementation((fn: string) => {
      if (fn === "create_membership_tier") {
        return Promise.resolve({ data: null, error: { message: "Stripe failure" } });
      }
      return Promise.resolve(createResponse(null));
    });

    const { result } = renderHook(() => useMembershipTiers());

    await waitFor(() => expect(result.current.loading).toBe(false));

    const payload = createInput();
    let createPromise: Promise<void>;

    await act(async () => {
      createPromise = result.current.createTier(payload);
    });

    await expect(createPromise).rejects.toThrow("Stripe failure");

    await waitFor(() => expect(result.current.tiers).toHaveLength(0));
    expect(result.current.error).toBe("Stripe failure");
  });
});

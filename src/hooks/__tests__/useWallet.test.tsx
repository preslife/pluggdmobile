import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, beforeEach, vi } from "vitest";

import { WalletProvider, useWallet } from "@/hooks/useWallet";

const loggerSpies = vi.hoisted(() => ({
  logEvent: vi.fn(),
  logError: vi.fn(),
  logWarn: vi.fn(),
  logDebug: vi.fn(),
  logUserAction: vi.fn(),
  logPerformance: vi.fn(),
  logApiCall: vi.fn(),
  trackPromise: vi.fn(async (_event: string, operation: () => Promise<any>) => operation()),
}));

vi.mock("@/hooks/useLogger", () => ({
  useLogger: () => ({
    logger: {} as any,
    correlationId: "wallet-test-correlation",
    ...loggerSpies,
    trackPromise: loggerSpies.trackPromise,
  }),
  loggerSpies,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123" },
  }),
}));

const toastMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const defaultBalance = vi.hoisted(() => ({ balance_credits: 500, pending_credits: 0, available_credits: 500 }));
const balanceState = vi.hoisted(() => ({
  data: { ...defaultBalance },
  error: null as any,
}));
const ledgerState = vi.hoisted(() => ({ data: [] as any[], error: null as any }));
const functionResponses = vi.hoisted(() => new Map<string, { data: any; error: any }>());

const createLedgerBuilder = () => {
  const result = ledgerState.error
    ? Promise.resolve({ data: null, error: ledgerState.error })
    : Promise.resolve({ data: ledgerState.data, error: null });
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (onFulfilled: any, onRejected: any) => result.then(onFulfilled, onRejected),
    catch: (onRejected: any) => result.catch(onRejected),
  };
  return builder;
};

const rpcMock = vi.hoisted(() =>
  vi.fn(async (fn: string) => {
    if (fn === "get_wallet_balance") {
      if (balanceState.error) {
        return { data: null, error: balanceState.error };
      }
      return { data: balanceState.data, error: null };
    }
    return { data: null, error: null };
  })
);

const fromMock = vi.hoisted(() => vi.fn(() => createLedgerBuilder()));

const functionsInvokeMock = vi.hoisted(() =>
  vi.fn(async (fn: string) => {
    const response = functionResponses.get(fn) ?? { data: null, error: null };
    return response;
  })
);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: rpcMock,
    from: fromMock,
    functions: {
      invoke: functionsInvokeMock,
    },
  },
  supabaseMockUtils: {
    setBalanceError: (error: any) => {
      balanceState.error = error;
    },
    setBalanceData: (data: { balance_credits: number; pending_credits: number; available_credits: number }) => {
      balanceState.data = data;
    },
    setLedgerError: (error: any) => {
      ledgerState.error = error;
    },
    setLedgerData: (data: any[]) => {
      ledgerState.data = data;
    },
    setFunctionResponse: (fn: string, response: { data: any; error: any }) => {
      functionResponses.set(fn, response);
    },
    reset: () => {
      balanceState.error = null;
      balanceState.data = { ...defaultBalance };
      ledgerState.error = null;
      ledgerState.data = [];
      functionResponses.clear();
    },
  },
}));

vi.mock("@/services/credits/credit-system", () => ({
  creditSystem: {
    spendCredits: vi.fn(async () => ({ ledgerEntryId: "ledger-1", manualEntryId: null })),
  },
}));

const wrapper = ({ children }: { children: ReactNode }) => <WalletProvider>{children}</WalletProvider>;

describe("useWallet", () => {
  let supabaseUtils: any;
  const resetSpies = () => {
    Object.values(loggerSpies).forEach((spy) => {
      (spy as ReturnType<typeof vi.fn>).mockClear();
    });
    toastMock.mockReset();
    rpcMock.mockClear();
    fromMock.mockClear();
    functionsInvokeMock.mockClear();
    supabaseUtils.reset();
  };

  beforeEach(async () => {
    ({ supabaseMockUtils: supabaseUtils } = (await import("@/integrations/supabase/client")) as any);
    resetSpies();
  });

  it("tracks balance and ledger fetches via trackPromise on mount", async () => {
    renderHook(() => useWallet(), { wrapper });

    await waitFor(() => {
      expect(loggerSpies.trackPromise).toHaveBeenCalledWith(
        "wallet_balance_fetch",
        expect.any(Function),
        expect.objectContaining({ user_id: "user-123" })
      );
    });

    expect(loggerSpies.trackPromise).toHaveBeenCalledWith(
      "wallet_ledger_fetch",
      expect.any(Function),
      expect.objectContaining({ user_id: "user-123", limit: 50 })
    );
  });

  it("logs spend denial when credits are insufficient", async () => {
    supabaseUtils.setBalanceData({ balance_credits: 0, pending_credits: 0, available_credits: 0 });
    const { result } = renderHook(() => useWallet(), { wrapper });

    await waitFor(() =>
      expect(loggerSpies.trackPromise).toHaveBeenCalledWith(
        "wallet_balance_fetch",
        expect.any(Function),
        expect.objectContaining({ user_id: "user-123" })
      )
    );
    loggerSpies.logEvent.mockClear();

    const response = await result.current.spendCredits(100, "spend_purchase");

    expect(response).toEqual({ success: false, error: "Insufficient credits" });
    expect(loggerSpies.logEvent).toHaveBeenCalledWith(
      "wallet_spend_denied",
      expect.objectContaining({ reason: "insufficient_credits", amount: 100 })
    );
  });

  it("logs cash-out failures with metadata", async () => {
    supabaseUtils.setFunctionResponse("cash-out-credits", { data: null, error: new Error("payout blocked") });

    const { result } = renderHook(() => useWallet(), { wrapper });

    await result.current.cashOutCredits(250);

    expect(loggerSpies.logError).toHaveBeenCalledWith(
      "wallet_cashout_failed",
      expect.any(Error),
      expect.objectContaining({ user_id: "user-123", amount: 250 })
    );
  });
});

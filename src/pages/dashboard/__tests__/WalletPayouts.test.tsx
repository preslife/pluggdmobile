import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import WalletPayoutsPage from "../WalletPayouts";

const { limitMock, queryBuilder, fromMock } = vi.hoisted(() => {
  const limitMock = vi.fn();
  const builder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: limitMock,
  };
  const fromMock = vi.fn(() => builder);
  return { limitMock, queryBuilder: builder, fromMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: any[]) => fromMock(...args),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "demo@example.com" },
  }),
}));

const walletState: any = vi.hoisted(() => ({
  balance: { balance_credits: 15000, available_credits: 12000, pending_credits: 3000 },
  ledger: [
    {
      id: "ledger-1",
      kind: "topup",
      amount_credits: 15000,
      created_at: "2024-08-10T10:00:00.000Z",
    },
  ],
  loading: false,
  refreshBalance: vi.fn(),
  refreshLedger: vi.fn(),
  topUpCredits: vi.fn(),
  spendCredits: vi.fn(),
  cashOutCredits: vi.fn(),
  applyCreditsToSubscription: vi.fn(),
}));

vi.mock("@/hooks/useWallet", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useWallet")>("@/hooks/useWallet");
  return {
    ...actual,
    useWallet: () => walletState,
  };
});

vi.mock("@/components/DomainAwareNavigation", () => ({
  __esModule: true,
  default: () => <div data-testid="domain-nav" />,
}));

vi.mock("@/lib/seo", () => ({
  setMeta: vi.fn(),
}));

const createClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

describe("WalletPayoutsPage", () => {
  beforeEach(() => {
    limitMock.mockReset();
    fromMock.mockClear();
    queryBuilder.select.mockReturnThis();
    queryBuilder.eq.mockReturnThis();
    queryBuilder.order.mockReturnThis();
    Object.assign(walletState, {
      balance: { balance_credits: 15000, available_credits: 12000, pending_credits: 3000 },
      ledger: [
        {
          id: "ledger-1",
          kind: "topup",
          amount_credits: 15000,
          created_at: "2024-08-10T10:00:00.000Z",
        },
      ],
      loading: false,
    });
  });

  it("renders payout history data", async () => {
    limitMock.mockResolvedValue({
      data: [
        {
          id: "payout-1",
          amount: 3200,
          payout_status: "paid",
          payout_method: "stripe",
          payout_reference: "po-123",
          processed_at: "2024-08-11T12:00:00.000Z",
          created_at: "2024-08-11T11:00:00.000Z",
          user_id: "user-123",
          beat_id: null,
          purchase_id: null,
        },
      ],
      error: null,
    });

    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <WalletPayoutsPage />
      </QueryClientProvider>
    );

    const rows = await screen.findAllByTestId("dashboard-payout-row");
    expect(rows).toHaveLength(1);
    expect(screen.getByText("po-123")).toBeInTheDocument();
    expect(screen.getByText(/Paid out/)).toBeInTheDocument();
  });

  it("shows an empty state when no payouts exist", async () => {
    limitMock.mockResolvedValue({ data: [], error: null });

    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <WalletPayoutsPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText(/No payouts yet/)).toBeInTheDocument());
    expect(fromMock).toHaveBeenCalledWith("payout_records");
  });
});

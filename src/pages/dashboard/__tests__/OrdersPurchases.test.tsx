import { describe, expect, it, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import OrdersPurchasesPage from "../OrdersPurchases";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-123", email: "demo@example.com" },
  }),
}));

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

describe("OrdersPurchasesPage", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  const renderPage = async () => {
    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <OrdersPurchasesPage />
      </QueryClientProvider>
    );

    // wait for any pending promises to resolve by flushing microtasks
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
  };

  it("renders orders returned from Supabase", async () => {
    rpcMock.mockResolvedValue({
      data: [
        {
          order_id: "ord_123",
          created_at: "2024-08-12T10:00:00.000Z",
          status: "completed",
          total_amount: 5400,
          currency: "GBP",
          item_count: 2,
          items: [
            { id: "item_1", title: "Sample Pack", quantity: 1, price: 3000 },
            { id: "item_2", title: "Drum Kit", quantity: 1, price: 2400 },
          ],
          payment_provider: "stripe",
          paid_at: "2024-08-12T10:01:00.000Z",
        },
      ],
      error: null,
    });

    await renderPage();

    const rows = await screen.findAllByTestId("dashboard-order-row");
    expect(rows).toHaveLength(1);
    expect(screen.getByText("ord_123")).toBeInTheDocument();
    expect(screen.getByText(/Sample Pack/)).toBeInTheDocument();
  });

  it("shows an empty state when no orders exist", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <OrdersPurchasesPage />
      </QueryClientProvider>
    );

    await waitFor(() => expect(screen.getByText("You're all set")).toBeInTheDocument());
    expect(rpcMock).toHaveBeenCalledWith("get_orders_for_user", expect.any(Object));
  });
});

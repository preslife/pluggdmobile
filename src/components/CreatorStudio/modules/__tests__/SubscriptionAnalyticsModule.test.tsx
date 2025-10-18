import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, cleanup } from "@testing-library/react";
import React from "react";

import { SubscriptionAnalyticsModule } from "../SubscriptionAnalyticsModule";

vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div data-testid="grid" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => <div data-testid="tooltip" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Legend: () => <div data-testid="legend" />,
}));

const mockUseAuth = vi.fn();
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => mockUseAuth(),
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const { module: loggerMockModule, helpers: loggerHelpers } = vi.hoisted(() => {
  const loggerInfo = vi.fn();
  const loggerWarn = vi.fn();
  const loggerError = vi.fn();

  return {
    module: {
      logger: {
        info: loggerInfo,
        warn: loggerWarn,
        error: loggerError,
      },
    },
    helpers: { loggerInfo, loggerWarn, loggerError },
  };
});

vi.mock("@/lib/logger", () => loggerMockModule);

const { loggerInfo, loggerWarn, loggerError } = loggerHelpers;

const { module: supabaseClientMock, helpers: supabaseHelpers } = vi.hoisted(() => {
  const selectMock = vi.fn();
  const eqMock = vi.fn();
  const gteMock = vi.fn();
  const orderMock = vi.fn();
  const fromMock = vi.fn();

  const queryBuilder = {
    select: selectMock,
    eq: eqMock,
    gte: gteMock,
    order: orderMock,
  };

  selectMock.mockReturnValue(queryBuilder);
  eqMock.mockReturnValue(queryBuilder);
  gteMock.mockReturnValue(queryBuilder);
  fromMock.mockReturnValue(queryBuilder);

  return {
    module: {
      supabase: {
        from: fromMock,
      },
    },
    helpers: {
      selectMock,
      eqMock,
      gteMock,
      orderMock,
      fromMock,
      queryBuilder,
    },
  };
});

vi.mock("@/integrations/supabase/client", () => supabaseClientMock);

const { selectMock, eqMock, gteMock, orderMock, fromMock, queryBuilder } = supabaseHelpers;

describe("SubscriptionAnalyticsModule", () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ user: { id: "user-123" } });
    toastMock.mockReset();
    loggerInfo.mockReset();
    loggerWarn.mockReset();
    loggerError.mockReset();
    orderMock.mockReset();
    selectMock.mockClear();
    eqMock.mockClear();
    gteMock.mockClear();
    fromMock.mockClear();
    fromMock.mockReturnValue(queryBuilder);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders KPI summaries when analytics rows are available", async () => {
    orderMock.mockResolvedValueOnce({
      data: [
        { metric_date: "2024-01-01", kpi_key: "active_subscriptions", total_value: 12 },
        { metric_date: "2024-01-01", kpi_key: "churned_fans", total_value: 1 },
        { metric_date: "2024-01-01", kpi_key: "fan_revenue_cents", total_value: 5000 },
        { metric_date: "2024-01-02", kpi_key: "active_subscriptions", total_value: 15 },
        { metric_date: "2024-01-02", kpi_key: "churned_fans", total_value: 2 },
        { metric_date: "2024-01-02", kpi_key: "fan_revenue_cents", total_value: 7000 },
      ],
      error: null,
    });

    render(<SubscriptionAnalyticsModule />);

    await waitFor(() =>
      expect(screen.getByTestId("subscription-analytics-active_subscriptions")).toHaveTextContent("15")
    );

    expect(screen.getByTestId("subscription-analytics-churned_fans")).toHaveTextContent("3");
    expect(screen.getByTestId("subscription-analytics-fan_revenue_cents")).toHaveTextContent("$120");
    expect(loggerInfo).toHaveBeenCalledWith("subscription_analytics.fetch_success", expect.any(Object));
  });

  it("surfaces an error and shows retry when all tables fail", async () => {
    orderMock.mockResolvedValue({ data: null, error: { message: "missing view" } });

    render(<SubscriptionAnalyticsModule />);

    await waitFor(() => expect(screen.getByText(/Unable to load subscription analytics/i)).toBeInTheDocument());
    expect(screen.getByText(/missing view/i)).toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "destructive",
      })
    );
    expect(loggerError).toHaveBeenCalledWith(
      "subscription_analytics.fetch_failed",
      expect.objectContaining({ message: "missing view" })
    );
  });
});

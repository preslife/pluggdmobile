import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithLocale } from "../utils/renderWithLocale";

const walletState = {
  balance: {
    balance_credits: 12345,
    available_credits: 6789,
    pending_credits: 200,
  },
  ledger: [],
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "wallet-user" } }),
}));

vi.mock("@/hooks/useLogger", () => ({
  useLogger: () => ({
    logEvent: vi.fn(),
    logError: vi.fn(),
    logUserAction: vi.fn(),
    trackPromise: vi.fn((_, fn) => fn()),
  }),
}));

vi.mock("@/hooks/useWallet", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useWallet")>("@/hooks/useWallet");
  return {
    ...actual,
    useWallet: () => ({
      ...walletState,
      loading: false,
      refreshBalance: vi.fn(),
      refreshLedger: vi.fn(),
      topUpCredits: vi.fn(),
      spendCredits: vi.fn(),
      cashOutCredits: vi.fn(),
      applyCreditsToSubscription: vi.fn(),
    }),
  };
});

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: any) => <div>{children}</div>,
  TabsContent: ({ children }: any) => <div>{children}</div>,
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: any) => <div>{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
  AlertTitle: ({ children }: any) => <strong>{children}</strong>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("@/components/WalletOverview", () => ({
  WalletOverview: () => <section data-testid="wallet-overview" />,
}));

vi.mock("@/components/WalletActivity", () => ({
  WalletActivity: () => <section data-testid="wallet-activity" />,
}));

vi.mock("@/components/WalletTopUp", () => ({
  WalletTopUp: () => <section data-testid="wallet-topup" />,
}));

vi.mock("@/components/WalletCashOut", () => ({
  WalletCashOut: () => <section data-testid="wallet-cashout" />,
}));

vi.mock("lucide-react", () => ({
  Wallet: () => <span />, 
  CreditCard: () => <span />, 
  Upload: () => <span />, 
  Download: () => <span />, 
  ShieldCheck: () => <span />, 
  History: () => <span />, 
}));

import WalletPage from "@/pages/Wallet";

describe("Wallet page localisation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows english balance copy and formatting", async () => {
    renderWithLocale(<WalletPage />, { locale: "en-GB" });

    expect(await screen.findByRole("heading", { name: "Wallet" })).toBeInTheDocument();
    expect(screen.getByText("Total Balance")).toBeInTheDocument();
    expect(screen.getByText("12,345 credits (£123.45)")).toBeInTheDocument();
  });

  it("shows spanish balance copy and formatting", async () => {
    renderWithLocale(<WalletPage />, { locale: "es-ES" });

    expect(await screen.findByRole("heading", { name: "Billetera" })).toBeInTheDocument();
    expect(screen.getByText("Saldo total")).toBeInTheDocument();
    expect(screen.getByText("12.345 credits (£123.45)")).toBeInTheDocument();
  });
});

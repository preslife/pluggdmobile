import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LibraryPage from "../Library";

const hoistedMocks = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  toastMock: vi.fn(),
  trackMock: vi.fn(),
  ensureLoadedMock: vi.fn(),
  refreshMock: vi.fn(),
  addToQueueMock: vi.fn(),
  useLibraryMock: vi.fn(),
}));

vi.mock("@/components/DomainAwareNavigation", () => ({
  default: () => <nav data-testid="domain-aware-navigation" />,
}));

vi.mock("@/components/checkout/CreditBalance", () => ({
  CreditBalance: () => <div data-testid="credit-balance" />,
}));

vi.mock("@/components/DownloadTracker", () => ({
  DownloadTracker: () => <div data-testid="download-tracker" />,
}));

vi.mock("@/components/ReceiptViewer", () => ({
  ReceiptViewer: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/PlaylistModal", () => ({
  PlaylistModal: () => null,
}));

vi.mock("@/components/ui/badge", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    Badge: ({ children, ...props }: any) => React.createElement("span", props, children),
  };
});

vi.mock("@/components/ui/button", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const Button = React.forwardRef<HTMLButtonElement, any>(
    ({ children, asChild, variant, size, ...props }, ref) =>
      React.createElement("button", { ...props, ref }, children)
  );
  Button.displayName = "MockButton";
  return { Button };
});

vi.mock("@/components/ui/card", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const Div = React.forwardRef<HTMLDivElement, any>((props, ref) =>
    React.createElement("div", { ...props, ref }, props.children)
  );
  Div.displayName = "MockCardDiv";
  return {
    Card: Div,
    CardContent: Div,
    CardHeader: Div,
    CardTitle: ({ children, ...props }: any) => React.createElement("h3", props, children),
  };
});

vi.mock("@/components/ui/input", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    Input: (props: any) => React.createElement("input", props),
  };
});

vi.mock("@/components/ui/scroll-area", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const ScrollArea = React.forwardRef<HTMLDivElement, any>(
    ({ children, ...props }, ref) => React.createElement("div", { ...props, ref }, children)
  );
  ScrollArea.displayName = "MockScrollArea";
  return { ScrollArea };
});

vi.mock("@/components/ui/tabs", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const Tabs = React.forwardRef<HTMLDivElement, any>(
    ({ children, onValueChange, value, defaultValue, ...props }, ref) =>
      React.createElement("div", { ...props, ref }, children)
  );
  Tabs.displayName = "MockTabs";
  const TabsContent = React.forwardRef<HTMLDivElement, any>(
    ({ children, value, ...props }, ref) => React.createElement("div", { ...props, ref }, children)
  );
  TabsContent.displayName = "MockTabsContent";
  const TabsList = React.forwardRef<HTMLDivElement, any>(
    ({ children, ...props }, ref) => React.createElement("div", { ...props, ref }, children)
  );
  TabsList.displayName = "MockTabsList";
  const TabsTrigger = React.forwardRef<HTMLButtonElement, any>(
    ({ children, value, ...props }, ref) => React.createElement("button", { ...props, ref }, children)
  );
  TabsTrigger.displayName = "MockTabsTrigger";
  return {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  };
});

vi.mock("@/components/ui/tooltip", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  const Passthrough = React.forwardRef<HTMLDivElement, any>(({ children, ...props }, ref) =>
    React.createElement("div", { ...props, ref }, children)
  );
  Passthrough.displayName = "MockTooltipDiv";

  const TooltipTrigger = React.forwardRef<any, any>(({ children, asChild, ...props }, ref) => {
    if (asChild) {
      return React.isValidElement(children)
        ? React.cloneElement(children, { ...props })
        : React.createElement(React.Fragment, null, children);
    }
    return React.createElement("button", { ...props, ref }, children);
  });
  TooltipTrigger.displayName = "MockTooltipTrigger";

  return {
    Tooltip: Passthrough,
    TooltipContent: Passthrough,
    TooltipProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
    TooltipTrigger,
  };
});

vi.mock("@/components/ui/skeleton", async () => {
  const React = await vi.importActual<typeof import("react")>("react");
  return {
    Skeleton: ({ children, ...props }: any) => React.createElement("div", props, children),
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));

vi.mock("@/hooks/useAnalytics", () => ({
  default: () => ({ track: hoistedMocks.trackMock }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: hoistedMocks.toastMock }),
}));

vi.mock("@/components/GlobalPlayer/GlobalPlayer", () => ({
  useGlobalPlayer: () => ({ actions: { addToQueue: hoistedMocks.addToQueueMock } }),
}));

vi.mock("@/lib/seo", () => ({
  setMeta: vi.fn(),
}));

vi.mock("@/services/library", () => ({
  useLibrary: hoistedMocks.useLibraryMock,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: hoistedMocks.invokeMock,
    },
  },
}));

describe("LibraryPage downloads", () => {
  const releaseItem = {
    id: "purchase-1",
    type: "release" as const,
    productId: "release-1",
    title: "Skyline",
    creatorName: "Artist",
    artworkUrl: null,
    tags: null,
    genre: "Electronic",
    purchaseDate: "2024-07-10T00:05:00Z",
    pricePaid: 1500,
    downloadSourcePath: null,
    previewUrl: null,
    canDownload: true,
    downloadCount: 1,
    maxDownloads: 3,
    downloadExpiresAt: null,
    lastDownloadedAt: null,
    licenseUrl: null,
    receiptUrl: "https://example.com/receipt.pdf",
  };

  let openSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    hoistedMocks.invokeMock.mockReset();
    hoistedMocks.toastMock.mockReset();
    hoistedMocks.trackMock.mockReset();
    hoistedMocks.ensureLoadedMock.mockReset();
    hoistedMocks.refreshMock.mockReset();
    hoistedMocks.addToQueueMock.mockReset();
    hoistedMocks.ensureLoadedMock.mockResolvedValue(undefined);
    hoistedMocks.refreshMock.mockResolvedValue(undefined);
    hoistedMocks.useLibraryMock.mockReturnValue({
      items: [releaseItem],
      itemsByType: {
        release: [releaseItem],
        beat: [],
        sample_pack: [],
        membership: [],
        course: [],
        campaign: [],
      },
      loading: false,
      loadingByType: {
        release: false,
        beat: false,
        sample_pack: false,
        membership: false,
        course: false,
        campaign: false,
        all: false,
      },
      error: null,
      ensureLoaded: hoistedMocks.ensureLoadedMock,
      refresh: hoistedMocks.refreshMock,
    });

    hoistedMocks.invokeMock.mockImplementation(async (name: string) => {
      if (name === "download-signed-url") {
        return { data: { signedUrl: "https://example.com/signed.zip" }, error: null };
      }
      if (name === "request-download-reset") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    });

    openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
  });

  afterEach(() => {
    openSpy.mockRestore();
  });

  it("requests a signed URL for completed releases without falling back to support", async () => {
    const user = userEvent.setup();

    render(<LibraryPage />);

    await waitFor(() => expect(hoistedMocks.ensureLoadedMock).toHaveBeenCalled());

    const downloadButtons = await screen.findAllByRole("button", { name: /download/i });
    await user.click(downloadButtons[0]!);

    await waitFor(() => {
      expect(hoistedMocks.invokeMock).toHaveBeenCalledWith(
        "download-signed-url",
        expect.objectContaining({
          body: expect.objectContaining({
            purchaseId: releaseItem.id,
            purchaseType: releaseItem.type,
            productId: releaseItem.productId,
          }),
        }),
      );
    });

    expect(hoistedMocks.invokeMock).not.toHaveBeenCalledWith(
      "request-download-reset",
      expect.anything(),
    );
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { ConnectionsModule } from "../ConnectionsModule";

const invokeMock = vi.fn();
const toastMock = vi.fn();
const { getAuthorizationUrlMock } = vi.hoisted(() => ({
  getAuthorizationUrlMock: vi.fn(() => "https://example.com/oauth"),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: (fnName: string, args: any) => invokeMock(fnName, args),
    },
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/services/plugins/oauth-service", () => ({
  OAuthService: {
    getAuthorizationUrl: getAuthorizationUrlMock,
  },
}));

describe("ConnectionsModule", () => {
  beforeEach(() => {
    invokeMock.mockReset();
    toastMock.mockReset();
    getAuthorizationUrlMock.mockClear();
  });

  it("renders a disconnected state when no connection is present", async () => {
    invokeMock.mockImplementation(async (_fnName: string, { body }: any) => {
      if (body?.action === "status") {
        return { data: { status: "disconnected" }, error: null };
      }
      return { data: null, error: null };
    });

    render(<ConnectionsModule />);

    const badge = await screen.findByTestId("tiktok-connection-status");
    expect(badge).toHaveTextContent(/Not Connected/i);
    expect(invokeMock).toHaveBeenCalledWith("tiktok-connector", { body: { action: "status" } });
  });

  it("allows creators to link TikTok with an API key", async () => {
    invokeMock.mockImplementation(async (_fnName: string, { body }: any) => {
      if (body?.action === "status") {
        return { data: { status: "disconnected" }, error: null };
      }

      if (body?.action === "connect") {
        expect(body.method).toBe("apiKey");
        expect(body.accountName).toBe("Creator");
        expect(body.accountId).toBe("12345");
        expect(body.apiKey).toBe("test-api-key-123456");

        return {
          data: {
            status: "connected",
            connection: {
              id: "conn-1",
              accountId: body.accountId,
              accountName: body.accountName,
              avatarUrl: null,
              method: "apiKey",
              connectedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              expiresAt: null,
              scope: null,
              sandbox: false,
            },
          },
          error: null,
        };
      }

      return { data: null, error: null };
    });

    render(<ConnectionsModule />);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /use api key/i }));

    await user.type(screen.getByLabelText(/Account display name/i), "Creator");
    await user.type(screen.getByLabelText(/Business account ID/i), "12345");
    await user.type(screen.getByLabelText(/TikTok API key/i), "test-api-key-123456");

    await user.click(screen.getByRole("button", { name: /save api key/i }));

    await waitFor(() => {
      expect(screen.getByText(/Connected as Creator/i)).toBeInTheDocument();
    });

    expect(toastMock).toHaveBeenCalled();
  });

  it("disconnects an existing TikTok account", async () => {
    invokeMock.mockImplementation(async (_fnName: string, { body }: any) => {
      if (body?.action === "status") {
        return {
          data: {
            status: "connected",
            connection: {
              id: "conn-1",
              accountId: "12345",
              accountName: "Creator",
              avatarUrl: null,
              method: "apiKey",
              connectedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              expiresAt: null,
              scope: null,
              sandbox: false,
            },
          },
          error: null,
        };
      }

      if (body?.action === "disconnect") {
        return { data: { status: "disconnected" }, error: null };
      }

      return { data: null, error: null };
    });

    render(<ConnectionsModule />);

    await screen.findByText(/Connected as Creator/i);

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(screen.getByTestId("tiktok-connection-status")).toHaveTextContent(/Not Connected/i);
    });

    expect(invokeMock).toHaveBeenCalledWith("tiktok-connector", { body: { action: "disconnect" } });
    expect(toastMock).toHaveBeenCalled();
  });
});

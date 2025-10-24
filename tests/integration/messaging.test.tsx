import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithLocale } from "../utils/renderWithLocale";

vi.mock("@/components/UnifiedInbox", () => ({
  UnifiedInbox: () => <div data-testid="unified-inbox" />,
}));

vi.mock("@/lib/seo", () => ({
  setMeta: vi.fn(),
}));

import InboxPage from "@/pages/Inbox";

describe("Messaging page localisation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders english copy", async () => {
    renderWithLocale(<InboxPage />, { locale: "en-GB" });

    expect(await screen.findByRole("heading", { name: "Unified Inbox" })).toBeInTheDocument();
    expect(screen.getByText(/Manage all your messages/)).toBeInTheDocument();
  });

  it("renders spanish copy", async () => {
    renderWithLocale(<InboxPage />, { locale: "es-ES" });

    expect(await screen.findByRole("heading", { name: "Bandeja unificada" })).toBeInTheDocument();
    expect(screen.getByText(/Gestiona todos tus mensajes/)).toBeInTheDocument();
  });
});

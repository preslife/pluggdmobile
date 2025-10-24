import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LiveIndex from "../Index";
import i18n from "@/lib/i18n";

const scheduleMock = [
  {
    id: "battle-1",
    type: "battle" as const,
    title: "Live Battle",
    status: "live" as const,
    scheduledFor: new Date("2024-01-01T01:00:00Z").toISOString(),
    endsAt: new Date("2024-01-01T02:00:00Z").toISOString(),
    actionHref: "/live/battles/battle-1",
  },
  {
    id: "session-1",
    type: "session" as const,
    title: "Producer Session",
    status: "upcoming" as const,
    scheduledFor: new Date("2024-01-01T03:00:00Z").toISOString(),
    endsAt: null,
    actionHref: "/live/sessions/session-1",
  },
];

vi.mock("@/hooks/useSessionRooms", () => ({
  useSessionRooms: () => ({ rooms: [], loading: false }),
}));

vi.mock("@/hooks/useLiveSchedule", () => ({
  useLiveSchedule: () => ({ schedule: scheduleMock, loading: false, refetch: vi.fn() }),
}));

vi.mock("@/hooks/useNow", () => ({
  __esModule: true,
  default: () => new Date("2024-01-01T00:00:00Z"),
  useNow: () => new Date("2024-01-01T00:00:00Z"),
}));

vi.mock("@/components/LiveCTA", () => ({
  default: () => <div data-testid="live-cta" />,
}));

vi.mock("@/lib/seo", () => ({
  setMeta: vi.fn(),
}));

describe("LiveIndex", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    await i18n.changeLanguage("en-US");
  });

  afterEach(async () => {
    cleanup();
    vi.useRealTimers();
    await i18n.changeLanguage("en-US");
  });

  it("renders realtime schedule items", () => {
    render(
      <MemoryRouter>
        <LiveIndex />
      </MemoryRouter>
    );

    expect(screen.getByText("Upcoming Schedule")).toBeInTheDocument();
    expect(screen.getByText("Live Battle")).toBeInTheDocument();
    expect(screen.getAllByText(/Live now/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Producer Session")).toBeInTheDocument();
    expect(screen.getAllByText(/Starts/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /Watch Battle/i })).toBeInTheDocument();
  });

  it("supports spanish translations", async () => {
    await i18n.changeLanguage("es-ES");

    render(
      <MemoryRouter>
        <LiveIndex />
      </MemoryRouter>
    );

    expect(screen.getByText("Próximos eventos")).toBeInTheDocument();
    expect(screen.getAllByText(/En vivo ahora/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: /^Ver batalla$/i }).length).toBeGreaterThan(0);
  });
});

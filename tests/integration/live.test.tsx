import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithLocale } from "../utils/renderWithLocale";

const scheduleItem = {
  id: "session-1",
  type: "session" as const,
  title: "Producer AMA",
  status: "scheduled" as const,
  scheduledFor: "2024-05-01T18:00:00.000Z",
  endsAt: null,
  actionHref: "/live/sessions/session-1",
};

vi.mock("@/hooks/useSessionRooms", () => ({
  useSessionRooms: () => ({ rooms: [], loading: false }),
}));

vi.mock("@/hooks/useLiveSchedule", () => ({
  useLiveSchedule: () => ({ schedule: [scheduleItem], loading: false }),
}));

vi.mock("@/hooks/useNow", () => ({
  __esModule: true,
  default: () => new Date("2024-05-01T12:00:00.000Z"),
}));

vi.mock("@/components/LiveCTA", () => ({
  default: () => <div data-testid="live-cta" />,
}));

vi.mock("@/components/LoadingSkeleton", () => ({
  LoadingSkeleton: () => <div data-testid="loading" />,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  };
});

vi.mock("lucide-react", () => ({
  Users: () => <span />, 
  Calendar: () => <span />, 
  Trophy: () => <span />, 
  Plug: () => <span />, 
  Clock: () => <span />, 
}));

import LiveIndex from "@/pages/live/Index";

describe("Live page localisation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders english strings and formatted date", async () => {
    renderWithLocale(<LiveIndex />, { locale: "en-GB" });

    expect(await screen.findByText("Get Plugged In")).toBeInTheDocument();
    expect(screen.getByText("Live Schedule")).toBeInTheDocument();

    const expectedDate = new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(scheduleItem.scheduledFor));
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
    expect(screen.getByText("No live rooms")).toBeInTheDocument();
  });

  it("renders spanish strings and formatted date", async () => {
    renderWithLocale(<LiveIndex />, { locale: "es-ES" });

    expect(await screen.findByText("Conéctate")).toBeInTheDocument();
    expect(screen.getByText("Agenda en vivo")).toBeInTheDocument();

    const expectedDate = new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(scheduleItem.scheduledFor));
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
    expect(screen.getByText("Sin salas en vivo")).toBeInTheDocument();
  });
});

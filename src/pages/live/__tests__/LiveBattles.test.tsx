import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LiveBattles from "../Battles";

const advanceMock = vi.fn();

const battleFixture = {
  id: "battle-1",
  title: "Producer Showdown",
  status: "live" as const,
  starts_at: new Date("2024-01-01T01:00:00Z").toISOString(),
  ends_at: new Date("2024-01-01T02:00:00Z").toISOString(),
  created_by: "user-1",
  is_featured: false,
  created_at: new Date("2023-12-31T23:00:00Z").toISOString(),
  updated_at: new Date("2023-12-31T23:00:00Z").toISOString(),
};

vi.mock("@/hooks/useBattles", () => ({
  useBattles: () => ({
    battles: [battleFixture],
    loading: false,
    advanceBattleRounds: advanceMock,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useNow", () => ({
  __esModule: true,
  default: () => new Date("2024-01-01T00:00:00Z"),
  useNow: () => new Date("2024-01-01T00:00:00Z"),
}));

vi.mock("@/components/live/CreateBattleModal", () => ({
  CreateBattleModal: () => null,
}));

vi.mock("@/components/SEOHelmet", () => ({
  default: () => null,
}));

describe("LiveBattles", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-01T00:00:00Z"));
    advanceMock.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("exposes advance round action for battle owners", async () => {
    const user = userEvent.setup({ advanceTimers: vi.runOnlyPendingTimersAsync });

    render(<LiveBattles />);

    const advanceButton = screen.getByRole("button", { name: /Advance Round/i });
    await user.click(advanceButton);

    expect(advanceMock).toHaveBeenCalledWith("battle-1");
  });
});

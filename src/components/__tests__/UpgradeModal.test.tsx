import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach, vi } from "vitest";

const toastMock = vi.hoisted(() => vi.fn());
const supabaseInvoke = vi.hoisted(() => vi.fn());
const windowOpen = vi.hoisted(() => vi.fn());

const loggerSpies = vi.hoisted(() => ({
  logEvent: vi.fn(async () => {}),
  logError: vi.fn(async () => {}),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: supabaseInvoke,
    },
  },
}));

vi.mock("@/hooks/useLogger", () => ({
  useLogger: () => ({
    logEvent: loggerSpies.logEvent,
    logError: loggerSpies.logError,
    correlationId: "upgrade-test-corr",
    logger: {} as any,
  }),
}));

import { UpgradeModal } from "../UpgradeModal";

const baseProps = {
  isOpen: true,
  onClose: vi.fn(),
  currentTier: "creator" as const,
  requiredTier: undefined,
};

describe("UpgradeModal logging", () => {
  beforeEach(() => {
    supabaseInvoke.mockReset();
    toastMock.mockReset();
    loggerSpies.logEvent.mockClear();
    loggerSpies.logError.mockClear();
    baseProps.onClose.mockReset();
    (window as any).open = windowOpen;
    windowOpen.mockReset();
  });

  it("logs checkout start and success events", async () => {
    supabaseInvoke.mockResolvedValueOnce({ data: { url: "https://checkout" }, error: null });

    render(
      <UpgradeModal
        {...baseProps}
        feature="Test feature"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Choose Pro/ }));

    await waitFor(() => {
      expect(supabaseInvoke).toHaveBeenCalled();
    });

    expect(supabaseInvoke).toHaveBeenCalledWith("create-checkout", expect.objectContaining({
      body: expect.objectContaining({ tier: "pro", correlationId: "upgrade-test-corr" }),
      headers: expect.objectContaining({ "x-correlation-id": "upgrade-test-corr" }),
    }));

    expect(loggerSpies.logEvent).toHaveBeenCalledWith(
      "upgrade_modal_checkout_start",
      expect.objectContaining({ tier: "pro" })
    );

    expect(loggerSpies.logEvent).toHaveBeenCalledWith(
      "upgrade_modal_checkout_success",
      expect.objectContaining({ tier: "pro", has_checkout_url: true })
    );

    expect(windowOpen).toHaveBeenCalledWith("https://checkout", "_blank");
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it("logs errors when course purchase fails", async () => {
    supabaseInvoke.mockImplementation(async (fnName: string) => {
      if (fnName === "create-course-payment") {
        return { data: null, error: new Error("checkout failed") };
      }
      return { data: { url: "https://checkout" }, error: null };
    });

    render(
      <UpgradeModal
        {...baseProps}
        course={{ id: "course-1", title: "Test Course", oneTimePrice: 19.99 }}
      />
    );

    fireEvent.click(screen.getByText(/Unlock this course forever/));

    await waitFor(() => {
      expect(supabaseInvoke).toHaveBeenCalledWith(
        "create-course-payment",
        expect.objectContaining({
          body: expect.objectContaining({ courseId: "course-1", correlationId: "upgrade-test-corr" }),
        })
      );
    });

    expect(loggerSpies.logError).toHaveBeenCalledWith(
      "upgrade_modal_course_purchase_error",
      expect.any(Error),
      expect.objectContaining({ course_id: "course-1" })
    );

    expect(toastMock).toHaveBeenCalled();
  });
});

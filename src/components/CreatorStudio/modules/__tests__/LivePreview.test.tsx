import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { MemoryRouter } from "react-router-dom";

import { LivePreview } from "../LivePreview";

describe("LivePreview", () => {
  it("highlights incomplete sessions and renders a CTA", () => {
    render(
      <MemoryRouter>
        <LivePreview
          sessions={[
            { id: "1", title: "", durationMinutes: null, scheduledAt: null },
            {
              id: "2",
              title: "Scheduled",
              durationMinutes: 30,
              scheduledAt: new Date().toISOString(),
            },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Complete your schedule")).toBeInTheDocument();
    expect(screen.getByText("Finish in form")).toBeInTheDocument();
    expect(screen.getByText("TBD")).toBeInTheDocument();
  });

  it("invokes template actions when quick create buttons are clicked", () => {
    const spy = vi.fn();

    render(
      <MemoryRouter>
        <LivePreview
          sessions={[]}
          onApplyTemplate={spy}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/quick create a timeslot/i)).toBeInTheDocument();

    const templateButton = screen.getByRole("button", { name: /tonight 7pm hangout/i });
    templateButton.click();

    expect(spy).toHaveBeenCalled();
  });
});

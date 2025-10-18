import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCHEDULING_FORM_PATH,
  DEFAULT_SCHEDULING_HELP_PATH,
  formatSchedule,
} from "../live/formatSchedule";

describe("formatSchedule", () => {
  it("returns TBD labels and missing fields when schedule data is absent", () => {
    const result = formatSchedule({});

    expect(result.dateLabel).toBe("TBD");
    expect(result.timeLabel).toBe("");
    expect(result.isComplete).toBe(false);
    expect(result.missingFields).toEqual([
      "title",
      "durationMinutes",
      "scheduledAt",
    ]);
    expect(result.warningMessage).toMatchInlineSnapshot(
      `"Add title, duration, and date & time to finish scheduling."`,
    );
    expect(result.primaryCta.href).toBe(DEFAULT_SCHEDULING_FORM_PATH);
    expect(result.secondaryCta.href).toBe(DEFAULT_SCHEDULING_HELP_PATH);
  });

  it("formats valid schedules and surfaces management copy", () => {
    const date = new Date("2025-01-01T18:00:00Z");

    const result = formatSchedule({
      title: "Launch stream",
      durationMinutes: 45,
      scheduledAt: date.toISOString(),
    });

    expect(result.isComplete).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.warningMessage).toBeUndefined();
    expect(result.primaryCta.label).toBe("Manage schedule");
    expect(result.primaryCta.href).toBe(DEFAULT_SCHEDULING_FORM_PATH);
  });

  it("deduplicates missing fields when multiple requirements fail", () => {
    const result = formatSchedule({
      title: " ",
      durationMinutes: 0,
      scheduledAt: "invalid",
    });

    expect(result.missingFields).toEqual([
      "title",
      "durationMinutes",
      "scheduledAt",
    ]);
  });
});

import { describe, expect, it } from "vitest";

import {
  isoToDateInput,
  isoToDateTimeInputParts,
  toDateTimeInputParts,
  toUtcDateTimeEnd,
  toUtcDateTimeStart,
} from "./date-time-input";

describe("date-time input parts", () => {
  it("formats a date for date and time inputs", () => {
    const value = new Date(2026, 3, 30, 9, 5);

    expect(toDateTimeInputParts(value)).toEqual({
      date: "2026-04-30",
      time: "09:05",
    });
  });

  it("reads ISO values for date and time inputs", () => {
    expect(isoToDateInput("2026-04-30T09:05:20.000Z")).toBe("2026-04-30");
    expect(isoToDateTimeInputParts("2026-04-30T09:05:20.000Z")).toEqual({
      date: "2026-04-30",
      time: "09:05",
    });
  });

  it("returns blank parts for empty ISO values", () => {
    expect(isoToDateInput(null)).toBe("");
    expect(isoToDateTimeInputParts(undefined)).toEqual({ date: "", time: "" });
  });

  it("builds UTC day boundary date-times", () => {
    expect(toUtcDateTimeStart("2026-04-30")).toBe("2026-04-30T09:00:00.000Z");
    expect(toUtcDateTimeEnd("2026-04-30")).toBe("2026-04-30T23:59:59.999Z");
    expect(toUtcDateTimeStart("")).toBeUndefined();
    expect(toUtcDateTimeEnd("")).toBeUndefined();
  });
});

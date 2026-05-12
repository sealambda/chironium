import { endOfDay, formatISO, parse, startOfDay } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  isoToDateInput,
  isoToDateTimeInputParts,
  toDateTimeEnd,
  toDateTimeInputParts,
  toDateTimeStart,
} from "./date-time-input";

describe("date-time input parts", () => {
  it("formats a date for date and time inputs", () => {
    const value = new Date(2026, 3, 30, 9, 5);

    expect(toDateTimeInputParts(value)).toEqual({
      date: "2026-04-30",
      time: "09:05",
    });
  });

  it("reads ISO values for date and time inputs with timezone conversion", () => {
    // Create a known local time and convert to ISO for testing.
    const localDate = new Date(2026, 3, 30, 9, 5); // April 30, 2026 at 9:05 AM local time
    const iso = formatISO(localDate);
    const localMidnightIso = new Date(2026, 4, 12, 0, 0).toISOString();

    expect(isoToDateInput("2026-04-30T09:05:20.000Z")).toBe("2026-04-30");
    expect(isoToDateInput(localMidnightIso)).toBe("2026-05-12");
    expect(isoToDateInput("2026-05-12")).toBe("2026-05-12");
    // Parse the ISO string and verify we get back the date in local timezone.
    const result = isoToDateTimeInputParts(iso);
    expect(result.date).toBe("2026-04-30");
    expect(result.time).toBe("09:05");
  });

  it("returns blank parts for empty ISO values", () => {
    expect(isoToDateInput(null)).toBe("");
    expect(isoToDateTimeInputParts(undefined)).toEqual({ date: "", time: "" });
  });

  it("builds local day boundary date-times with timezone offsets", () => {
    const parsed = parse("2026-04-30", "yyyy-MM-dd", new Date());

    expect(toDateTimeStart("2026-04-30")).toBe(formatISO(startOfDay(parsed)));
    expect(toDateTimeEnd("2026-04-30")).toBe(formatISO(endOfDay(parsed)));
    expect(toDateTimeStart("")).toBeUndefined();
    expect(toDateTimeEnd("")).toBeUndefined();
  });
});

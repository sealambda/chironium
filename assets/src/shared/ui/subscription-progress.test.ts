import { format } from "date-fns";
import { describe, expect, it } from "vitest";

import {
  getSubscriptionProgressRatio,
  getSubscriptionProgressTone,
  resolveSubscriptionEndDate,
} from "./subscription-progress";

describe("subscription progress helpers", () => {
  it("clamps progress between zero and one", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-05-01T00:00:00.000Z");

    expect(getSubscriptionProgressRatio(start, end, new Date("2025-12-01T00:00:00.000Z"))).toBe(0);
    expect(getSubscriptionProgressRatio(start, end, new Date("2026-06-01T00:00:00.000Z"))).toBe(1);
  });

  it("prefers effectiveEndDate over plan duration when provided", () => {
    const endDate = resolveSubscriptionEndDate("2026-01-15", 1, "2026-02-20");
    expect(format(endDate, "yyyy-MM-dd")).toBe("2026-02-20");
  });

  it("falls back to start date plus plan duration when effectiveEndDate is absent", () => {
    const endDate = resolveSubscriptionEndDate("2026-01-15", 1);
    expect(format(endDate, "yyyy-MM-dd")).toBe("2026-02-15");
  });

  it("maps elapsed time to subscription status tones", () => {
    expect(getSubscriptionProgressTone(0)).toBe("success");
    expect(getSubscriptionProgressTone(0.49)).toBe("success");
    expect(getSubscriptionProgressTone(0.5)).toBe("warning");
    expect(getSubscriptionProgressTone(0.74)).toBe("warning");
    expect(getSubscriptionProgressTone(0.75)).toBe("destructive");
    expect(getSubscriptionProgressTone(1)).toBe("destructive");
  });
});

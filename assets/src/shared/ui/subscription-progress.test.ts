import { describe, expect, it } from "vitest";

import { getSubscriptionProgressRatio, getSubscriptionProgressTone } from "./subscription-progress";

describe("subscription progress helpers", () => {
  it("clamps progress between zero and one", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    const end = new Date("2026-05-01T00:00:00.000Z");

    expect(getSubscriptionProgressRatio(start, end, new Date("2025-12-01T00:00:00.000Z"))).toBe(0);
    expect(getSubscriptionProgressRatio(start, end, new Date("2026-06-01T00:00:00.000Z"))).toBe(1);
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

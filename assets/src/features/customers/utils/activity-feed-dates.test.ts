import { describe, expect, it } from "vitest";

import { toIsoDateString } from "@/features/customers/utils/activity-feed-dates";

describe("activity feed ISO date", () => {
  it("returns the local date, not the UTC date", () => {
    // Local midnight is the previous day in UTC east of UTC (Vitest runs in Europe/Madrid).
    const localMidnight = new Date(2026, 9, 20).toISOString();

    expect(toIsoDateString(localMidnight)).toBe("2026-10-20");
  });

  it("keeps a plain date as is", () => {
    expect(toIsoDateString("2026-10-20")).toBe("2026-10-20");
  });
});

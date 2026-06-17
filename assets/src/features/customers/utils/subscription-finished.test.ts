import { describe, expect, it } from "vitest";

import { isSubscriptionFinished } from "@/features/customers/utils/subscription-finished";
import type { SubscriptionListItem } from "@/shared/types/subscriptions";

function subscription(
  overrides: Partial<SubscriptionListItem> & Pick<SubscriptionListItem, "state">,
): SubscriptionListItem {
  return {
    id: "sub_1",
    startDate: "2024-01-01",
    subscriberId: "person_1",
    plan: { id: "plan_1", duration: { value: 6, code: "MO" } },
    effectiveEndDate: null,
    ...overrides,
  } as SubscriptionListItem;
}

describe("isSubscriptionFinished", () => {
  it("returns false when there is no subscription", () => {
    expect(isSubscriptionFinished(undefined)).toBe(false);
    expect(isSubscriptionFinished(null)).toBe(false);
  });

  it("returns false for suspended subscriptions", () => {
    expect(isSubscriptionFinished(subscription({ state: "suspended" }))).toBe(false);
  });

  it("returns true for expired and canceled subscriptions", () => {
    expect(isSubscriptionFinished(subscription({ state: "expired" }))).toBe(true);
    expect(isSubscriptionFinished(subscription({ state: "canceled" }))).toBe(true);
  });

  it("returns true when an active subscription is past its effective end date", () => {
    expect(
      isSubscriptionFinished(
        subscription({ state: "active", effectiveEndDate: "2024-06-01" }),
        "2024-06-02",
      ),
    ).toBe(true);
  });

  it("returns false when an active subscription has not reached its effective end date", () => {
    expect(
      isSubscriptionFinished(
        subscription({ state: "active", effectiveEndDate: "2024-06-01" }),
        "2024-05-31",
      ),
    ).toBe(false);
  });

  it("returns false for active subscriptions without an effective end date", () => {
    expect(isSubscriptionFinished(subscription({ state: "active", effectiveEndDate: null }))).toBe(
      false,
    );
  });
});

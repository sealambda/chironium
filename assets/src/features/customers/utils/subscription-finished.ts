import type { SubscriptionListItem } from "@/shared/types/subscriptions";
import { todayDateInput } from "@/shared/utils/date-time-input";

/** Whether the customer's most recent subscription should be treated as finished. */
export function isSubscriptionFinished(
  subscription: SubscriptionListItem | null | undefined,
  today: string = todayDateInput(),
): boolean {
  if (!subscription) {
    return false;
  }

  if (subscription.state === "suspended") {
    return false;
  }

  if (subscription.state === "expired" || subscription.state === "canceled") {
    return true;
  }

  if (subscription.state === "active" && subscription.effectiveEndDate) {
    return subscription.effectiveEndDate <= today;
  }

  return false;
}

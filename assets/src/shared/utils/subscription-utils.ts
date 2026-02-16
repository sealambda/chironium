import { differenceInDays, differenceInMonths, differenceInYears, isPast, isToday } from "date-fns";

import * as m from "@/paraglide/messages";

/**
 * Returns a localized label for subscription time remaining.
 * Format: "X days/months/years to go" or edge cases (expired/today).
 */
export function getTimeRemainingLabel(endDate: Date | string): string {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  // Edge cases first
  if (isPast(end)) {
    return m.sub_expired();
  }
  if (isToday(end)) {
    return m.sub_today();
  }

  // Calculate time units (use largest applicable unit)
  const years = differenceInYears(end, new Date());
  if (years >= 1) {
    return m.sub_years_remaining({ count: years });
  }

  const months = differenceInMonths(end, new Date());
  if (months >= 1) {
    return m.sub_months_remaining({ count: months });
  }

  const days = differenceInDays(end, new Date());
  return m.sub_days_remaining({ count: Math.max(1, days) }); // Minimum 1 day
}

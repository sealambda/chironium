import { type Duration, intervalToDuration, isFuture, isPast, isToday } from "date-fns";

import * as m from "@/paraglide/messages";

function formatDuration({ years = 0, months = 0, days = 0 }: Duration): string {
  const parts: string[] = [];
  if (years > 0) {
    parts.push(years === 1 ? m.sub_year_singular() : m.sub_years_unit({ count: years }));
  }
  if (months > 0) {
    parts.push(months === 1 ? m.sub_month_singular() : m.sub_months_unit({ count: months }));
  }
  if (days > 0) {
    parts.push(days === 1 ? m.sub_day_singular() : m.sub_days_unit({ count: days }));
  }

  // Fallback for edge case where duration rounds to zero.
  if (parts.length === 0) {
    parts.push(m.sub_day_singular());
  }

  return parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(", ")} ${m.common_and()} ${parts[parts.length - 1]}`;
}

/**
 * Returns a localized label for subscription time remaining.
 * Shows multi-unit precision: "2 months and 28 days to go".
 * When the start date is in the future, shows "Starts in X days" instead.
 */
export function getTimeRemainingLabel(startDate: Date | string, endDate: Date | string): string {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  if (isPast(end)) {
    return m.sub_expired();
  }
  if (isToday(end)) {
    return m.sub_today();
  }

  // Subscription hasn't started yet
  if (isFuture(start)) {
    const duration = formatDuration(intervalToDuration({ start: new Date(), end: start }));
    return m.sub_starts_in({ duration });
  }

  const duration = formatDuration(intervalToDuration({ start: new Date(), end }));
  return m.sub_remaining({ duration });
}

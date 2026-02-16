import { formatDistanceToNowStrict, isPast, isToday } from "date-fns";

import * as m from "@/paraglide/messages";
import { getDateLocale } from "@/shared/utils/date-locale";

/**
 * Returns a localized relative time label for a subscription end date.
 * Uses date-fns strict formatting for precise, locale-aware output.
 */
export function getTimeRemainingLabel(endDate: Date | string): string {
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  if (isPast(end)) {
    return m.sub_expired();
  }
  if (isToday(end)) {
    return m.sub_today();
  }

  return formatDistanceToNowStrict(end, { locale: getDateLocale(), addSuffix: true });
}

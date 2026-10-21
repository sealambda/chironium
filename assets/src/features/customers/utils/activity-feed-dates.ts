import { format, formatDistanceStrict, isToday, parseISO, startOfDay } from "date-fns";

import * as m from "@/paraglide/messages";
import { getDateLocale } from "@/shared/utils/date-locale";

export function toIsoDateString(isoTimestamp: string) {
  return format(parseISO(isoTimestamp), "yyyy-MM-dd");
}

function formatRelativeDayFromIso(isoTimestamp: string) {
  const today = startOfDay(new Date());
  const target = startOfDay(parseISO(toIsoDateString(isoTimestamp)));

  return formatDistanceStrict(target, today, {
    addSuffix: true,
    unit: "day",
    locale: getDateLocale(),
  });
}

/** Returns the localized "Today" label for dates that fall on today, or a relative day string otherwise. */
export function formatDayLabelFromIso(isoTimestamp: string): string {
  if (isToday(parseISO(toIsoDateString(isoTimestamp)))) {
    return m.activity_today();
  }
  return formatRelativeDayFromIso(isoTimestamp);
}

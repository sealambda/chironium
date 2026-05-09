import { formatDistanceStrict, parseISO, startOfDay } from "date-fns";

import { getDateLocale } from "@/shared/utils/date-locale";

export function toIsoDateString(isoTimestamp: string) {
  return isoTimestamp.slice(0, 10);
}

export function formatRelativeDayFromIso(isoTimestamp: string) {
  const today = startOfDay(new Date());
  const target = startOfDay(parseISO(toIsoDateString(isoTimestamp)));

  return formatDistanceStrict(today, target, {
    addSuffix: true,
    unit: "day",
    locale: getDateLocale(),
  });
}

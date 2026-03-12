import { format, formatISO, isValid, parse } from "date-fns";

import { getLocale } from "@/paraglide/runtime";

export const DATE_INPUT_FORMAT = "yyyy-MM-dd";
export const TIME_INPUT_FORMAT = "HH:mm";
export const DATE_TIME_INPUT_FORMAT = `${DATE_INPUT_FORMAT} ${TIME_INPUT_FORMAT}`;

export function toDateInput(value: Date): string {
  return format(value, DATE_INPUT_FORMAT);
}

export function toTimeInput(value: Date): string {
  return format(value, TIME_INPUT_FORMAT);
}

export function toDateTimeInput(
  effectiveDate?: string | null,
  effectiveTime?: string | null,
): string | undefined {
  const date = effectiveDate?.trim();
  const time = effectiveTime?.trim();

  if (date && time) {
    const parsed = parse(`${date} ${time}`, DATE_TIME_INPUT_FORMAT, new Date());
    return isValid(parsed) ? formatISO(parsed) : undefined;
  }

  if (date) {
    const parsed = parse(date, DATE_INPUT_FORMAT, new Date());
    return isValid(parsed) ? formatISO(parsed) : undefined;
  }

  return undefined;
}

export function getDatePickerDisplayFormat() {
  const locale = getLocale();
  const parts = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const map: Record<string, string> = {
    day: "dd",
    month: "MM",
    year: "yyyy",
  };

  return parts.map((p) => map[p.type] || p.value).join("");
}

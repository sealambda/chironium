import { format, formatISO, isValid, parse } from "date-fns";

import { getLocale } from "@/paraglide/runtime";

export const DATE_INPUT_FORMAT = "yyyy-MM-dd";
export const TIME_INPUT_FORMAT = "HH:mm";
export const DATE_TIME_INPUT_FORMAT = `${DATE_INPUT_FORMAT} ${TIME_INPUT_FORMAT}`;

export interface DateTimeInputParts {
  date: string;
  time: string;
}

export function toDateInput(value: Date): string {
  return format(value, DATE_INPUT_FORMAT);
}

export function toTimeInput(value: Date): string {
  return format(value, TIME_INPUT_FORMAT);
}

export function toDateTimeInputParts(value: Date = new Date()): DateTimeInputParts {
  return {
    date: toDateInput(value),
    time: toTimeInput(value),
  };
}

export function isoToDateInput(value: string | null | undefined): string {
  return value ? String(value).slice(0, 10) : "";
}

export function isoToDateTimeInputParts(value: string | null | undefined): DateTimeInputParts {
  if (!value) {
    return { date: "", time: "" };
  }

  const normalized = String(value);
  return {
    date: normalized.slice(0, 10),
    time: normalized.length >= 16 ? normalized.slice(11, 16) : "",
  };
}

export function todayDateInput(value: Date = new Date()): string {
  return toDateInput(value);
}

export function toUtcDateTimeStart(date: string): string | undefined {
  return date ? `${date}T09:00:00.000Z` : undefined;
}

export function toUtcDateTimeEnd(date: string): string | undefined {
  return date ? `${date}T23:59:59.999Z` : undefined;
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
    return isValid(parsed) ? toUtcDateTimeStart(date) : undefined;
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

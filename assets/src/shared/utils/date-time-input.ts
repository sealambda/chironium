import { tz } from "@date-fns/tz";
import { endOfDay, format, formatISO, isValid, parse, startOfDay } from "date-fns";

import { getLocale } from "@/paraglide/runtime";

const DATE_INPUT_FORMAT = "yyyy-MM-dd";
const TIME_INPUT_FORMAT = "HH:mm";
const DATE_TIME_INPUT_FORMAT = `${DATE_INPUT_FORMAT} ${TIME_INPUT_FORMAT}`;

export interface DateTimeInputParts {
  date: string;
  time: string;
}

export function toDateInput(value: Date): string {
  return format(value, DATE_INPUT_FORMAT);
}

function toTimeInput(value: Date): string {
  return format(value, TIME_INPUT_FORMAT);
}

export function toDateTimeInputParts(value: Date = new Date()): DateTimeInputParts {
  return {
    date: toDateInput(value),
    time: toTimeInput(value),
  };
}

/** A date-fns context for `timeZone`; without one, date-fns uses the browser's zone. */
export function inZone(timeZone?: string) {
  return timeZone ? { in: tz(timeZone) } : undefined;
}

/** Without `timeZone`, the browser's zone gives the calendar date. */
export function isoToDateInput(value: string | null | undefined, timeZone?: string): string {
  if (!value) {
    return "";
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  return isValid(date) ? format(date, DATE_INPUT_FORMAT, inZone(timeZone)) : "";
}

export function isoToDateTimeInputParts(value: string | null | undefined): DateTimeInputParts {
  if (!value) {
    return { date: "", time: "" };
  }

  // Parse ISO string into Date and format using local timezone.
  const date = new Date(value);
  if (!isValid(date)) {
    return { date: "", time: "" };
  }

  return toDateTimeInputParts(date);
}

export function todayDateInput(timeZone?: string): string {
  return format(new Date(), DATE_INPUT_FORMAT, inZone(timeZone));
}

/** The first instant of `date` in `timeZone`, or in the browser's zone without one. */
export function toDateTimeStart(date: string, timeZone?: string): string | undefined {
  if (!date) {
    return undefined;
  }

  const parsed = parse(date, DATE_INPUT_FORMAT, new Date(), inZone(timeZone));
  return isValid(parsed) ? formatISO(startOfDay(parsed, inZone(timeZone))) : undefined;
}

/** The last instant of `date` in `timeZone`, or in the browser's zone without one. */
export function toDateTimeEnd(date: string, timeZone?: string): string | undefined {
  if (!date) {
    return undefined;
  }

  const parsed = parse(date, DATE_INPUT_FORMAT, new Date(), inZone(timeZone));
  return isValid(parsed) ? formatISO(endOfDay(parsed, inZone(timeZone))) : undefined;
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
    return isValid(parsed) ? toDateTimeStart(date) : undefined;
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

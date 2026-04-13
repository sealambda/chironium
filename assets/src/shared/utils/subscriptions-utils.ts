import {
  addMonths,
  type Duration as DateFnsDuration,
  intervalToDuration,
  isFuture,
  isPast,
  isToday,
  parseISO,
} from "date-fns";

import * as m from "@/paraglide/messages";
import type { DurationUnit } from "@/shared/types/schema-enums";
import type { SubscriptionRecord } from "@/shared/types/subscriptions";

interface PlanDuration {
  code?: DurationUnit | null;
  value?: string | null;
}

interface PlanLike {
  id?: string | null;
  name?: string | null;
  duration?: PlanDuration | null;
}

interface SubscriptionBadgeMetadata {
  planLabel: string;
  statusLabel: string;
  shouldEdit: boolean;
  badgeClassName: string;
  dotClassName: string;
}

const DEFAULT_MONTHS = 3;

const BADGE_BASE =
  "h-7 gap-0 sm:gap-2 rounded-full border px-3 font-semibold text-emerald-900 sm:text-sm text-xs";

const BADGE_ACTIVE = `${BADGE_BASE} border-emerald-200 bg-emerald-100 text-emerald-900`;
const DOT_ACTIVE = "bg-emerald-500";

const BADGE_UPCOMING = `${BADGE_BASE} border-sky-200 bg-sky-100 text-sky-900`;
const DOT_UPCOMING = "bg-sky-500";

const BADGE_EXPIRED = `${BADGE_BASE} border-red-200 bg-red-100 text-red-900`;
const DOT_EXPIRED = "bg-red-500";

const BADGE_NEUTRAL = `${BADGE_BASE} border-neutral-200 bg-neutral-100 text-neutral-800`;
const DOT_NEUTRAL = "bg-neutral-500";

function parseDate(date: Date | string): Date {
  if (typeof date === "string") {
    return parseISO(date);
  }
  return date;
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function formatDateDuration({ years = 0, months = 0, days = 0 }: DateFnsDuration): string {
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

  if (parts.length === 0) {
    return m.sub_day_singular();
  }

  return parts.length === 1
    ? parts[0]
    : `${parts.slice(0, -1).join(", ")} ${m.common_and()} ${parts.at(-1) ?? ""}`;
}

function getBadgeStatus(start: Date, end: Date): Omit<SubscriptionBadgeMetadata, "planLabel"> {
  if (isPast(end)) {
    return {
      statusLabel: m.sub_expired(),
      shouldEdit: false,
      badgeClassName: BADGE_EXPIRED,
      dotClassName: DOT_EXPIRED,
    };
  }

  if (isToday(end)) {
    return {
      statusLabel: m.sub_today(),
      shouldEdit: true,
      badgeClassName: BADGE_ACTIVE,
      dotClassName: DOT_ACTIVE,
    };
  }

  if (isFuture(start)) {
    return {
      statusLabel: m.sub_not_started(),
      shouldEdit: true,
      badgeClassName: BADGE_UPCOMING,
      dotClassName: DOT_UPCOMING,
    };
  }

  return {
    statusLabel: m.nutrition_status_active(),
    shouldEdit: true,
    badgeClassName: BADGE_ACTIVE,
    dotClassName: DOT_ACTIVE,
  };
}

export function getDurationUnitLabel(code: DurationUnit): string {
  switch (code) {
    case "MO":
      return m.duration_months();
    case "A":
      return m.duration_years();
    case "WK":
      return m.duration_weeks();
    case "D":
      return m.duration_days();
    default:
      return code;
  }
}

/** Returns a translated duration string with the count embedded, respecting singular/plural forms. */
export function formatDurationWithUnit(value: number, code: DurationUnit): string {
  switch (code) {
    case "MO":
      return value === 1 ? m.sub_month_singular() : m.sub_months_unit({ count: value });
    case "A":
      return value === 1 ? m.sub_year_singular() : m.sub_years_unit({ count: value });
    case "WK":
      return value === 1 ? m.sub_week_singular() : m.sub_weeks_unit({ count: value });
    case "D":
      return value === 1 ? m.sub_day_singular() : m.sub_days_unit({ count: value });
    default:
      return `${value} ${code}`;
  }
}

export function getTranslatedPlanLabel(plan: PlanLike | null | undefined): string {
  if (!plan) {
    return m.customer_no_subscription();
  }

  const parts: string[] = [];
  if (plan.name?.trim()) {
    parts.push(plan.name.trim());
  }

  const durationValue = plan.duration?.value;
  const durationCode = plan.duration?.code;
  if (durationValue && durationCode) {
    parts.push(`(${formatDurationWithUnit(Number(durationValue), durationCode)})`);
  }

  if (parts.length > 0) {
    return parts.join(" ");
  }

  if (plan.id) {
    return plan.id;
  }

  return m.customer_no_subscription();
}

/**
 * Build translated subscription badge metadata for customer detail cards.
 * Returns a plan label, status label, and visual classes for badge and status dot.
 */
export function getSubscriptionBadgeMetadata(
  subscription: SubscriptionRecord | null | undefined,
): SubscriptionBadgeMetadata {
  if (!subscription) {
    return {
      planLabel: m.customer_no_subscription(),
      statusLabel: "",
      shouldEdit: false,
      badgeClassName: BADGE_NEUTRAL,
      dotClassName: DOT_NEUTRAL,
    };
  }

  const planLabel = getTranslatedPlanLabel(subscription.plan);

  const start = subscription.startDate ? parseDate(subscription.startDate) : null;
  if (!start || !isValidDate(start)) {
    return {
      planLabel,
      statusLabel: m.nutrition_status_inactive(),
      shouldEdit: true,
      badgeClassName: BADGE_NEUTRAL,
      dotClassName: DOT_NEUTRAL,
    };
  }

  const planMonths = durationToMonths(subscription.plan?.duration);
  const end = addMonths(start, planMonths);
  const status = getBadgeStatus(start, end);

  return {
    planLabel,
    ...status,
  };
}

/**
 * Normalize a duration to months as the canonical unit.
 * Used when storing subscription plan durations.
 */
export function normalizeDuration(
  value: number,
  unit: DurationUnit,
): { value: number; unit: "MO" } {
  switch (unit) {
    case "A":
      return { value: Math.round(value * 12), unit: "MO" };
    case "WK":
      return { value: Math.max(1, Math.round(value / 4.33)), unit: "MO" };
    case "D":
      return { value: Math.max(1, Math.round(value / 30)), unit: "MO" };
    default:
      return { value: Math.round(value), unit: "MO" };
  }
}

/**
 * Convert a backend Duration object to months.
 * The Duration uses UCUM time codes: MO (months), D (days), WK (weeks), A (years).
 * @returns Whole months (rounded), defaults to 3 if missing.
 */
export function durationToMonths(duration: PlanDuration | null | undefined): number {
  if (!duration?.value || !duration.code) {
    return DEFAULT_MONTHS;
  }

  const value = Number(duration.value);
  if (Number.isNaN(value) || value <= 0) {
    return DEFAULT_MONTHS;
  }

  switch (duration.code) {
    case "MO":
      return Math.round(value);
    case "A":
      return Math.round(value * 12);
    case "WK":
      return Math.max(1, Math.round(value / 4.33));
    case "D":
      return Math.max(1, Math.round(value / 30));
    default:
      return DEFAULT_MONTHS;
  }
}

/**
 * Parse plan duration string to months.
 * Supports ISO 8601 duration ("P3M", "P6M") and text ("3 months", "6mo").
 * @returns Number of months, defaults to 3 if unparseable.
 */
export function parsePlanDurationMonths(periodDuration?: string | null): number {
  if (!periodDuration) {
    return DEFAULT_MONTHS;
  }
  const normalized = periodDuration.trim().toLowerCase();

  // ISO 8601 format: P3M, P6M, etc.
  const isoMatch = /^p(\d+)m$/.exec(normalized);
  if (isoMatch) {
    return Number.parseInt(isoMatch[1] ?? "3", 10);
  }

  // Text format: "3 months", "6mo"
  const textMatch = /(\d+)\s*(mo|month)/.exec(normalized);
  if (textMatch) {
    return Number.parseInt(textMatch[1] ?? "3", 10);
  }

  return DEFAULT_MONTHS;
}

/**
 * Returns a localized label for subscription time remaining.
 * Shows multi-unit precision: "2 months and 28 days to go".
 * When the start date is in the future, shows "Starts in X days" instead.
 */
export function getTimeRemainingLabel(startDate: Date | string, endDate: Date | string): string {
  const start = parseDate(startDate);
  const end = parseDate(endDate);

  if (!isValidDate(start) || !isValidDate(end)) {
    return m.nutrition_status_inactive();
  }

  if (isPast(end)) {
    return m.sub_expired();
  }
  if (isToday(end)) {
    return m.sub_today();
  }

  if (isFuture(start)) {
    return m.sub_not_started();
  }

  const duration = formatDateDuration(intervalToDuration({ start: new Date(), end }));
  return m.sub_remaining({ duration });
}

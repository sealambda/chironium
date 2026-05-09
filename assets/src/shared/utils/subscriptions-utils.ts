import * as m from "@/paraglide/messages";
import type { DurationUnit } from "@/shared/types/schema-enums";

interface PlanDuration {
  code?: DurationUnit | null;
  value?: string | null;
}

interface PlanLike {
  id?: string | null;
  name?: string | null;
  duration?: PlanDuration | null;
}

const DEFAULT_MONTHS = 3;

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

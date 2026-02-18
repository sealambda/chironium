interface Duration {
  value?: string | null;
  code?: string | null;
}

const DEFAULT_MONTHS = 3;

/**
 * Convert a backend Duration object to months.
 * The Duration uses UCUM time codes: MO (months), D (days), WK (weeks), A (years).
 * @returns Whole months (rounded), defaults to 3 if missing.
 */
export function durationToMonths(duration: Duration | null | undefined): number {
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

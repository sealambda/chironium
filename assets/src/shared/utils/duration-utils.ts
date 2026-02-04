/**
 * Parse plan duration string to months.
 * Supports:
 * - ISO 8601 duration: "P3M", "P6M", "P12M"
 * - Text format: "3 months", "6mo"
 * @returns Number of months, defaults to 3 if unparseable
 */
export function parsePlanDurationMonths(
  periodDuration?: string | null,
): number {
  if (!periodDuration) return 3;
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

  return 3;
}

import type { Duration } from "@/gql/graphql";

/**
 * Convert a structured Duration (from the GraphQL schema) to months.
 * Supports DurationUnit codes: MO (months), A (years), WK (weeks), D (days).
 * @returns Number of months, defaults to 3 if the duration is missing or unparseable.
 */
export function parsePlanDurationMonths(duration?: Duration | null): number {
  if (!duration?.value) {
    return 3;
  }

  const amount = Number.parseFloat(duration.value);
  if (Number.isNaN(amount)) {
    return 3;
  }

  switch (duration.code) {
    case "MO":
      return amount;
    case "A":
      return amount * 12;
    case "WK":
      return Math.round(amount / 4.33);
    case "D":
      return Math.round(amount / 30);
    default:
      return 3;
  }
}

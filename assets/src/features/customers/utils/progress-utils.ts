import { differenceInDays } from "date-fns";
import type { Customer } from "../model/customer-types";

/**
 * Calculate subscription progress percentage (0-100).
 */
export function calculateProgressPercent(customer: Customer): number {
  const now = new Date();
  const { startDate, endDate } = customer.subscription;

  const totalDays = differenceInDays(endDate, startDate);
  const elapsedDays = differenceInDays(now, startDate);

  return Math.min(
    100,
    Math.max(0, Math.round((elapsedDays / totalDays) * 100)),
  );
}

/**
 * Get progress color class based on percentage.
 * - Blue (0-25%): New subscription (bg-sky-500)
 * - Green (25-60%): Stable (bg-emerald-500)
 * - Orange (60-80%): Ending soon (bg-orange-500)
 * - Red (80-100%): Almost finished (bg-red-500)
 * - Grey (≥100%): Ended (bg-muted-foreground)
 */
export function getProgressColor(percent: number): string {
  if (percent >= 100) return "bg-muted-foreground";
  if (percent >= 80) return "bg-red-500";
  if (percent >= 60) return "bg-orange-500";
  if (percent >= 25) return "bg-emerald-500";
  return "bg-sky-500";
}

/**
 * Format plan duration as badge string (e.g., "1 month", "3 months", "12 months").
 */
export function formatPlanDuration(months: number): string {
  return months === 1 ? "1 month" : `${months} months`;
}

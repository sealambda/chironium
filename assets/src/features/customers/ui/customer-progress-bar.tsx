import { format, formatDistanceStrict } from "date-fns";
import { cn } from "@/shared/utils";
import type { Customer } from "../model/customer-types";
import {
  calculateProgressPercent,
  getProgressColor,
} from "../utils/progress-utils";

interface CustomerProgressBarProps {
  customer: Customer;
  /** Variant for different display contexts */
  variant?: "full" | "compact";
  className?: string;
}

/**
 * Progress bar component showing subscription progress.
 *
 * Color coding:
 * - Blue (0-25%): New subscription
 * - Green (25-60%): Stable, middle of subscription
 * - Orange (60-80%): Ending soon
 * - Red (80-100%): Almost finished
 * - Grey (≥100%): Subscription ended
 *
 * Full variant: Shows progress bar + percentage badge + dates + labels
 * Compact variant: Shows only progress bar + percentage (for table cells)
 */
export function CustomerProgressBar({
  customer,
  variant = "full",
  className,
}: CustomerProgressBarProps) {
  const now = new Date();
  const { startDate, endDate, planDurationMonths } = customer.subscription;

  // Calculate progress using shared utility
  const progressPercent = calculateProgressPercent(customer);

  // Calculate relative time labels
  const elapsedLabel = formatDistanceStrict(startDate, now, {
    roundingMethod: "floor",
    addSuffix: true,
  });
  const remainingLabel = formatDistanceStrict(endDate, now, {
    roundingMethod: "floor",
    addSuffix: true,
  });

  // Get progress bar color based on percentage
  const progressColor = getProgressColor(progressPercent);

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="relative h-2 w-full min-w-[60px] overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressColor,
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className="shrink-0 font-medium text-muted-foreground text-xs">
          {progressPercent}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Progress bar with percentage badge */}
      <div className="relative">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressColor,
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Percentage badge - clamped to prevent overflow */}
        <div
          className="absolute -top-1 flex items-center justify-center"
          style={{
            left: `clamp(0px, calc(${progressPercent}% - 20px), calc(100% - 44px))`,
          }}
        >
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold text-white text-xs ring-2 ring-white/80",
              progressColor,
            )}
          >
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Subscription duration info - 3-column grid for alignment */}
      <div className="grid grid-cols-3 items-center gap-1 text-xs">
        {/* Left column - elapsed time */}
        <div className="min-w-0 text-left">
          <div className="font-medium text-muted-foreground">
            {elapsedLabel}
          </div>
          <div className="truncate text-[10px] text-muted-foreground/70">
            {format(startDate, "MMM d, yy")}
          </div>
        </div>

        {/* Center column - plan duration badge */}
        <div className="flex justify-center">
          <div className="rounded-md bg-muted px-2 py-0.5 font-medium text-[10px] text-foreground">
            {planDurationMonths}mo plan
          </div>
        </div>

        {/* Right column - time remaining */}
        <div className="min-w-0 text-right">
          <div className="font-medium text-muted-foreground">
            {remainingLabel}
          </div>
          <div className="truncate text-[10px] text-muted-foreground/70">
            {format(endDate, "MMM d, yy")}
          </div>
        </div>
      </div>
    </div>
  );
}

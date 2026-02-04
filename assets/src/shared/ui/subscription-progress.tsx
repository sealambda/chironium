import { differenceInDays, format, formatDistanceStrict } from "date-fns";
import { cn } from "@/shared/utils";

export interface SubscriptionProgressData {
  startDate: Date | string;
  endDate: Date | string;
  planDurationMonths: number;
}

interface SubscriptionProgressProps {
  subscription: SubscriptionProgressData;
  /** Custom class for the container */
  className?: string;
}

/**
 * Get progress bar color based on percentage.
 * Blue (new) -> Green (stable) -> Orange (ending soon) -> Red (urgent) -> Grey (finished).
 */
function getProgressColor(percent: number): string {
  if (percent >= 100) return "bg-muted-foreground"; // Grey - finished.
  if (percent >= 80) return "bg-red-500"; // Red - urgent, almost done.
  if (percent >= 60) return "bg-orange-500"; // Orange - ending soon.
  if (percent >= 25) return "bg-emerald-500"; // Green - stable.
  return "bg-sky-500"; // Blue - new.
}

/**
 * Calculates subscription progress details.
 */
export function calculateSubscriptionProgress(
  subscription: SubscriptionProgressData,
) {
  const startDate =
    typeof subscription.startDate === "string"
      ? new Date(subscription.startDate)
      : subscription.startDate;
  const endDate =
    typeof subscription.endDate === "string"
      ? new Date(subscription.endDate)
      : subscription.endDate;
  const now = new Date();

  const totalDays = differenceInDays(endDate, startDate);
  const elapsedDays = differenceInDays(now, startDate);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((elapsedDays / totalDays) * 100)),
  );

  const elapsedLabel = formatDistanceStrict(startDate, now, {
    roundingMethod: "floor",
    addSuffix: true,
  });
  const remainingLabel = formatDistanceStrict(endDate, now, {
    roundingMethod: "floor",
    addSuffix: true,
  });

  const startDateFormatted = format(startDate, "MMM d, yy");
  const endDateFormatted = format(endDate, "MMM d, yy");

  const progressColor = getProgressColor(progressPercent);

  return {
    startDate,
    endDate,
    progressPercent,
    elapsedLabel,
    remainingLabel,
    startDateFormatted,
    endDateFormatted,
    progressColor,
  };
}

/**
 * Reusable subscription progress display with progress bar and date information.
 * Shows elapsed time, plan duration, and remaining time in a consistent format.
 */
export function SubscriptionProgress({
  subscription,
  className,
}: Readonly<SubscriptionProgressProps>) {
  const {
    progressPercent,
    elapsedLabel,
    remainingLabel,
    startDateFormatted,
    endDateFormatted,
    progressColor,
  } = calculateSubscriptionProgress(subscription);

  return (
    <div className={cn("w-full", className)}>
      <div className="relative">
        {/* Custom progress bar with dynamic color. */}
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              progressColor,
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Progress percentage badge - clamped to prevent overflow. */}
        <div
          className="absolute -top-1 flex items-center justify-center"
          style={{
            left: `clamp(0px, calc(${progressPercent}% - 20px), calc(100% - 44px))`,
          }}
        >
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold text-white text-xs ring-2 ring-white/40",
              progressColor,
            )}
          >
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Subscription duration info - 3-column grid for proper alignment. */}
      <div className="mt-3 grid grid-cols-3 items-center gap-1 text-xs">
        {/* Left column - elapsed time. */}
        <div className="min-w-0 text-left">
          <div className="font-medium text-muted-foreground">
            {elapsedLabel}
          </div>
          <div className="truncate text-[10px] text-muted-foreground/70">
            {startDateFormatted}
          </div>
        </div>
        {/* Center column - plan duration badge. */}
        <div className="flex justify-center">
          <div className="rounded-md bg-muted px-2 py-0.5 font-medium text-[10px] text-foreground">
            {subscription.planDurationMonths}mo plan
          </div>
        </div>
        {/* Right column - time remaining. */}
        <div className="min-w-0 text-right">
          <div className="font-medium text-muted-foreground">
            {remainingLabel}
          </div>
          <div className="truncate text-[10px] text-muted-foreground/70">
            {endDateFormatted}
          </div>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/shared/utils";

interface ChartSkeletonProps {
  className?: string;
}

/**
 * Skeleton placeholder for a line chart.
 * Displays a wavy horizontal line pattern to indicate where a chart will be.
 * Standard height: 96px (h-24) for square cards.
 */
export function LineChartSkeleton({ className }: Readonly<ChartSkeletonProps>) {
  return (
    <div
      className={cn(
        "relative h-24 w-full overflow-hidden rounded-lg",
        className,
      )}
    >
      {/* Background */}
      <div className="absolute inset-0 bg-muted/20" />

      {/* Wavy line path */}
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full animate-pulse"
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <path
          d="M0,25 Q12,15 25,25 T50,20 T75,30 T100,22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-muted-foreground/40"
        />
      </svg>

      {/* Gradient overlay for fade effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-muted/10 to-transparent" />
    </div>
  );
}

/**
 * Skeleton placeholder for a circular/donut chart.
 * Displays a ring shape to indicate where a pie/donut chart will be.
 * Standard height: 96px (h-24) for square cards.
 */
export function CircularChartSkeleton({
  className,
}: Readonly<ChartSkeletonProps>) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        "h-24 w-24",
        className,
      )}
    >
      {/* Ring using SVG */}
      <svg
        aria-hidden="true"
        className="h-full w-full animate-pulse"
        viewBox="0 0 36 36"
      >
        {/* Background ring */}
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/40"
        />
        {/* Partial filled segment */}
        <circle
          cx="18"
          cy="18"
          r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="60 28"
          strokeLinecap="round"
          className="text-muted-foreground/40"
          transform="rotate(-90 18 18)"
        />
      </svg>
    </div>
  );
}

// Bar heights for skeleton - defined as constant to use value as key
const BAR_HEIGHTS = [40, 70, 55, 85, 45, 65, 75] as const;

/**
 * Skeleton placeholder for a bar chart.
 * Displays vertical bars to indicate where a bar chart will be.
 */
export function BarChartSkeleton({ className }: Readonly<ChartSkeletonProps>) {
  return (
    <div
      className={cn(
        "flex h-12 w-full items-end justify-between gap-1 rounded-md bg-muted/30 p-1",
        className,
      )}
    >
      {BAR_HEIGHTS.map((height) => (
        <div
          key={`bar-${height}`}
          className="flex-1 animate-pulse rounded-t bg-muted-foreground/20"
          style={{ height: `${height}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton placeholder for a progress ring with percentage.
 * Larger version suitable for featured cards.
 */
export function ProgressRingSkeleton({
  className,
}: Readonly<ChartSkeletonProps>) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center",
        "h-24 w-24",
        className,
      )}
    >
      {/* Ring using SVG */}
      <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 36 36">
        {/* Background ring */}
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/50"
        />
        {/* Animated segment */}
        <circle
          cx="18"
          cy="18"
          r="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray="70 24"
          strokeLinecap="round"
          className="animate-pulse text-muted-foreground/40"
          transform="rotate(-90 18 18)"
        />
      </svg>

      {/* Center placeholder */}
      <div className="absolute flex flex-col items-center">
        <div className="h-6 w-10 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

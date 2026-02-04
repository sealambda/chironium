import { differenceInDays, format, formatDistanceStrict } from "date-fns";
import type { SubscriptionHistoryRecord } from "@/mocks/types";
import { Badge } from "@/shared/ui/badge";
import { MetricCard } from "@/shared/ui/metric-card";
import { cn } from "@/shared/utils";

const statusConfig = {
  active: { label: "Active", variant: "default" as const },
  expired: { label: "Expired", variant: "secondary" as const },
  cancelled: { label: "Cancelled", variant: "destructive" as const },
};

/**
 * Get progress bar color based on percentage.
 */
function getProgressColor(percent: number): string {
  if (percent >= 100) return "bg-muted-foreground";
  if (percent >= 80) return "bg-red-500";
  if (percent >= 60) return "bg-orange-500";
  if (percent >= 25) return "bg-emerald-500";
  return "bg-sky-500";
}

interface SubscriptionCardProps {
  subscription: SubscriptionHistoryRecord | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Card displaying current subscription status with progress bar.
 */
export function SubscriptionCard({
  subscription,
  onClick,
  isLoading,
}: Readonly<SubscriptionCardProps>) {
  if (isLoading) {
    return (
      <MetricCard title="Subscription" onClick={onClick}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-24 rounded bg-muted" />
          <div className="h-2.5 w-full rounded-full bg-muted" />
          <div className="h-3 w-32 rounded bg-muted" />
        </div>
      </MetricCard>
    );
  }

  if (!subscription) {
    return (
      <MetricCard title="Subscription" onClick={onClick}>
        <p className="text-muted-foreground text-sm">No subscription found</p>
      </MetricCard>
    );
  }

  const startDate = new Date(subscription.startDate);
  const endDate = new Date(subscription.endDate);
  const now = new Date();
  const status = statusConfig[subscription.status];

  const totalDays = differenceInDays(endDate, startDate);
  const elapsedDays = differenceInDays(now, startDate);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((elapsedDays / totalDays) * 100)),
  );

  const remainingLabel = formatDistanceStrict(endDate, now, {
    roundingMethod: "floor",
    addSuffix: true,
  });

  const progressColor = getProgressColor(progressPercent);

  return (
    <MetricCard title="Subscription" lastUpdated={startDate} onClick={onClick}>
      <div className="space-y-3">
        {/* Status badge and duration */}
        <div className="flex items-center justify-between">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="text-muted-foreground text-sm">
            {subscription.planDurationMonths} month plan
          </span>
        </div>

        {/* Progress bar */}
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
          <div
            className="absolute -top-1 flex items-center justify-center"
            style={{
              left: `clamp(0px, calc(${progressPercent}% - 16px), calc(100% - 36px))`,
            }}
          >
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 font-semibold text-white text-xs",
                progressColor,
              )}
            >
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* End date info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Ends {format(endDate, "MMM d, yyyy")}
          </span>
          <span className="font-medium text-foreground">{remainingLabel}</span>
        </div>
      </div>
    </MetricCard>
  );
}

import type { SubscriptionHistoryRecord } from "@/mocks/types";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";

interface CompactSubscriptionCardProps {
  subscription: SubscriptionHistoryRecord | undefined;
  onClick: () => void;
  isLoading?: boolean;
}

/**
 * Compact subscription card with progress bar display.
 * Uses the shared SubscriptionProgress component for consistent display.
 */
export function CompactSubscriptionCard({
  subscription,
  onClick,
  isLoading,
}: Readonly<CompactSubscriptionCardProps>) {
  if (isLoading) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full text-left"
        disabled
      >
        <div className="rounded-2xl border border-border/30 bg-violet-50/50 p-4 shadow-sm">
          {/* Header skeleton */}
          <div className="mb-3 h-5 w-24 animate-pulse rounded bg-muted" />
          {/* Progress bar skeleton */}
          <div className="h-2.5 w-full animate-pulse rounded-full bg-muted" />
          {/* Date info skeleton */}
          <div className="mt-3 grid grid-cols-3 gap-1">
            <div className="h-8 animate-pulse rounded bg-muted" />
            <div className="mx-auto h-5 w-14 animate-pulse rounded bg-muted" />
            <div className="h-8 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </button>
    );
  }

  if (!subscription) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        <div className="rounded-2xl border border-border/30 bg-violet-50/50 p-4 shadow-sm transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Subscription</h3>
          </div>
          <p className="mt-2 text-muted-foreground text-sm">No active plan</p>
        </div>
      </button>
    );
  }

  return (
    <button type="button" onClick={onClick} className="w-full text-left">
      <div className="rounded-2xl border border-border/30 bg-violet-50/50 p-4 shadow-sm transition-all hover:shadow-md">
        <h3 className="mb-3 font-semibold text-foreground">Subscription</h3>
        <SubscriptionProgress subscription={subscription} />
      </div>
    </button>
  );
}

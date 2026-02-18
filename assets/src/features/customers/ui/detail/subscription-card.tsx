import { subscriptionStatusConfig } from "@/features/customers/model/status-config";
import type { CustomerSubscription } from "@/features/customers/types/customer-subscription";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { getTimeRemainingLabel } from "@/shared/utils/subscription-utils";

function SubscriptionCardBody({
  isLoading,
  subscription,
  isActionable,
  isPaused,
}: {
  isLoading?: boolean;
  subscription: CustomerSubscription | undefined;
  isActionable: boolean;
  isPaused: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-1 md:gap-1.5">
        {Array.from({ length: 12 }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton with fixed length
          <Skeleton key={i} className="h-4 flex-1 rounded-full md:h-5" />
        ))}
      </div>
    );
  }

  if (subscription && isActionable) {
    return (
      <div className="space-y-3">
        <SubscriptionProgress subscription={subscription} />
        {isPaused ? (
          <div className="flex justify-center">
            <Badge variant={subscriptionStatusConfig.paused.variant}>
              {subscriptionStatusConfig.paused.label}
            </Badge>
          </div>
        ) : null}
      </div>
    );
  }

  return <p className="text-muted-foreground text-sm">{m.stat_no_plan()}</p>;
}

interface SubscriptionCardProps {
  subscription: CustomerSubscription | undefined;
  isLoading?: boolean;
}

export function SubscriptionCard({ subscription, isLoading }: Readonly<SubscriptionCardProps>) {
  const isActionable = subscription?.status === "active" || subscription?.status === "paused";
  const isPaused = subscription?.status === "paused";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm">
      <div className="px-4 py-4 lg:px-6">
        {isLoading ? (
          <Skeleton className="h-5 w-24" />
        ) : (
          <h3 className="font-semibold text-foreground lg:font-bold lg:text-sm lg:uppercase lg:tracking-wide">
            {subscription && isActionable
              ? getTimeRemainingLabel(subscription.endDate)
              : m.sub_no_active()}
          </h3>
        )}
      </div>

      <div className="px-4 pb-4 lg:px-6 lg:pb-6">
        <SubscriptionCardBody
          isLoading={isLoading}
          subscription={subscription}
          isActionable={isActionable}
          isPaused={isPaused}
        />
      </div>
    </div>
  );
}

import { addMonths, formatISO } from "date-fns";

import type { SubscriptionRecord } from "@/features/customers/api/subscriptions-api";
import * as m from "@/paraglide/messages";
import { Skeleton } from "@/shared/ui/skeleton";
import { SubscriptionProgress } from "@/shared/ui/subscription-progress";
import { durationToMonths } from "@/shared/utils/duration-utils";
import { getTimeRemainingLabel } from "@/shared/utils/subscription-utils";

function computeEndDate(startDate: string, planDurationMonths: number): string {
  return formatISO(addMonths(new Date(startDate), planDurationMonths), { representation: "date" });
}

function SubscriptionCardBody({
  isLoading,
  subscription,
  isActionable,
}: {
  isLoading?: boolean;
  subscription: SubscriptionRecord | undefined;
  isActionable: boolean;
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
    const planDurationMonths = durationToMonths(subscription.plan.duration);
    const endDate = computeEndDate(subscription.startDate, planDurationMonths);

    return (
      <SubscriptionProgress
        startDate={subscription.startDate}
        endDate={endDate}
        planDurationMonths={planDurationMonths}
      />
    );
  }

  return <p className="text-muted-foreground text-sm">{m.sub_no_plan()}</p>;
}

interface SubscriptionCardProps {
  subscription: SubscriptionRecord | undefined;
  isLoading?: boolean;
}

export function SubscriptionCard({ subscription, isLoading }: Readonly<SubscriptionCardProps>) {
  const isActionable = subscription?.state === "active" || subscription?.state === "suspended";

  const timeLabel =
    subscription && isActionable
      ? getTimeRemainingLabel(
          computeEndDate(subscription.startDate, durationToMonths(subscription.plan.duration)),
        )
      : m.sub_no_active();

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 shadow-sm">
      <div className="px-4 py-4 lg:px-6">
        {isLoading ? (
          <Skeleton className="h-5 w-24" />
        ) : (
          <h3 className="font-semibold text-foreground lg:font-bold lg:text-sm lg:uppercase lg:tracking-wide">
            {timeLabel}
          </h3>
        )}
      </div>

      <div className="px-4 pb-4 lg:px-6 lg:pb-6">
        <SubscriptionCardBody
          isLoading={isLoading}
          subscription={subscription}
          isActionable={isActionable}
        />
      </div>
    </div>
  );
}

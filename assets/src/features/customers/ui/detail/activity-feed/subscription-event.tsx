import type { SubscriptionVariant } from "@/features/customers/types/activity-feed";
import * as m from "@/paraglide/messages";

interface SubscriptionPause {
  id: string;
  startDate: string;
  endDate?: string | null;
  reason?: string | null;
}

interface SubscriptionEventProps {
  variant: SubscriptionVariant;
  planName?: string | null;
  pause?: SubscriptionPause;
}

export function SubscriptionEvent({ variant, planName, pause }: Readonly<SubscriptionEventProps>) {
  const reason = pause?.reason?.trim();
  const shouldShowPauseReason = variant === "paused" && Boolean(reason);
  const resolvedPlanName = planName?.trim() || m.activity_subscription_plan_fallback();

  return (
    <div className="space-y-2">
      <p className="text-foreground/80 text-sm">{resolvedPlanName}</p>
      {shouldShowPauseReason ? (
        <p className="border-muted-foreground/20 border-l-2 pl-2.5 text-muted-foreground text-xs italic">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

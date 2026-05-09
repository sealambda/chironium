import type { SubscriptionVariant } from "@/features/customers/types/activity-feed";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";

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

function variantBadgeVariant(variant: SubscriptionVariant) {
  switch (variant) {
    case "started":
      return "info" as const;
    case "finished":
    case "cancelled":
      return "destructive" as const;
    case "paused":
      return "warning" as const;
    case "resumed":
      return "success" as const;
  }
}

function variantBadgeLabel(variant: SubscriptionVariant): string {
  switch (variant) {
    case "started":
      return m.activity_event_subscription_started();
    case "finished":
      return m.activity_event_subscription_finished();
    case "paused":
      return m.activity_event_subscription_paused();
    case "resumed":
      return m.activity_event_subscription_resumed();
    case "cancelled":
      return m.activity_event_subscription_cancelled();
  }
}

export function SubscriptionEvent({ variant, planName, pause }: Readonly<SubscriptionEventProps>) {
  const reason = pause?.reason?.trim();
  const resolvedPlanName = planName?.trim() || m.activity_subscription_plan_fallback();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={variantBadgeVariant(variant)}>{variantBadgeLabel(variant)}</Badge>
      </div>
      <p className="text-foreground/80 text-sm">{resolvedPlanName}</p>
      {reason ? (
        <p className="border-muted-foreground/20 border-l-2 pl-2.5 text-muted-foreground text-xs italic">
          {reason}
        </p>
      ) : null}
    </div>
  );
}

import { addMonths, format, formatISO, parseISO } from "date-fns";

import * as m from "@/paraglide/messages";
import type { SubscriptionListItem } from "@/shared/types/subscriptions";
import { getDateLocale } from "@/shared/utils/date-locale";
import { durationToMonths } from "@/shared/utils/subscriptions-utils";
import { cn } from "@/shared/utils/utils";

interface SubscriptionProgressProps {
  subscription: SubscriptionListItem | null | undefined;
  className?: string;
}

function segmentRounding(isFirst: boolean, isLast: boolean): string {
  if (isFirst && isLast) {
    return "rounded-full";
  }
  if (isFirst) {
    return "rounded-r rounded-l-full";
  }
  if (isLast) {
    return "rounded-r-full rounded-l";
  }
  return "rounded";
}

export type SubscriptionProgressTone = "success" | "warning" | "destructive";

const PROGRESS_TONE_CLASS: Record<SubscriptionProgressTone, string> = {
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
};

export function getSubscriptionProgressRatio(
  startDate: Date,
  endDate: Date,
  now: Date = new Date(),
): number {
  const totalMs = endDate.getTime() - startDate.getTime();
  if (totalMs <= 0) {
    return 1;
  }

  const elapsedMs = now.getTime() - startDate.getTime();
  const ratio = elapsedMs / totalMs;
  return Math.min(1, Math.max(0, ratio));
}

export function getSubscriptionProgressTone(progress: number): SubscriptionProgressTone {
  if (progress >= 0.75) {
    return "destructive";
  }
  if (progress >= 0.5) {
    return "warning";
  }
  return "success";
}

/** Resolve the subscription end date, preferring the pause-adjusted value from the API. */
export function resolveSubscriptionEndDate(
  startDateIso: string,
  planDurationMonths: number,
  effectiveEndDateIso?: string | null,
): Date {
  if (effectiveEndDateIso) {
    return parseISO(effectiveEndDateIso);
  }

  const startDate = parseISO(startDateIso);
  return parseISO(formatISO(addMonths(startDate, planDurationMonths), { representation: "date" }));
}

/**
 * Displays subscription progress as month-section circles.
 * Each circle represents one month; elapsed months are colored, remaining are neutral.
 * Renders a placeholder when no subscription is provided.
 */
export function SubscriptionProgress({
  subscription,
  className,
}: Readonly<SubscriptionProgressProps>) {
  if (!subscription) {
    return (
      <div className={cn("relative w-full", className)}>
        <div className="h-4 opacity-0 md:h-5" aria-hidden="true" />
        <div className="mt-1.5 text-xs opacity-0" aria-hidden="true">
          x
        </div>
        <div className="absolute inset-0 flex items-center">
          <span className="text-muted-foreground text-sm">{m.customer_no_subscription()}</span>
        </div>
      </div>
    );
  }

  const planDurationMonths = durationToMonths(subscription.plan?.duration);
  const startDate = parseISO(subscription.startDate);
  const endDate = resolveSubscriptionEndDate(
    subscription.startDate,
    planDurationMonths,
    subscription.effectiveEndDate,
  );

  const progress = getSubscriptionProgressRatio(startDate, endDate);
  const progressToneClass = PROGRESS_TONE_CLASS[getSubscriptionProgressTone(progress)];
  // Color one segment per *completed* month so the first segment only fills after
  // a full month elapses, not the moment any time has passed.
  const elapsedMonths = Math.min(planDurationMonths, Math.floor(progress * planDurationMonths));

  const locale = getDateLocale();
  const startFormatted = format(startDate, "MMM d, yy", { locale });
  const endFormatted = format(endDate, "MMM d, yy", { locale });

  return (
    <div className={cn("w-full", className)}>
      <div
        className="flex items-center gap-0.5 md:gap-1"
        role="progressbar"
        aria-label={m.common_progress()}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        {Array.from({ length: planDurationMonths }, (_, i) => {
          const isFirst = i === 0;
          const isLast = i === planDurationMonths - 1;

          const cls = cn(
            "h-4 flex-1 md:h-5",
            segmentRounding(isFirst, isLast),
            i < elapsedMonths ? progressToneClass : "bg-muted",
          );
          return <div key={i} className={cls} aria-hidden="true" />;
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-foreground/65 text-xs">
        <span>{startFormatted}</span>
        <span>{endFormatted}</span>
      </div>
    </div>
  );
}

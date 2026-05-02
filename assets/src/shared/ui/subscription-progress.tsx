import { addMonths, format, formatISO } from "date-fns";

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

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function getSubscriptionProgressTone(progress: number): SubscriptionProgressTone {
  const clamped = clampProgress(progress);
  if (clamped < 0.5) {
    return "success";
  }
  if (clamped < 0.75) {
    return "warning";
  }
  return "destructive";
}

export function getSubscriptionProgressRatio(
  startDate: Date,
  endDate: Date,
  currentDate: Date = new Date(),
): number {
  const durationMs = endDate.getTime() - startDate.getTime();
  if (durationMs <= 0) {
    return 0;
  }
  return clampProgress((currentDate.getTime() - startDate.getTime()) / durationMs);
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
  const startDate = new Date(subscription.startDate);
  const endDate = new Date(
    formatISO(addMonths(startDate, planDurationMonths), { representation: "date" }),
  );

  const progress = getSubscriptionProgressRatio(startDate, endDate);
  const progressToneClass = PROGRESS_TONE_CLASS[getSubscriptionProgressTone(progress)];
  const elapsedMonths = Math.min(planDurationMonths, Math.ceil(progress * planDurationMonths));

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
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length month segments never reorder
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

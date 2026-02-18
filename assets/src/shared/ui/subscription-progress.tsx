import { differenceInMonths, format } from "date-fns";

import { getDateLocale } from "@/shared/utils/date-locale";
import { cn } from "@/shared/utils/utils";

interface SubscriptionProgressProps {
  startDate: string;
  endDate: string;
  planDurationMonths: number;
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

/**
 * Displays subscription progress as month-section circles.
 * Each circle represents one month; elapsed months are colored, remaining are neutral.
 */
export function SubscriptionProgress({
  startDate: startDateStr,
  endDate: endDateStr,
  planDurationMonths,
  className,
}: Readonly<SubscriptionProgressProps>) {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  const elapsedMonths = Math.min(
    planDurationMonths,
    Math.max(0, differenceInMonths(new Date(), startDate)),
  );

  const locale = getDateLocale();
  const startFormatted = format(startDate, "MMM d, yy", { locale });
  const endFormatted = format(endDate, "MMM d, yy", { locale });

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center gap-0.5 md:gap-1">
        {Array.from({ length: planDurationMonths }, (_, i) => {
          const isFirst = i === 0;
          const isLast = i === planDurationMonths - 1;

          const cls = cn(
            "h-4 flex-1 md:h-5",
            segmentRounding(isFirst, isLast),
            i < elapsedMonths ? "bg-sky-500" : "bg-neutral-300",
          );
          // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length month segments never reorder
          return <div key={i} className={cls} />;
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-foreground/65 text-xs">
        <span>{startFormatted}</span>
        <span>{endFormatted}</span>
      </div>
    </div>
  );
}

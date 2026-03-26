import { format } from "date-fns";

import { getDateLocale } from "@/shared/utils/date-locale";

interface CurrentReviewTaskSummaryProps {
  description?: string | null;
  startDateTime?: string | null;
}

export function CurrentReviewTaskSummary({
  description,
  startDateTime,
}: Readonly<CurrentReviewTaskSummaryProps>) {
  const locale = getDateLocale();
  const startDate = startDateTime ? new Date(startDateTime) : null;
  const startLabel = startDate ? format(startDate, "PPp", { locale }) : null;

  return (
    <div className="rounded-md border border-border/60 bg-muted/30 p-2">
      <p className="text-muted-foreground text-xs">{description?.trim() || "—"}</p>
      {startLabel ? <p className="mt-1 text-muted-foreground text-xs">{startLabel}</p> : null}
    </div>
  );
}

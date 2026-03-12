import { format, formatDistanceStrict, isValid, parseISO } from "date-fns";
import { MoveRight, RefreshCcwDot } from "lucide-react";

import type { MenstrualCycleSummary } from "@/features/customers/api/observations-api";
import * as m from "@/paraglide/messages";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";

interface MenstrualCycleCardProps {
  cycle: MenstrualCycleSummary | null;
  isLoading?: boolean;
}

function formatCycleDate(date: string | null): string {
  if (!date) {
    return m.common_unknown();
  }

  const parsed = parseISO(date);
  if (!isValid(parsed)) {
    return m.common_unknown();
  }

  return format(parsed, "MMMM d", { locale: getDateLocale() });
}

function formatCycleDuration(startDate: string | null, endDate: string | null): string {
  if (!startDate || !endDate) {
    return m.common_unknown();
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) {
    return m.common_unknown();
  }

  return formatDistanceStrict(start, end, {
    locale: getDateLocale(),
    unit: "day",
  });
}

function MenstrualCycleCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-7 w-16" />
      </div>
      <div className="mt-7 flex items-center justify-center gap-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-5 w-8" />
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="mt-7 space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-4/5" />
      </div>
    </div>
  );
}

export function MenstrualCycleCard({ cycle, isLoading }: Readonly<MenstrualCycleCardProps>) {
  if (isLoading) {
    return <MenstrualCycleCardSkeleton />;
  }

  if (!cycle) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
        <h3 className="font-bold text-foreground text-xl uppercase tracking-wide">
          {m.menstrual_cycle_title()}
        </h3>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
          <RefreshCcwDot className="size-10 text-muted-foreground/60" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.menstrual_cycle_empty()}</p>
            <p className="mt-0.5 text-foreground/65 text-xs">{m.menstrual_cycle_empty_desc()}</p>
          </div>
        </div>
      </div>
    );
  }

  const start = formatCycleDate(cycle?.startDate ?? null);
  const end = formatCycleDate(cycle?.endDate ?? null);
  const duration = formatCycleDuration(cycle?.startDate ?? null, cycle?.endDate ?? null);
  const note = cycle?.notes?.trim() || m.menstrual_cycle_note_empty();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <div className="flex items-end gap-2">
        <h3 className="font-bold text-foreground text-xl uppercase tracking-wide leading-none">
          {m.menstrual_cycle_last_cycle()}
        </h3>
        <span className="text-foreground/50 text-sm leading-none">{duration}</span>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-center lg:flex-nowrap">
        <p className="font-medium text-foreground text-2xl">{start}</p>
        <MoveRight className="size-9 text-foreground/40" aria-hidden="true" />
        <p className="font-medium text-foreground text-2xl">{end}</p>
      </div>

      <p className="mt-7 text-foreground/70 text-xl italic leading-relaxed">"{note}"</p>
    </div>
  );
}

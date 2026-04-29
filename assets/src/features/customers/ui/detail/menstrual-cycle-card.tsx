import { addDays, format, formatDistanceStrict, isValid, parseISO } from "date-fns";
import { MoveRight, RefreshCcwDot } from "lucide-react";

import type { MenstrualCycleSummary } from "@/features/customers/api/observations-api";
import { CustomerDetailEmptyCard } from "@/features/customers/ui/detail/customer-detail-empty-card";
import * as m from "@/paraglide/messages";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";
import { cn } from "@/shared/utils/utils";

interface MenstrualCycleCardProps {
  cycle: MenstrualCycleSummary | null;
  isLoading?: boolean;
  compact?: boolean;
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

function formatDurationDays(durationDays: number): string {
  const start = new Date(2000, 0, 1);
  return formatDistanceStrict(start, addDays(start, durationDays), {
    locale: getDateLocale(),
    unit: "day",
  });
}

function formatCycleDuration(cycle: MenstrualCycleSummary): string {
  if (cycle.durationDays != null) {
    return formatDurationDays(cycle.durationDays);
  }

  const { startDate, endDate } = cycle;
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

function MenstrualCycleCardSkeleton({ compact }: Readonly<{ compact?: boolean }>) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card shadow-sm",
        compact ? "p-3 lg:p-4" : "p-4 lg:p-5",
      )}
    >
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

export function MenstrualCycleCard({
  cycle,
  isLoading,
  compact,
}: Readonly<MenstrualCycleCardProps>) {
  if (isLoading) {
    return <MenstrualCycleCardSkeleton compact={compact} />;
  }

  if (!cycle) {
    return (
      <CustomerDetailEmptyCard
        icon={RefreshCcwDot}
        title={m.menstrual_cycle_empty()}
        description={m.menstrual_cycle_empty_desc()}
      />
    );
  }

  const start = formatCycleDate(cycle?.startDate ?? null);
  const end = formatCycleDate(cycle?.endDate ?? null);
  const duration = formatCycleDuration(cycle);
  const note = cycle?.notes?.trim() || m.menstrual_cycle_note_empty();

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card shadow-sm",
        compact ? "p-3 lg:p-4" : "p-4 lg:p-5",
      )}
    >
      <div className="flex items-end gap-2">
        <h3 className="font-bold text-foreground text-xl uppercase leading-none tracking-wide">
          {m.menstrual_cycle_last_cycle()}
        </h3>
        <span className="text-foreground/50 text-sm leading-none">{duration}</span>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-center gap-3 text-center lg:flex-nowrap">
        <p className="font-medium text-2xl text-foreground">{start}</p>
        <MoveRight className="size-9 text-foreground/40" aria-hidden="true" />
        <p className="font-medium text-2xl text-foreground">{end}</p>
      </div>

      <p className="mt-7 text-foreground/70 text-xl italic leading-relaxed">"{note}"</p>
    </div>
  );
}

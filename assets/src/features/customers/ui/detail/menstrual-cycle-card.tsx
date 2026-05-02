import { differenceInDays, format, isValid, parseISO } from "date-fns";
import { NotebookText, RefreshCcwDot, UserRound } from "lucide-react";

import type { MenstrualCycleSummary } from "@/features/customers/api/observations-api";
import {
  actorFromNotes,
  actorFromVersions,
  mergeFeedActor,
} from "@/features/customers/types/activity-feed";
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

  return format(parsed, "MMM d, yyyy", { locale: getDateLocale() });
}

function formatCycleDuration(cycle: MenstrualCycleSummary): string {
  if (cycle.durationDays != null) {
    return String(cycle.durationDays);
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

  return String(differenceInDays(end, start) + 1);
}

function CycleMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="mt-0.5 font-medium text-foreground text-sm tabular-nums">{value}</p>
    </div>
  );
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
        <Skeleton className="h-5 w-28" />
        <Skeleton className="size-8 rounded-full" />
      </div>
      <div className="mt-4 space-y-1.5">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-12 rounded-lg" />
      </div>
      <div className="mt-4 flex flex-col gap-2">
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

  const duration = formatCycleDuration(cycle);
  const start = formatCycleDate(cycle.startDate ?? null);
  const end = formatCycleDate(cycle.endDate ?? null);
  const hasDuration =
    cycle.durationDays != null || (cycle.startDate != null && cycle.endDate != null);
  const note = cycle.notes?.trim() || null;
  const actor = mergeFeedActor(
    actorFromVersions(cycle.paperTrailVersions),
    actorFromNotes(cycle.sourceNotes),
  );

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card shadow-sm",
        compact ? "p-3 lg:p-4" : "p-4 lg:p-5",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground text-sm uppercase tracking-wide">
          {m.menstrual_cycle_last_cycle()}
        </h3>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <RefreshCcwDot className="size-4" aria-hidden />
        </div>
      </div>

      {/* Hero: Duration */}
      <div className="mt-3 space-y-0.5">
        {hasDuration ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-3xl text-foreground tabular-nums">{duration}</span>
            </div>
            <p className="text-muted-foreground text-xs">{m.field_cycle_duration_days()}</p>
          </>
        ) : (
          <p className="font-medium text-muted-foreground text-sm">{m.common_unknown()}</p>
        )}
      </div>

      {/* Dates row — secondary visual weight */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <CycleMetric label={m.field_cycle_start_date()} value={start} />
        <CycleMetric label={m.field_cycle_end_date()} value={end} />
      </div>

      {/* Notes */}
      <div className="mt-4 rounded-lg bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <NotebookText className="size-3.5" aria-hidden />
          <span>{m.field_cycle_notes()}</span>
        </div>
        <p className="mt-1 text-foreground/75 text-sm leading-relaxed">
          {note ?? m.menstrual_cycle_note_empty()}
        </p>
      </div>

      {/* Actor attribution */}
      {actor ? (
        <p className="mt-3 flex items-center gap-1.5 text-muted-foreground text-xs">
          <UserRound className="size-3.5" aria-hidden />
          {m.activity_noted_by({ name: actor.name })}
        </p>
      ) : null}
    </div>
  );
}

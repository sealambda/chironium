import { differenceInCalendarDays, format, isValid, parseISO } from "date-fns";
import { NotebookText, RefreshCcwDot } from "lucide-react";
import { useState } from "react";

import type { MenstrualCycleSummary } from "@/features/customers/api/observations-api";
import { AddMenstrualCycleDialog } from "@/features/customers/ui/detail/add-menstrual-cycle-dialog";
import { CustomerDetailEmptyCard } from "@/features/customers/ui/detail/customer-detail-empty-card";
import { DetailEditButton } from "@/features/customers/ui/detail/detail-edit-button";
import { SelfReportedBadge } from "@/features/customers/ui/detail/self-reported-badge";
import { TagsCardTitle } from "@/features/customers/ui/detail/tags-card-content";
import * as m from "@/paraglide/messages";
import { Skeleton } from "@/shared/ui/skeleton";
import { getDateLocale } from "@/shared/utils/date-locale";
import { cn } from "@/shared/utils/utils";

interface MenstrualCycleCardProps {
  personId: string;
  patientId: string | null;
  cycle: MenstrualCycleSummary | null;
  isLoading?: boolean;
  compact?: boolean;
}

function formatCycleDate(date: string | null, fallback?: string): string {
  if (!date) {
    if (fallback) {
      return fallback;
    }

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
  if (!startDate) {
    return m.common_unknown();
  }

  const start = parseISO(startDate);
  const end = endDate ? parseISO(endDate) : new Date();
  if (!isValid(start) || !isValid(end)) {
    return m.common_unknown();
  }

  return String(differenceInCalendarDays(end, start) + 1);
}

function CycleMetric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-foreground tabular-nums">{value}</p>
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
  personId,
  patientId,
  cycle,
  isLoading,
  compact,
}: Readonly<MenstrualCycleCardProps>) {
  const [editOpen, setEditOpen] = useState(false);

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
  const end = formatCycleDate(cycle.endDate ?? null, m.menstrual_cycle_ongoing());
  const hasDuration = cycle.durationDays != null || cycle.startDate != null;
  const note = cycle.notes?.trim() || null;
  const canEdit = Boolean(patientId && cycle.startObservationId);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card shadow-sm",
        compact ? "p-3 lg:p-4" : "p-4 lg:p-5",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <TagsCardTitle>{m.menstrual_cycle_last_cycle()}</TagsCardTitle>
        {canEdit ? (
          <AddMenstrualCycleDialog
            personId={personId}
            patientId={patientId}
            mode="edit"
            initialCycle={cycle}
            open={editOpen}
            onOpenChange={setEditOpen}
          >
            <DetailEditButton ariaLabel={m.history_edit_element_title()} />
          </AddMenstrualCycleDialog>
        ) : null}
        {cycle.selfReported ? <SelfReportedBadge className="ml-auto" /> : null}
      </div>

      {/* Hero: Duration */}
      <div className="mt-3 space-y-0.5">
        {hasDuration ? (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-foreground tabular-nums">{duration}</span>
            <span className="text-sm text-foreground/65">days</span>
          </div>
        ) : (
          <p className="text-sm font-medium text-muted-foreground">{m.common_unknown()}</p>
        )}
      </div>

      {/* Dates row — secondary visual weight */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <CycleMetric label={m.field_cycle_start_date()} value={start} />
        <CycleMetric label={m.field_cycle_end_date()} value={end} />
      </div>

      {/* Notes */}
      <div className="mt-4 rounded-lg bg-muted/30 p-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <NotebookText className="size-3.5" aria-hidden />
          <span>{m.field_cycle_notes()}</span>
        </div>
        <p className="mt-1 text-sm leading-relaxed text-foreground/75">
          {note ?? m.menstrual_cycle_note_empty()}
        </p>
      </div>
    </div>
  );
}

import { addDays, format, formatDistanceStrict, isValid, parseISO } from "date-fns";
import { CalendarDays, Clock3, NotebookText } from "lucide-react";

import type { MenstrualCycleEntry } from "@/features/customers/api/observations-api";
import * as m from "@/paraglide/messages";
import { getDateLocale } from "@/shared/utils/date-locale";

interface MenstrualCycleEventProps {
  cycle: MenstrualCycleEntry;
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

function formatDuration(cycle: MenstrualCycleEntry): string | null {
  if (cycle.durationDays != null) {
    const start = new Date(2000, 0, 1);
    return formatDistanceStrict(start, addDays(start, cycle.durationDays), {
      locale: getDateLocale(),
      unit: "day",
    });
  }
  if (!cycle.startDate) {
    return null;
  }
  const start = parseISO(cycle.startDate);
  const end = cycle.endDate ? parseISO(cycle.endDate) : new Date();
  if (!isValid(start) || !isValid(end)) {
    return null;
  }
  return formatDistanceStrict(start, end, {
    locale: getDateLocale(),
    unit: "day",
  });
}

export function MenstrualCycleEvent({ cycle }: Readonly<MenstrualCycleEventProps>) {
  const start = formatCycleDate(cycle.startDate);
  const end = cycle.endDate ? formatCycleDate(cycle.endDate) : m.menstrual_cycle_ongoing();
  const duration = formatDuration(cycle);
  const note = cycle.notes?.trim() ?? null;

  return (
    <div className="max-w-md rounded-lg border bg-card p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {m.field_cycle_start_date()}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground tabular-nums">{start}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden />
            {m.field_cycle_end_date()}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground tabular-nums">{end}</p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock3 className="size-3.5" aria-hidden />
            {m.field_cycle_duration_days()}
          </p>
          <p className="mt-1 text-sm font-medium text-foreground tabular-nums">
            {duration ?? m.common_unknown()}
          </p>
        </div>
      </div>
      {note ? (
        <p className="mt-3 flex gap-2 rounded-md bg-muted/30 p-2 text-sm text-foreground/75">
          <NotebookText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span>{note}</span>
        </p>
      ) : null}
    </div>
  );
}

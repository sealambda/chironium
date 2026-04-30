import { addDays, format, formatDistanceStrict, isValid, parseISO } from "date-fns";
import { MoveRight } from "lucide-react";

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
  if (!cycle.startDate || !cycle.endDate) {
    return null;
  }
  const start = parseISO(cycle.startDate);
  const end = parseISO(cycle.endDate);
  if (!isValid(start) || !isValid(end)) {
    return null;
  }
  return formatDistanceStrict(start, end, { locale: getDateLocale(), unit: "day" });
}

export function MenstrualCycleEvent({ cycle }: Readonly<MenstrualCycleEventProps>) {
  const start = formatCycleDate(cycle.startDate);
  const end = cycle.endDate ? formatCycleDate(cycle.endDate) : null;
  const duration = formatDuration(cycle);
  const note = cycle.notes?.trim() ?? null;

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-foreground">
        <span className="font-medium tabular-nums">{start}</span>
        {end ? (
          <>
            <MoveRight className="size-4 text-muted-foreground" aria-hidden />
            <span className="font-medium tabular-nums">{end}</span>
          </>
        ) : null}
        {duration ? <span className="text-muted-foreground text-sm">· {duration}</span> : null}
      </div>
      {note ? <p className="mt-2 text-foreground/80 text-sm">{note}</p> : null}
    </div>
  );
}

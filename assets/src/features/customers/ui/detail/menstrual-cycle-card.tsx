import { format, isValid, parseISO } from "date-fns";
import { RefreshCcwDot } from "lucide-react";

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

  return format(parsed, "MMM d", { locale: getDateLocale() });
}

function MenstrualCycleCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-2xl" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
      <div className="mt-5 space-y-2.5">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-8">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>
      <div className="my-5 h-px bg-neutral-200" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-5 w-3/5" />
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
      <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
        <h3 className="font-bold text-foreground text-xl uppercase tracking-wide">
          {m.menstrual_cycle_title()}
        </h3>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
          <RefreshCcwDot className="size-10 text-neutral-300" />
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
  const note = cycle?.notes?.trim() || m.menstrual_cycle_note_empty();

  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      <h3 className="font-bold text-foreground text-xl uppercase tracking-wide">
        {m.menstrual_cycle_title()}
      </h3>

      <div className="mt-5">
        <p className="font-semibold text-foreground/55 text-xs uppercase tracking-wide">
          {m.menstrual_cycle_last_cycle()}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-8 gap-y-2">
          <p className="text-base text-foreground/60">
            <span>{m.menstrual_cycle_start_label()}</span>{" "}
            <span className="font-semibold text-foreground text-xl">{start}</span>
          </p>
          <p className="text-base text-foreground/60">
            <span>{m.menstrual_cycle_end_label()}</span>{" "}
            <span className="font-semibold text-foreground text-xl">{end}</span>
          </p>
        </div>
      </div>

      <div className="my-5 h-px bg-neutral-200" />

      <div>
        <p className="font-semibold text-foreground/55 text-xs uppercase tracking-wide">
          {m.menstrual_cycle_last_cycle_note()}
        </p>
        <p className="mt-2 text-foreground/70 text-xl italic">“{note}”</p>
      </div>
    </div>
  );
}

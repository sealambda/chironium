import { differenceInDays } from "date-fns";
import { ScaleIcon } from "lucide-react";

import {
  type AnthropometricSnapshot,
  selectCurrentStateSnapshot,
} from "@/features/customers/api/anthropometry-api";
import {
  AnthropometryMeasurementDetails,
  DeltaPill,
} from "@/features/customers/ui/detail/anthropometry-measurement-details";
import { CustomerDetailEmptyCard } from "@/features/customers/ui/detail/customer-detail-empty-card";
import * as m from "@/paraglide/messages";
import { Skeleton } from "@/shared/ui/skeleton";
import { computeDelta, formatAnthropometryValue } from "@/shared/utils/measurement-utils";
import { cn } from "@/shared/utils/utils";

// ─── Props ───────────────────────────────────────────────────────────

interface AnthropometryCardProps {
  history: AnthropometricSnapshot[];
  isLoading?: boolean;
  compact?: boolean;
}

// ─── Layer 1: Hero ───────────────────────────────────────────────────

function HeroSection({
  latest,
  weightDelta,
}: Readonly<{
  latest: AnthropometricSnapshot;
  weightDelta: number | null;
}>) {
  const daysAgo = differenceInDays(new Date(), new Date(latest.date));
  const weight = latest.weight;
  const height = latest.height;
  const isWeightMissing = weight == null;

  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-2">
        {isWeightMissing ? (
          <span className="font-medium text-muted-foreground text-sm">{m.common_unknown()}</span>
        ) : (
          <>
            <span className="font-bold text-3xl text-foreground tabular-nums">
              {formatAnthropometryValue(weight)}
            </span>
            <span className="text-foreground/65 text-sm">{m.common_unit_kg()}</span>
          </>
        )}
        {weight == null || weightDelta == null ? null : <DeltaPill value={weightDelta} unit="kg" />}
      </div>
      {height == null ? null : (
        <div className="flex items-baseline gap-1.5">
          <span className="font-medium text-foreground text-sm tabular-nums">
            {formatAnthropometryValue(height)}
          </span>
          <span className="text-foreground/65 text-xs">{m.common_unit_cm()}</span>
        </div>
      )}
      <div className="text-foreground/65 text-xs">
        {daysAgo === 0
          ? m.anthropometry_recorded_today()
          : m.anthropometry_recorded_days_ago({ count: daysAgo })}
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

function AnthropometryCardSkeleton({ compact }: Readonly<{ compact?: boolean }>) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card shadow-sm",
        compact ? "p-3 lg:p-4" : "p-4 lg:p-5",
      )}
    >
      <div className="min-h-19 space-y-1.5">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      <div className="my-4 h-px bg-border" />

      <div className="grid grid-cols-2 text-center">
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-6 w-14" />
        </div>
        <div className="flex flex-col items-center gap-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-14" />
        </div>
      </div>

      <div className="mt-4 space-y-3 rounded-xl bg-muted/30 p-3">
        {Array.from({ length: 2 }, (_g, g) => (
          <div key={`grp-${String(g)}`} className="space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {Array.from({ length: 2 }, (_m, i) => (
                <div
                  key={`m-${String(g)}-${String(i)}`}
                  className="flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!compact && (
        <div className="mt-4 border-border border-t pt-3">
          <Skeleton className="h-4 w-52" />
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function AnthropometryCard({
  history,
  isLoading,
  compact,
}: Readonly<AnthropometryCardProps>) {
  if (isLoading) {
    return <AnthropometryCardSkeleton compact={compact} />;
  }

  const latest = history[0];

  if (!latest) {
    return (
      <CustomerDetailEmptyCard
        icon={ScaleIcon}
        title={m.anthropometry_no_records()}
        description={m.anthropometry_no_records_desc()}
      />
    );
  }

  const currentState = selectCurrentStateSnapshot(history) ?? latest;
  const weightHistory = history.filter((s) => s.weight != null);
  const weightDelta = computeDelta(weightHistory[0]?.weight, weightHistory[1]?.weight);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-border/50 bg-card shadow-sm",
        compact ? "p-3 lg:p-4" : "p-4 lg:p-5",
      )}
    >
      <HeroSection latest={currentState} weightDelta={weightDelta} />

      <div className="my-4 h-px bg-border" />

      <AnthropometryMeasurementDetails latest={currentState} />
    </div>
  );
}

import { differenceInDays } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { DumbbellIcon, ScaleIcon, ShirtIcon } from "lucide-react";

import type { BodyMeasurements, BodyMetricsRecord } from "@/mocks/types";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  classifyBmi,
  classifyWhr,
  computeDelta,
  computeWaistToHipRatio,
  type HealthClassification,
  heightMetersToCm,
} from "@/shared/utils/measurement-utils";
import { cn } from "@/shared/utils/utils";

// ─── Props ───────────────────────────────────────────────────────────

interface BiometricSummaryCardProps {
  history: BodyMetricsRecord[];
  isLoading?: boolean;
}

// ─── Internal helpers ────────────────────────────────────────────────

const STATUS_DOT_COLOR: Record<HealthClassification, string> = {
  healthy: "bg-emerald-600",
  warning: "bg-amber-600",
  danger: "bg-red-500",
};

function StatusDot({ classification }: Readonly<{ classification: HealthClassification }>) {
  return (
    <span
      className={cn("inline-block size-2 shrink-0 rounded-full", STATUS_DOT_COLOR[classification])}
    />
  );
}

function DeltaPill({ value, unit }: Readonly<{ value: number; unit: string }>) {
  const display = unit === "kg" ? Math.abs(value).toFixed(1) : String(Math.abs(value));

  if (value === 0) {
    return (
      <Badge className="h-5 border-border bg-muted/50 px-1.5 font-semibold text-foreground/65 text-xs">
        &mdash; 0 {unit}
      </Badge>
    );
  }

  const isLoss = value < 0;
  const colorClass = isLoss
    ? "border-emerald-200 bg-emerald-100 text-emerald-800"
    : "border-red-200 bg-red-100 text-red-800";
  const arrow = isLoss ? "\u2193" : "\u2191";

  return (
    <Badge className={cn("h-5 px-1.5 font-semibold text-xs", colorClass)}>
      {arrow} {display} {unit}
    </Badge>
  );
}

// ─── Layer 1: Hero ───────────────────────────────────────────────────

function HeroSection({
  latest,
  weightDelta,
}: Readonly<{ latest: BodyMetricsRecord; weightDelta: number | null }>) {
  const heightCm = heightMetersToCm(latest.heightM);
  const daysAgo = differenceInDays(new Date(), new Date(latest.date));

  return (
    <div className="space-y-0.5">
      <div className="flex items-baseline gap-2">
        <span className="font-bold text-3xl text-foreground tabular-nums">{latest.weight}</span>
        <span className="text-foreground/65 text-sm">kg</span>
        {weightDelta !== null ? <DeltaPill value={weightDelta} unit="kg" /> : null}
      </div>

      <div className="text-foreground/65 text-sm">
        <span className="font-medium text-foreground tabular-nums">{heightCm}</span> <span>cm</span>
      </div>

      <div className="text-foreground/65 text-xs">
        {daysAgo === 0
          ? m.biometric_recorded_today()
          : m.biometric_recorded_days_ago({ count: daysAgo })}
      </div>
    </div>
  );
}

// ─── Layer 2: Metabolic Indicators ───────────────────────────────────

function MetabolicIndicatorsRow({
  bmi,
  waist,
  hip,
}: Readonly<{ bmi: number; waist?: number; hip?: number }>) {
  const bmiClass = classifyBmi(bmi);
  const whr = computeWaistToHipRatio(waist, hip);
  const whrClass = whr !== null ? classifyWhr(whr) : null;

  return (
    <div className="grid grid-cols-2 text-center">
      <div>
        <p className="text-foreground/65 text-xs">{m.table_bmi()}</p>
        <p className="inline-flex items-center gap-1.5 font-semibold text-foreground text-lg tabular-nums">
          {bmi.toFixed(1)}
          <StatusDot classification={bmiClass} />
        </p>
      </div>

      {whr !== null && whrClass !== null ? (
        <div>
          <p className="text-foreground/65 text-xs">{m.biometric_whr()}</p>
          <p className="inline-flex items-center gap-1.5 font-semibold text-foreground text-lg tabular-nums">
            {whr.toFixed(2)}
            <StatusDot classification={whrClass} />
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Layer 3: Grouped Body Measurements ──────────────────────────────

interface MeasurementGroupDef {
  labelKey: () => string;
  icon: LucideIcon;
  keys: (keyof BodyMeasurements)[];
}

const MEASUREMENT_GROUPS: MeasurementGroupDef[] = [
  {
    labelKey: m.biometric_group_torso,
    icon: ShirtIcon,
    keys: ["chest", "waist", "hip"],
  },
  {
    labelKey: m.biometric_group_limbs,
    icon: DumbbellIcon,
    keys: ["biceps", "quadriceps"],
  },
];

const MEASUREMENT_LABELS: Record<keyof BodyMeasurements, () => string> = {
  chest: m.measurement_chest,
  waist: m.measurement_waist,
  hip: m.measurement_hip,
  biceps: m.measurement_biceps,
  quadriceps: m.measurement_quadriceps,
};

function buildMeasurementCells(
  visibleKeys: (keyof BodyMeasurements)[],
  latest: BodyMeasurements,
  previous: BodyMeasurements | undefined,
): React.ReactNode[] {
  const count = visibleKeys.length;

  return visibleKeys.map((key, i) => {
    const value = latest[key];
    const delta = computeDelta(value, previous?.[key]);
    const isFirstRow = count >= 3 && i === 0;

    return (
      <div key={key} className={cn("py-2 text-center", isFirstRow && "col-span-2")}>
        <p className="text-foreground/65 text-xs">{MEASUREMENT_LABELS[key]()}</p>
        <div className="inline-flex flex-col items-center gap-1 md:flex-row md:items-baseline md:gap-1.5">
          <span className="font-medium text-foreground tabular-nums leading-none">{value} cm</span>
          {delta !== null ? <DeltaPill value={delta} unit="cm" /> : null}
        </div>
      </div>
    );
  });
}

function GroupedMeasurements({
  latest,
  previous,
}: Readonly<{
  latest: BodyMeasurements;
  previous: BodyMeasurements | undefined;
}>) {
  const visibleGroups = MEASUREMENT_GROUPS.filter((group) =>
    group.keys.some((key) => latest[key] !== undefined),
  );

  if (visibleGroups.length === 0) {
    return null;
  }

  return (
    <div className="h-full rounded-xl bg-white/80 p-3">
      <div className="grid grid-cols-2 gap-x-4">
        {visibleGroups.flatMap((group, groupIndex) => {
          const groupId = group.keys[0];
          const visibleKeys = group.keys.filter((key) => latest[key] !== undefined);
          const Icon = group.icon;
          const elements: React.ReactNode[] = [];

          // Spacing between groups
          if (groupIndex > 0) {
            elements.push(<div key={`gspc-${groupId}`} className="col-span-2 h-3" />);
          }

          // Group header spans full width (no vsep through headers)
          elements.push(
            <div
              key={`hdr-${groupId}`}
              className="col-span-2 flex items-center justify-center gap-1.5 pb-1 text-foreground/65"
            >
              <Icon className="size-3.5" />
              <span className="font-medium text-xs">{group.labelKey()}</span>
            </div>,
            <div key={`hsep-${groupId}`} className="col-span-2 h-px bg-neutral-200/50" />,
          );

          elements.push(...buildMeasurementCells(visibleKeys, latest, previous));

          return elements;
        })}
      </div>
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

export function BiometricSummaryCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      {/* Hero: weight, height, date */}
      <div className="space-y-1.5">
        <div className="flex items-baseline gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-5 w-8" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-3.5 w-32" />
      </div>

      <div className="my-4 h-px bg-neutral-200" />

      {/* Key Metrics */}
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

      {/* Measurements zone — fills remaining space */}
      <div className="mt-4 flex-1 space-y-3 rounded-xl bg-white/80 p-3">
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

      {/* Footer — pinned to bottom */}
      <div className="mt-auto border-neutral-200 border-t pt-3">
        <Skeleton className="h-4 w-52" />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function BiometricSummaryCard({ history, isLoading }: Readonly<BiometricSummaryCardProps>) {
  if (isLoading) {
    return <BiometricSummaryCardSkeleton />;
  }

  const latest = history[0];
  const previous = history[1];

  if (!latest) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
        <div className="flex flex-col items-center gap-2 py-6">
          <ScaleIcon className="size-8 text-neutral-400" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.biometric_no_records()}</p>
            <p className="text-foreground/65 text-xs">{m.biometric_no_records_desc()}</p>
          </div>
        </div>
      </div>
    );
  }

  const weightDelta = computeDelta(latest.weight, previous?.weight);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm lg:p-5">
      {/* Layer 1: Hero — weight, height, recency */}
      <HeroSection latest={latest} weightDelta={weightDelta} />

      <div className="my-4 h-px bg-neutral-200" />

      {/* Layer 2: Key Metrics — BMI, WHR */}
      <MetabolicIndicatorsRow
        bmi={latest.bmi}
        waist={latest.measurements.waist}
        hip={latest.measurements.hip}
      />

      {/* Layer 3: Grouped Body Measurements — fills remaining space */}
      <div className="mt-4 flex-1">
        <GroupedMeasurements latest={latest.measurements} previous={previous?.measurements} />
      </div>
    </div>
  );
}

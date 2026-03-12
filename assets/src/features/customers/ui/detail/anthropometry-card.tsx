import { differenceInDays } from "date-fns";
import type { LucideIcon } from "lucide-react";
import { DumbbellIcon, ScaleIcon, ShirtIcon } from "lucide-react";

import type {
  AnthropometricSnapshot,
  CircumferenceKey,
} from "@/features/customers/api/anthropometry-api";
import { CardHistoryLinkFooter } from "@/features/customers/ui/detail/card-footer";
import { AnthropometryDialog } from "@/features/customers/ui/detail/anthropometry-dialog";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { CardAddButton } from "@/shared/ui/card-add-button";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  classifyBmi,
  classifyWhr,
  computeDelta,
  computeWaistToHipRatio,
  type HealthClassification,
} from "@/shared/utils/measurement-utils";
import { cn } from "@/shared/utils/utils";

// ─── Props ───────────────────────────────────────────────────────────

interface AnthropometryCardProps {
  personId: string;
  patientId: string | null;
  history: AnthropometricSnapshot[];
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
}: Readonly<{ latest: AnthropometricSnapshot; weightDelta: number | null }>) {
  const daysAgo = differenceInDays(new Date(), new Date(latest.date));

  return (
    <div className="min-h-19 space-y-0.5">
      {latest.weight !== undefined ? (
        <div className="flex items-baseline gap-2">
          <span className="font-bold text-3xl text-foreground tabular-nums">{latest.weight}</span>
          <span className="text-foreground/65 text-sm">kg</span>
          {weightDelta !== null ? <DeltaPill value={weightDelta} unit="kg" /> : null}
        </div>
      ) : null}

      {latest.height !== undefined ? (
        <div className="text-foreground/65 text-sm">
          <span className="font-medium text-foreground tabular-nums">{latest.height}</span>{" "}
          <span>cm</span>
        </div>
      ) : null}

      <div className="text-foreground/65 text-xs">
        {daysAgo === 0
          ? m.anthropometry_recorded_today()
          : m.anthropometry_recorded_days_ago({ count: daysAgo })}
      </div>
    </div>
  );
}

// ─── Layer 2: Metabolic Indicators ───────────────────────────────────

function MetabolicIndicatorsRow({
  bmi,
  whr,
}: Readonly<{ bmi: number | null; whr: number | null }>) {
  const hasBmi = bmi !== null;
  const hasWhr = whr !== null;
  const bmiClass = hasBmi ? classifyBmi(bmi) : null;
  const whrClass = hasWhr ? classifyWhr(whr) : null;

  const cols = !!bmiClass && !!whrClass ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className={cn("grid text-center", cols)}>
      {hasBmi && bmiClass !== null ? (
        <div>
          <p className="text-foreground/65 text-xs">{m.anthropometry_bmi()}</p>
          <p className="inline-flex items-center gap-1.5 font-semibold text-foreground text-lg tabular-nums">
            {bmi.toFixed(1)}
            <StatusDot classification={bmiClass} />
          </p>
        </div>
      ) : null}

      {hasWhr && whrClass !== null ? (
        <div>
          <p className="text-foreground/65 text-xs">{m.anthropometry_whr()}</p>
          <p className="inline-flex items-center gap-1.5 font-semibold text-foreground text-lg tabular-nums">
            {whr.toFixed(2)}
            <StatusDot classification={whrClass} />
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ─── Layer 3: Grouped Circumferences ─────────────────────────────────

interface CircumferenceGroupDef {
  labelKey: () => string;
  icon: LucideIcon;
  keys: CircumferenceKey[];
}

const CIRCUMFERENCE_GROUPS: CircumferenceGroupDef[] = [
  {
    labelKey: m.anthropometry_group_torso,
    icon: ShirtIcon,
    keys: ["chest", "waist", "hip"],
  },
  {
    labelKey: m.anthropometry_group_limbs,
    icon: DumbbellIcon,
    keys: ["arm", "thigh"],
  },
];

const CIRCUMFERENCE_LABELS: Record<CircumferenceKey, () => string> = {
  chest: m.anthropometry_chest,
  waist: m.anthropometry_waist,
  hip: m.anthropometry_hip,
  arm: m.anthropometry_arm,
  thigh: m.anthropometry_thigh,
};

function buildCircumferenceCells(
  visibleKeys: CircumferenceKey[],
  latest: AnthropometricSnapshot,
  previous: AnthropometricSnapshot | undefined,
): React.ReactNode[] {
  const count = visibleKeys.length;

  return visibleKeys.map((key, i) => {
    const value = latest[key];
    const delta = computeDelta(value, previous?.[key]);
    const isFirstRow = count >= 3 && i === 0;

    return (
      <div key={key} className={cn("py-2 text-center", isFirstRow && "col-span-2")}>
        <p className="text-foreground/65 text-xs">{CIRCUMFERENCE_LABELS[key]()}</p>
        <div className="inline-flex flex-col items-center gap-1 md:flex-row md:items-baseline md:gap-1.5">
          <span className="font-medium text-foreground tabular-nums leading-none">{value} cm</span>
          {delta !== null ? <DeltaPill value={delta} unit="cm" /> : null}
        </div>
      </div>
    );
  });
}

function GroupedCircumferences({
  latest,
  previous,
  visibleGroups,
}: Readonly<{
  latest: AnthropometricSnapshot;
  previous: AnthropometricSnapshot | undefined;
  visibleGroups: CircumferenceGroupDef[];
}>) {
  return (
    <div className="h-full rounded-xl bg-muted/30 p-3">
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

          elements.push(
            <div
              key={`hdr-${groupId}`}
              className="col-span-2 flex items-center justify-center gap-1.5 pb-1 text-foreground/65"
            >
              <Icon className="size-3.5" />
              <span className="font-medium text-xs">{group.labelKey()}</span>
            </div>,
            <div key={`hsep-${groupId}`} className="col-span-2 h-px bg-border/60" />,
            ...buildCircumferenceCells(visibleKeys, latest, previous),
          );

          return elements;
        })}
      </div>
    </div>
  );
}

function MeasurementDetailsSection({
  latest,
  previous,
}: Readonly<{
  latest: AnthropometricSnapshot;
  previous: AnthropometricSnapshot | undefined;
}>) {
  const bmi = latest.bmi ?? null;
  const whr = latest.whr ?? computeWaistToHipRatio(latest.waist, latest.hip);
  const visibleGroups = CIRCUMFERENCE_GROUPS.filter((group) =>
    group.keys.some((key) => latest[key] !== undefined),
  );

  const canShowMetabolicIndicators = bmi !== null || whr !== null;
  const canShowCircumferences = visibleGroups.length > 0;

  if (!canShowMetabolicIndicators && !canShowCircumferences) {
    return (
      <div className="flex-1 px-3 py-5 text-center text-foreground/65 text-sm">
        {m.anthropometry_calculation_unavailable()}
      </div>
    );
  }

  return (
    <>
      {canShowMetabolicIndicators ? <MetabolicIndicatorsRow bmi={bmi} whr={whr} /> : null}
      {canShowCircumferences ? (
        <div className={cn("flex-1", canShowMetabolicIndicators ? "mt-4" : "mt-0")}>
          <GroupedCircumferences
            latest={latest}
            previous={previous}
            visibleGroups={visibleGroups}
          />
        </div>
      ) : null}
    </>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

export function AnthropometryCardSkeleton() {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
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

      <div className="mt-4 flex-1 space-y-3 rounded-xl bg-muted/30 p-3">
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

      <div className="mt-auto border-border border-t pt-3">
        <Skeleton className="h-4 w-52" />
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────

export function AnthropometryCard({
  personId,
  patientId,
  history,
  isLoading,
}: Readonly<AnthropometryCardProps>) {
  if (isLoading) {
    return <AnthropometryCardSkeleton />;
  }

  const latest = history[0];
  const previous = history[1];

  if (!latest) {
    return (
      <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
        <div className="flex items-start justify-end">
          <AnthropometryDialog personId={personId} patientId={patientId}>
            <CardAddButton label={m.anthropometry_add()} />
          </AnthropometryDialog>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8">
          <ScaleIcon className="size-10 text-muted-foreground/60" />
          <div className="text-center">
            <p className="font-medium text-foreground text-sm">{m.anthropometry_no_records()}</p>
            <p className="mt-0.5 text-foreground/65 text-xs">{m.anthropometry_no_records_desc()}</p>
          </div>
        </div>
        <CardHistoryLinkFooter
          customerId={personId}
          to="/customers/$customerId/anthropometry"
          label={m.anthropometry_view_history()}
        />
      </div>
    );
  }

  const weightDelta = computeDelta(latest.weight, previous?.weight);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border/50 bg-card p-4 shadow-sm lg:p-5">
      <div className="flex items-start justify-between">
        <HeroSection latest={latest} weightDelta={weightDelta} />
        <AnthropometryDialog personId={personId} patientId={patientId}>
          <CardAddButton label={m.anthropometry_add()} />
        </AnthropometryDialog>
      </div>

      <div className="my-4 h-px bg-border" />

      <MeasurementDetailsSection latest={latest} previous={previous} />

      <CardHistoryLinkFooter
        customerId={personId}
        to="/customers/$customerId/anthropometry"
        label={m.anthropometry_view_history()}
      />
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { DumbbellIcon, ShirtIcon } from "lucide-react";

import type {
  AnthropometricSnapshot,
  CircumferenceKey,
} from "@/features/customers/api/anthropometry-api";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import {
  classifyBmi,
  classifyWhr,
  computeDelta,
  computeWaistToHipRatio,
  formatAnthropometryValue,
  type HealthClassification,
} from "@/shared/utils/measurement-utils";
import { cn } from "@/shared/utils/utils";

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

export function DeltaPill({ value, unit }: Readonly<{ value: number; unit: string }>) {
  const display = formatAnthropometryValue(Math.abs(value));
  const unitLabel = unit === "kg" ? m.common_unit_kg() : m.common_unit_cm();

  if (value === 0) {
    return (
      <Badge className="h-5 border-border bg-muted/50 px-1.5 text-xs font-semibold text-foreground/65">
        &mdash; {display} {unitLabel}
      </Badge>
    );
  }

  const isLoss = value < 0;
  const colorClass = isLoss ? "success" : "destructive";
  const arrow = isLoss ? "\u2193" : "\u2191";

  return (
    <Badge variant={colorClass} className="h-5 px-1.5 text-xs font-semibold">
      {arrow} {display} {unitLabel}
    </Badge>
  );
}

function MetabolicIndicatorsRow({
  bmi,
  whr,
}: Readonly<{ bmi: number | null; whr: number | null }>) {
  const hasBmi = bmi !== null;
  const hasWhr = whr !== null;
  const bmiClass = hasBmi ? classifyBmi(bmi) : null;
  const whrClass = hasWhr ? classifyWhr(whr) : null;

  const cols = bmiClass && whrClass ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className={cn("grid text-center", cols)}>
      {hasBmi && bmiClass !== null ? (
        <div>
          <p className="text-xs text-foreground/65">{m.anthropometry_bmi()}</p>
          <p className="inline-flex items-center gap-1.5 text-lg font-semibold text-foreground tabular-nums">
            {formatAnthropometryValue(bmi)}
            <StatusDot classification={bmiClass} />
          </p>
        </div>
      ) : null}

      {hasWhr && whrClass !== null ? (
        <div>
          <p className="text-xs text-foreground/65">{m.anthropometry_whr()}</p>
          <p className="inline-flex items-center gap-1.5 text-lg font-semibold text-foreground tabular-nums">
            {whr.toFixed(2)}
            <StatusDot classification={whrClass} />
          </p>
        </div>
      ) : null}
    </div>
  );
}

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

export const CIRCUMFERENCE_LABELS: Record<CircumferenceKey, () => string> = {
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
  return visibleKeys.map((key) => {
    const value = latest[key];
    if (value === undefined) {
      return null;
    }
    const delta = computeDelta(value, previous?.[key]);

    return (
      <div key={key} className="py-2 text-center">
        <p className="text-xs text-foreground/65">{CIRCUMFERENCE_LABELS[key]()}</p>
        <div className="inline-flex flex-col items-center gap-1">
          <span className="leading-none font-medium text-foreground tabular-nums">
            {formatAnthropometryValue(value)} {m.common_unit_cm()}
          </span>
          {delta === null ? null : <DeltaPill value={delta} unit="cm" />}
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
  const colsClass = (count: number) => {
    if (count >= 3) {
      return "grid-cols-3";
    }
    if (count === 2) {
      return "grid-cols-2";
    }
    return "grid-cols-1";
  };

  return (
    <div className="space-y-3 rounded-xl bg-muted/30 p-3">
      {visibleGroups.map((group) => {
        const groupId = group.keys[0];
        const visibleKeys = group.keys.filter((key) => latest[key] !== undefined);
        const Icon = group.icon;

        return (
          <div key={groupId}>
            <div className="flex items-center justify-center gap-1.5 pb-1 text-foreground/65">
              <Icon className="size-3.5" />
              <span className="text-xs font-medium">{group.labelKey()}</span>
            </div>
            <div className="h-px bg-border/60" />
            <div className={cn("grid gap-x-2", colsClass(visibleKeys.length))}>
              {buildCircumferenceCells(visibleKeys, latest, previous)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AnthropometryMeasurementDetails({
  latest,
  previous,
}: Readonly<{
  latest: AnthropometricSnapshot;
  previous?: AnthropometricSnapshot;
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
      <div className="px-3 py-5 text-center text-sm text-foreground/65">
        {m.anthropometry_calculation_unavailable()}
      </div>
    );
  }

  return (
    <>
      {canShowMetabolicIndicators ? <MetabolicIndicatorsRow bmi={bmi} whr={whr} /> : null}
      {canShowCircumferences ? (
        <div className={canShowMetabolicIndicators ? "mt-4" : undefined}>
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

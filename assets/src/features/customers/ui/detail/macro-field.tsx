import { Lock, Unlock } from "lucide-react";

import * as m from "@/paraglide/messages";
import { Field, FieldError, FieldLabel } from "@/shared/ui/field";
import { NumberStepperInput } from "@/shared/ui/number-stepper-input";
import { cn } from "@/shared/utils/utils";

import { MACRO_META } from "./nutrition-macros";
import { type MacroId, unitValueFromGrams } from "./nutrition-plan-utils";

interface MacroFieldProps {
  readonly macroId: MacroId;
  /** Grams, as the raw form string. */
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** Target kcal — drives the live "% kcal" read-out. */
  readonly totalKcal: number;
  /** Body weight (kg) — drives the live "g/kg" read-out. */
  readonly weightKg?: number;
  readonly locked: boolean;
  readonly disabled?: boolean;
  readonly onToggleLock: () => void;
  readonly errors?: Array<{ message?: string } | undefined>;
}

/** Read-out column: a converted value with its unit underneath. */
function Readout({ value, unit }: Readonly<{ value: string; unit: string }>) {
  return (
    <div className="flex flex-col items-end leading-tight">
      <span className="font-medium text-foreground">{value}</span>
      <span className="text-[0.6875rem] text-muted-foreground">{unit}</span>
    </div>
  );
}

/**
 * One macronutrient row in the plan dialog. Grams is the single editable unit
 * (most canonical); the equivalent **% of kcal** and **g/kg** are shown live
 * beside it — no unit switching. A lock pins this macro for auto-balance.
 */
export function MacroField({
  macroId,
  value,
  onValueChange,
  totalKcal,
  weightKg,
  locked,
  disabled,
  onToggleLock,
  errors,
}: Readonly<MacroFieldProps>) {
  const meta = MACRO_META[macroId];
  const Icon = meta.icon;
  const grams = Number(value) || 0;
  const pct = unitValueFromGrams({
    unit: "percent",
    grams,
    kcalPerGram: meta.kcalPerGram,
    totalKcal,
  });
  const gkg = unitValueFromGrams({
    unit: "gkg",
    grams,
    kcalPerGram: meta.kcalPerGram,
    totalKcal,
    weightKg,
  });
  const lockLabel = locked ? m.nutrition_macro_unlock() : m.nutrition_macro_lock();

  return (
    <Field data-invalid={(errors?.length ?? 0) > 0}>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel className="flex items-center gap-1.5">
          <Icon className={cn("size-4 shrink-0", meta.iconClass)} aria-hidden />
          {meta.label()}
        </FieldLabel>
        <button
          type="button"
          onClick={onToggleLock}
          disabled={disabled}
          aria-pressed={locked}
          aria-label={lockLabel}
          title={lockLabel}
          className={cn(
            "cursor-pointer rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            locked && "text-primary hover:text-primary",
          )}
        >
          {locked ? (
            <Lock className="size-3.5" aria-hidden />
          ) : (
            <Unlock className="size-3.5" aria-hidden />
          )}
        </button>
      </div>
      <div className="flex items-center gap-3">
        <NumberStepperInput
          value={value}
          onValueChange={onValueChange}
          min={0}
          step={5}
          disabled={disabled}
          decrementLabel={m.common_decrease()}
          incrementLabel={m.common_increase()}
          className="flex-1"
        />
        <div className="flex shrink-0 gap-3 text-xs tabular-nums">
          <Readout value={pct > 0 ? String(pct) : "—"} unit={m.nutrition_macro_unit_pct_kcal()} />
          <Readout value={gkg > 0 ? String(gkg) : "—"} unit={m.nutrition_macro_unit_g_per_kg()} />
        </div>
      </div>
      <FieldError errors={errors} />
    </Field>
  );
}

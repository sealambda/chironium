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

/**
 * One macronutrient row in the plan dialog. Grams is the single editable unit
 * (most canonical); the equivalent **% of kcal** and **g/kg** are shown live
 * underneath — no unit switching. A lock pins this macro for auto-balance.
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
        <FieldLabel className="flex items-center gap-2 font-medium">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md",
              meta.softClass,
            )}
          >
            <Icon className={cn("size-3.5", meta.iconClass)} aria-hidden />
          </span>
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
            "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50",
            locked && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
          )}
        >
          {locked ? (
            <Lock className="size-3.5" aria-hidden />
          ) : (
            <Unlock className="size-3.5" aria-hidden />
          )}
        </button>
      </div>
      <NumberStepperInput
        value={value}
        onValueChange={onValueChange}
        min={0}
        step={5}
        disabled={disabled}
        decrementLabel={m.common_decrease()}
        incrementLabel={m.common_increase()}
      />
      <p className="flex items-center gap-1.5 text-muted-foreground text-xs tabular-nums">
        <span className="font-medium text-foreground">{pct > 0 ? `${pct}%` : "—"}</span>
        {m.common_unit_kcal()}
        <span aria-hidden>·</span>
        <span className="font-medium text-foreground">{gkg > 0 ? gkg : "—"}</span>
        {m.nutrition_macro_unit_g_per_kg()}
      </p>
      <FieldError errors={errors} />
    </Field>
  );
}

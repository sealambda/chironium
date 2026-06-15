import { Lock, Unlock } from "lucide-react";
import { useState } from "react";

import * as m from "@/paraglide/messages";
import { Field, FieldDescription, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { cn } from "@/shared/utils/utils";

import { formatMacroUnitDisplay, gramsFromUnitValue, type MacroUnit } from "./nutrition-plan-utils";

const UNIT_ITEMS: ReadonlyArray<{ value: MacroUnit; label: () => string }> = [
  { value: "grams", label: m.nutrition_macro_unit_grams },
  { value: "gkg", label: m.nutrition_macro_unit_g_per_kg },
  { value: "percent", label: m.nutrition_macro_unit_pct_kcal },
];

interface MacroUnitFieldProps {
  readonly label: string;
  /** Current persisted amount in grams. */
  readonly grams: number;
  readonly unit: MacroUnit;
  readonly kcalPerGram: number;
  readonly totalKcal: number;
  readonly weightKg?: number;
  /** Share of total energy this macro contributes, as a whole percent. */
  readonly energyPct: number;
  readonly locked: boolean;
  readonly disabled?: boolean;
  readonly onGramsChange: (grams: number) => void;
  readonly onUnitChange: (unit: MacroUnit) => void;
  readonly onToggleLock: () => void;
}

/**
 * One macro input that accepts grams, g/kg bodyweight, or % of target kcal and
 * always writes grams back to the form. A lock pins the macro so the dialog's
 * auto-balance leaves it untouched. While focused the raw keystrokes are shown
 * (draft) so conversion rounding doesn't fight the user mid-edit.
 */
export function MacroUnitField({
  label,
  grams,
  unit,
  kcalPerGram,
  totalKcal,
  weightKg,
  energyPct,
  locked,
  disabled,
  onGramsChange,
  onUnitChange,
  onToggleLock,
}: Readonly<MacroUnitFieldProps>) {
  const [draft, setDraft] = useState<string | null>(null);

  const requiresWeight = unit === "gkg" && (!weightKg || weightKg <= 0);
  const requiresTarget = unit === "percent" && totalKcal <= 0;
  const conversionBlocked = requiresWeight || requiresTarget;

  const display =
    draft ?? formatMacroUnitDisplay({ unit, grams, kcalPerGram, totalKcal, weightKg });

  const handleChange = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === "") {
      onGramsChange(0);
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      return;
    }
    const next = gramsFromUnitValue({ unit, value, kcalPerGram, totalKcal, weightKg });
    if (next !== null) {
      onGramsChange(next);
    }
  };

  let hint: string | null = null;
  if (requiresWeight) {
    hint = m.nutrition_macro_unit_requires_weight();
  } else if (requiresTarget) {
    hint = m.nutrition_macro_unit_requires_target_kcal();
  } else if (grams > 0) {
    hint = m.nutrition_macro_energy_pct({ pct: energyPct });
  }

  const lockLabel = locked ? m.nutrition_macro_unlock() : m.nutrition_macro_lock();

  return (
    <Field>
      <div className="flex items-center justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
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
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          value={display}
          onFocus={() => setDraft(display)}
          onBlur={() => setDraft(null)}
          onChange={(event) => handleChange(event.target.value)}
          disabled={disabled || conversionBlocked}
          className="no-native-number-spinner flex-1"
        />
        <Select
          value={unit}
          onValueChange={(value) => value && onUnitChange(value as MacroUnit)}
          disabled={disabled}
        >
          <SelectTrigger size="sm" className="w-24 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner>
            <SelectContent>
              {UNIT_ITEMS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label()}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPositioner>
        </Select>
      </div>
      {hint ? <FieldDescription>{hint}</FieldDescription> : null}
    </Field>
  );
}

import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createNutritionPlan,
  type NutritionPlanRecord,
  updateNutritionPlan,
} from "@/features/customers/api/nutrition-plans-api";
import {
  type NutritionPlanFormValues,
  nutritionPlanFormSchema,
} from "@/features/customers/model/nutrition-plan-schema";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import type { AdministrativeGender } from "@/shared/types/schema-enums";
import { Button } from "@/shared/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormDialog } from "@/shared/ui/form-dialog";
import { NumberStepperInput } from "@/shared/ui/number-stepper-input";
import { cn } from "@/shared/utils/utils";

import { MacroField } from "./macro-field";
import { MACRO_META } from "./nutrition-macros";
import {
  ageFromBirthDate,
  computeBmr,
  MACRO_IDS,
  type MacroGrams,
  type MacroKey,
  redistributeMacrosForTargetKcal,
  TOLERANCE_KCAL,
  totalKcalFromMacroGrams,
} from "./nutrition-plan-utils";

const EMPTY_VALUES: NutritionPlanFormValues = {
  targetKcal: "",
  proteinG: "",
  carbsG: "",
  fatG: "",
};

function toFormValues(item?: NutritionPlanRecord): NutritionPlanFormValues {
  if (!item) {
    return EMPTY_VALUES;
  }
  return {
    targetKcal: String(item.targetKcal),
    proteinG: String(item.proteinG),
    carbsG: String(item.carbsG),
    fatG: String(item.fatG),
  };
}

interface NutritionPlanDetailDialogProps {
  readonly mode: "add" | "edit";
  readonly item?: NutritionPlanRecord;
  readonly personId: string;
  readonly patientId: string | null;
  readonly organizationId: string;
  readonly weightKg?: number | null;
  readonly heightCm?: number | null;
  readonly dateOfBirth?: string | null;
  readonly sex?: AdministrativeGender | null;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onRemoveClick?: () => void;
}

export function NutritionPlanDetailDialog({
  mode,
  item,
  personId,
  patientId,
  organizationId,
  weightKg,
  heightCm,
  dateOfBirth,
  sex,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onRemoveClick,
}: Readonly<NutritionPlanDetailDialogProps>) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const [locked, setLocked] = useState<ReadonlySet<MacroKey>>(() => new Set());
  const didResetOnOpen = useRef(false);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const orgId = organizationId || selectedOrg?.id || "";

  const form = useForm({
    defaultValues: toFormValues(item),
    validators: { onSubmit: nutritionPlanFormSchema },
    onSubmit: async ({ value }) => {
      if (!patientId) {
        toast.error(m.onboarding_error());
        return;
      }
      const data = {
        targetKcal: Number(value.targetKcal),
        proteinG: Number(value.proteinG),
        carbsG: Number(value.carbsG),
        fatG: Number(value.fatG),
      };

      setSaving(true);
      try {
        if (mode === "edit" && item) {
          await updateNutritionPlan(item.id, data, orgId);
          toast.success(m.nutrition_edit_success());
        } else {
          await createNutritionPlan(data, patientId, orgId);
          toast.success(m.nutrition_add_success());
        }
        await invalidatePersonDetail(queryClient, personId);
        setOpen(false);
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (!open) {
      didResetOnOpen.current = false;
      return;
    }
    if (didResetOnOpen.current) {
      return;
    }
    didResetOnOpen.current = true;
    form.reset(toFormValues(item));
    setLocked(new Set());
  }, [open, item, form]);

  const toggleLock = (key: MacroKey) =>
    setLocked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });

  const applyMacroGrams = (values: Record<MacroKey, number>) => {
    for (const key of Object.keys(values) as MacroKey[]) {
      const grams = values[key];
      form.setFieldValue(key, grams > 0 ? String(grams) : "");
    }
  };

  const age = dateOfBirth ? ageFromBirthDate(dateOfBirth) : null;
  const bmrSex = sex === "MALE" || sex === "FEMALE" ? sex : null;
  const canSuggestBmr = Boolean(weightKg && heightCm && age && bmrSex);

  const handleSuggestBmr = () => {
    if (!(weightKg && heightCm && age && bmrSex)) {
      return;
    }
    const bmr = computeBmr(weightKg, heightCm, age, bmrSex);
    form.setFieldValue("targetKcal", String(bmr));
    const macros: MacroGrams = {
      protein: Number(form.getFieldValue("proteinG")) || 0,
      carbs: Number(form.getFieldValue("carbsG")) || 0,
      fat: Number(form.getFieldValue("fatG")) || 0,
    };
    applyMacroGrams(redistributeMacrosForTargetKcal(bmr, macros, locked).values);
  };

  const handleAutoBalance = (targetKcal: number, macros: MacroGrams) => {
    const { values, lockedExceedsTarget } = redistributeMacrosForTargetKcal(
      targetKcal,
      macros,
      locked,
    );
    applyMacroGrams(values);
    if (lockedExceedsTarget) {
      toast.warning(m.nutrition_locked_exceeds_kcal());
    }
  };

  const title = mode === "edit" ? m.nutrition_edit_title() : m.nutrition_add_title();

  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description={m.nutrition_dialog_desc()}
      contentClassName="sm:max-w-md"
      onDelete={mode === "edit" ? onRemoveClick : undefined}
      onSubmit={() => form.handleSubmit()}
      saving={saving}
    >
      <FieldGroup>
        {/* Target kcal + BMR suggestion */}
        <form.Field name="targetKcal">
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <div className="flex items-center justify-between gap-2">
                <FieldLabel required>{m.nutrition_field_target_kcal()}</FieldLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-xs"
                  onClick={handleSuggestBmr}
                  disabled={!canSuggestBmr || saving}
                >
                  <Sparkles className="size-3.5" aria-hidden />
                  {m.nutrition_bmr_suggest()}
                </Button>
              </div>
              <NumberStepperInput
                value={field.state.value}
                onValueChange={field.handleChange}
                min={0}
                step={100}
                decrementLabel={m.common_decrease()}
                incrementLabel={m.common_increase()}
                disabled={saving}
              />
              <FieldError errors={field.state.meta.errors} />
              {canSuggestBmr ? null : (
                <FieldDescription>{m.nutrition_bmr_missing()}</FieldDescription>
              )}
            </Field>
          )}
        </form.Field>

        {/* Macros + live balance meter */}
        <form.Subscribe
          selector={(state) => ({
            targetKcal: Number(state.values.targetKcal) || 0,
            proteinG: Number(state.values.proteinG) || 0,
            carbsG: Number(state.values.carbsG) || 0,
            fatG: Number(state.values.fatG) || 0,
          })}
        >
          {({ targetKcal, proteinG, carbsG, fatG }) => {
            const macros: MacroGrams = { protein: proteinG, carbs: carbsG, fat: fatG };
            const macroTotal = totalKcalFromMacroGrams(macros);
            const delta = macroTotal - targetKcal;
            const hasMacros = proteinG > 0 || carbsG > 0 || fatG > 0;
            const balanced = Math.abs(delta) <= TOLERANCE_KCAL;
            const showMeter = targetKcal > 0 && hasMacros;
            const signedDelta = `${delta > 0 ? "+" : ""}${delta}`;

            return (
              <div className="flex flex-col gap-4">
                {MACRO_IDS.map((id) => {
                  const meta = MACRO_META[id];
                  return (
                    <form.Field key={id} name={meta.fieldKey}>
                      {(field) => (
                        <MacroField
                          macroId={id}
                          value={field.state.value}
                          onValueChange={field.handleChange}
                          totalKcal={targetKcal}
                          weightKg={weightKg ?? undefined}
                          locked={locked.has(meta.fieldKey)}
                          disabled={saving}
                          onToggleLock={() => toggleLock(meta.fieldKey)}
                          errors={field.state.meta.errors}
                        />
                      )}
                    </form.Field>
                  );
                })}

                {showMeter ? (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-muted-foreground text-sm">
                        {m.nutrition_balance_summary({ kcal: macroTotal, target: targetKcal })}
                      </p>
                      {balanced ? null : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleAutoBalance(targetKcal, macros)}
                          disabled={saving}
                        >
                          {m.nutrition_auto_balance()}
                        </Button>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1 font-medium text-sm",
                        balanced
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {balanced
                        ? m.nutrition_balance_ok()
                        : m.nutrition_balance_off({ delta: signedDelta })}
                    </p>
                  </div>
                ) : null}
              </div>
            );
          }}
        </form.Subscribe>
      </FieldGroup>
    </FormDialog>
  );
}

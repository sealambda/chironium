import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  createNutritionPlan,
  type NutritionPlanFormData,
} from "@/features/customers/api/nutrition-plans-api";
import {
  ageFromBirthDate,
  computeBmr,
  computeMacroPct,
  formatMacroUnitDisplay,
  getMacroUnitSelectItems,
  gramsFromUnitValue,
  KCAL_PER_G,
  type MacroKey,
  type MacroUnit,
  macroUnitsAllPreferred,
  nutritionPlanFormSchema,
  pickPreferredMacroUnit,
  redistributeMacrosForTargetKcal,
  TOLERANCE_KCAL,
  totalKcalFromMacroGrams,
} from "@/features/customers/ui/detail/nutrition-plan-dialog-utils";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
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

function toastMacroUnitMissingInputs(unit: MacroUnit, missingInputToastId: string) {
  if (unit === "gkg") {
    toast.warning(m.nutrition_macro_unit_requires_weight(), {
      id: `${missingInputToastId}-weight`,
    });
    return;
  }
  if (unit === "percent") {
    toast.warning(m.nutrition_macro_unit_requires_target_kcal(), {
      id: `${missingInputToastId}-target-kcal`,
    });
  }
}

function IntegerField({
  field,
  label,
  placeholder,
  step,
  annotation,
  incrementDisabled,
}: Readonly<{
  field: {
    state: { value: string; meta: { errors: unknown[] } };
    handleChange: (v: string) => void;
    handleBlur: () => void;
  };
  label: string;
  placeholder: string;
  step: number;
  annotation?: ReactNode;
  incrementDisabled?: boolean;
}>) {
  const numValue = field.state.value ? Number(field.state.value) : 0;

  const handleIncrement = () => {
    const newVal = numValue + step;
    field.handleChange(String(newVal));
  };

  const handleDecrement = () => {
    const newVal = Math.max(0, numValue - step);
    field.handleChange(newVal > 0 ? String(newVal) : "");
  };

  return (
    <Field data-invalid={field.state.meta.errors.length > 0}>
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={step}
          value={field.state.value}
          onChange={(e) => field.handleChange(e.target.value)}
          onBlur={field.handleBlur}
          placeholder={placeholder}
          aria-invalid={field.state.meta.errors.length > 0}
          className="pr-9 pl-9 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={handleDecrement}
          disabled={!field.state.value || numValue <= 0}
          className="absolute inset-y-0 left-0 flex cursor-pointer items-center px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={incrementDisabled}
          title={incrementDisabled ? m.nutrition_macro_increment_blocked() : undefined}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center px-2.5",
            incrementDisabled
              ? "cursor-not-allowed text-muted-foreground/30"
              : "cursor-pointer text-muted-foreground hover:text-foreground",
          )}
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      {annotation}
      {field.state.meta.errors.length > 0 ? (
        <FieldError
          errors={
            field.state.meta.errors.map((e) =>
              typeof e === "string" ? { message: e } : e,
            ) as Array<{ message?: string } | undefined>
          }
        />
      ) : null}
    </Field>
  );
}

type MacroFormFieldApi = Readonly<{
  state: { value: string; meta: { errors: unknown[] } };
  handleChange: (v: string) => void;
  handleBlur: () => void;
}>;

function MacroUnitField({
  label,
  placeholder,
  field,
  macroFieldKey,
  unit,
  defaultUnit,
  onUnitChange,
  unitSelectItems,
  kcalPerGram,
  totalKcal,
  weightKg,
  grams,
  missingInputToastId,
  pctAnnotation,
  onGramsCommitted,
}: Readonly<{
  label: string;
  placeholder: string;
  field: MacroFormFieldApi;
  macroFieldKey: MacroKey;
  unit: MacroUnit;
  defaultUnit: MacroUnit;
  onUnitChange: (unit: MacroUnit) => void;
  unitSelectItems: ReadonlyArray<{ value: MacroUnit; label: string }>;
  kcalPerGram: number;
  totalKcal: number;
  weightKg?: number;
  grams: number;
  missingInputToastId: string;
  pctAnnotation: ReactNode | null;
  onGramsCommitted?: (args: { macroKey: MacroKey; gramsCommitted: number }) => void;
}>) {
  const [macroInputFocused, setMacroInputFocused] = useState(false);
  const [unitDraft, setUnitDraft] = useState("");

  const displayFromGrams = formatMacroUnitDisplay({
    unit,
    grams,
    kcalPerGram,
    totalKcal,
    weightKg,
  });

  useEffect(() => {
    if (!macroInputFocused) {
      return;
    }
    setUnitDraft(
      formatMacroUnitDisplay({
        unit,
        grams,
        kcalPerGram,
        totalKcal,
        weightKg,
      }),
    );
  }, [macroInputFocused, unit, grams, kcalPerGram, totalKcal, weightKg]);

  const revertDraftToStored = () => {
    setUnitDraft(displayFromGrams);
  };

  const syncDraftFromGrams = () => {
    setUnitDraft(
      formatMacroUnitDisplay({
        unit,
        grams,
        kcalPerGram,
        totalKcal,
        weightKg,
      }),
    );
  };

  const commitUnitDraft = () => {
    const trimmed = unitDraft.trim().replaceAll(",", ".");
    if (trimmed === "" || trimmed === ".") {
      field.handleChange("");
      onGramsCommitted?.({ macroKey: macroFieldKey, gramsCommitted: 0 });
      return;
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0) {
      revertDraftToStored();
      return;
    }
    const nextG = gramsFromUnitValue({
      unit,
      value: num,
      kcalPerGram,
      totalKcal,
      weightKg,
    });
    if (nextG === null) {
      toastMacroUnitMissingInputs(unit, missingInputToastId);
      revertDraftToStored();
      return;
    }
    field.handleChange(nextG > 0 ? String(nextG) : "");
    onGramsCommitted?.({ macroKey: macroFieldKey, gramsCommitted: nextG });
  };

  return (
    <Field data-invalid={field.state.meta.errors.length > 0}>
      <FieldLabel>{label}</FieldLabel>
      <div className="space-y-2">
        <Select
          value={unit}
          onValueChange={(v) => onUnitChange((v as MacroUnit | undefined) ?? defaultUnit)}
          items={unitSelectItems.map((i) => ({ value: i.value, label: i.label }))}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPositioner>
            <SelectContent>
              {unitSelectItems.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </SelectPositioner>
        </Select>
        <Input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={macroInputFocused ? unitDraft : displayFromGrams}
          onFocus={() => {
            setMacroInputFocused(true);
            syncDraftFromGrams();
          }}
          onChange={(e) => setUnitDraft(e.target.value)}
          onBlur={() => {
            commitUnitDraft();
            setMacroInputFocused(false);
            field.handleBlur();
          }}
          placeholder={placeholder}
          aria-invalid={field.state.meta.errors.length > 0}
        />
        {pctAnnotation}
      </div>
    </Field>
  );
}

interface NutritionPlanDialogProps {
  personId: string;
  patientId: string | null;
  latestWeight?: number;
  latestHeight?: number;
  birthDate?: string;
  gender?: string;
  children: React.ReactNode;
}

function macroValuesSelector(s: {
  values: { targetKcal: string; proteinG: string; carbsG: string; fatG: string };
}): string {
  return JSON.stringify([s.values.targetKcal, s.values.proteinG, s.values.carbsG, s.values.fatG]);
}

export function NutritionPlanDialog({
  personId,
  patientId,
  latestWeight,
  latestHeight,
  birthDate,
  gender,
  children,
}: Readonly<NutritionPlanDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  /** After the coach edits target kcal, stop auto-filling kcal from macro commits. */
  const targetKcalUserEditedRef = useRef(false);
  /**
   * True while we set target kcal from macros so the kcal field onChange does not flip
   * `targetKcalUserEditedRef`. Cleared on the next microtask so the form finishes its subscriber
   * pass before user-driven kcal edits count again.
   */
  const syncingKcalFromMacrosRef = useRef(false);

  const [macroUnits, setMacroUnits] = useState<Record<MacroKey, MacroUnit>>(() =>
    macroUnitsAllPreferred(latestWeight, false),
  );
  const setProteinMacroUnit = useCallback((u: MacroUnit) => {
    setMacroUnits((prev) => ({ ...prev, proteinG: u }));
  }, []);
  const setCarbsMacroUnit = useCallback((u: MacroUnit) => {
    setMacroUnits((prev) => ({ ...prev, carbsG: u }));
  }, []);
  const setFatMacroUnit = useCallback((u: MacroUnit) => {
    setMacroUnits((prev) => ({ ...prev, fatG: u }));
  }, []);
  const { selectedOrg } = useOrg();

  const queryClient = useQueryClient();

  const age = birthDate ? ageFromBirthDate(birthDate) : null;
  const bmrSex = gender === "MALE" || gender === "FEMALE" ? gender : null;
  const canComputeBmr = Boolean(latestWeight && latestHeight && age && bmrSex);

  const missingBmrFields = useMemo(() => {
    const fields: string[] = [];
    if (!latestWeight) {
      fields.push(m.field_weight_kg());
    }
    if (!latestHeight) {
      fields.push(m.field_height_cm());
    }
    if (!age) {
      fields.push(m.field_birth_date());
    }
    if (!bmrSex) {
      fields.push(m.field_gender());
    }
    return fields;
  }, [latestWeight, latestHeight, age, bmrSex]);

  const macroUnitSelectItems = getMacroUnitSelectItems();

  const form = useForm({
    defaultValues: {
      targetKcal: "",
      proteinG: "",
      carbsG: "",
      fatG: "",
    },
    validators: { onSubmit: nutritionPlanFormSchema },
    onSubmit: async ({ value }) => {
      const targetKcal = Number(value.targetKcal);
      const proteinG = Number(value.proteinG);
      const carbsG = Number(value.carbsG);
      const fatG = Number(value.fatG);

      if (!patientId) {
        toast.error(m.onboarding_error());
        return;
      }

      const data: NutritionPlanFormData = {
        targetKcal,
        proteinG,
        carbsG,
        fatG,
      };

      setSaving(true);
      try {
        await createNutritionPlan(data, patientId, selectedOrg?.id ?? "");
        await queryClient.invalidateQueries({
          queryKey: ["person", personId, "nutritionPlans", selectedOrg?.id ?? ""],
        });
        await queryClient.invalidateQueries({
          queryKey: ["person", personId, "patient-detail"],
        });
        toast.success(m.nutrition_plan_add_success());
        setOpen(false);
        form.reset();
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const syncTargetKcalFromMacrosWhenEmpty = useCallback(
    (args: { macroKey: MacroKey; gramsCommitted: number }) => {
      if (targetKcalUserEditedRef.current) {
        return;
      }
      const committed = Math.max(0, Math.round(args.gramsCommitted));
      const protein =
        args.macroKey === "proteinG" ? committed : Number(form.getFieldValue("proteinG")) || 0;
      const carbs =
        args.macroKey === "carbsG" ? committed : Number(form.getFieldValue("carbsG")) || 0;
      const fat = args.macroKey === "fatG" ? committed : Number(form.getFieldValue("fatG")) || 0;
      const macroKcal = totalKcalFromMacroGrams({ protein, carbs, fat });
      if (macroKcal <= 0) {
        return;
      }
      syncingKcalFromMacrosRef.current = true;
      form.setFieldValue("targetKcal", String(macroKcal));
      queueMicrotask(() => {
        syncingKcalFromMacrosRef.current = false;
      });
    },
    [form],
  );

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) {
        targetKcalUserEditedRef.current = false;
        const hasKcal = Number(form.getFieldValue("targetKcal")) > 0;
        setMacroUnits(macroUnitsAllPreferred(latestWeight, hasKcal));
      }
    },
    [form, latestWeight],
  );

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.nutrition_plan_add()}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <form.Field
            name="targetKcal"
            listeners={{
              onChange: ({ value }) => {
                if (!syncingKcalFromMacrosRef.current) {
                  targetKcalUserEditedRef.current = true;
                }
                redistributeMacrosForTargetKcal(
                  Number(value) || 0,
                  {
                    protein: Number(form.getFieldValue("proteinG")) || 0,
                    carbs: Number(form.getFieldValue("carbsG")) || 0,
                    fat: Number(form.getFieldValue("fatG")) || 0,
                  },
                  (key, val) => form.setFieldValue(key, val),
                );
              },
            }}
          >
            {(field) => (
              <IntegerField
                field={field}
                label={m.field_target_kcal()}
                placeholder={m.field_target_kcal_placeholder()}
                step={100}
                annotation={
                  canComputeBmr ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!latestWeight || !latestHeight || !age || !bmrSex) {
                          return;
                        }
                        const bmr = computeBmr(latestWeight, latestHeight, age, bmrSex);
                        field.handleChange(String(bmr));
                      }}
                      className="text-left font-medium text-pink-600 text-xs hover:text-pink-700"
                    >
                      {m.nutrition_set_bmr()}
                    </button>
                  ) : (
                    <span
                      className="cursor-default font-medium text-neutral-400 text-xs"
                      title={m.nutrition_bmr_missing_data({
                        fields: missingBmrFields.join(", "),
                      })}
                    >
                      {m.nutrition_set_bmr()}
                    </span>
                  )
                }
              />
            )}
          </form.Field>

          <form.Subscribe selector={macroValuesSelector}>
            {(serialized) => {
              const [targetKcalRaw, proteinRaw, carbsRaw, fatRaw] = JSON.parse(serialized) as [
                string,
                string,
                string,
                string,
              ];
              const kcal = Number(targetKcalRaw) || 0;
              const protein = Number(proteinRaw) || 0;
              const carbs = Number(carbsRaw) || 0;
              const fat = Number(fatRaw) || 0;

              const pPct = computeMacroPct(protein, KCAL_PER_G.protein, kcal);
              const cPct = computeMacroPct(carbs, KCAL_PER_G.carbs, kcal);
              const fPct = computeMacroPct(fat, KCAL_PER_G.fat, kcal);

              const macroKcal =
                protein * KCAL_PER_G.protein + carbs * KCAL_PER_G.carbs + fat * KCAL_PER_G.fat;
              const hasMacros = protein > 0 || carbs > 0 || fat > 0;
              const preferredMacroUnit = pickPreferredMacroUnit(latestWeight, kcal > 0);

              return (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <form.Field name="proteinG">
                      {(field) => (
                        <MacroUnitField
                          label={m.field_protein()}
                          placeholder={m.field_protein_placeholder()}
                          field={field}
                          macroFieldKey="proteinG"
                          unit={macroUnits.proteinG}
                          defaultUnit={preferredMacroUnit}
                          onUnitChange={setProteinMacroUnit}
                          unitSelectItems={macroUnitSelectItems}
                          kcalPerGram={KCAL_PER_G.protein}
                          totalKcal={kcal}
                          weightKg={latestWeight}
                          grams={protein}
                          missingInputToastId="macro-unit-missing-input-protein"
                          onGramsCommitted={syncTargetKcalFromMacrosWhenEmpty}
                          pctAnnotation={
                            kcal > 0 && protein > 0 ? (
                              <span className="font-medium text-emerald-600 text-xs tabular-nums">
                                {m.nutrition_macro_energy_pct({ pct: pPct })}
                              </span>
                            ) : null
                          }
                        />
                      )}
                    </form.Field>
                    <form.Field name="carbsG">
                      {(field) => (
                        <MacroUnitField
                          label={m.field_carbs()}
                          placeholder={m.field_carbs_placeholder()}
                          field={field}
                          macroFieldKey="carbsG"
                          unit={macroUnits.carbsG}
                          defaultUnit={preferredMacroUnit}
                          onUnitChange={setCarbsMacroUnit}
                          unitSelectItems={macroUnitSelectItems}
                          kcalPerGram={KCAL_PER_G.carbs}
                          totalKcal={kcal}
                          weightKg={latestWeight}
                          grams={carbs}
                          missingInputToastId="macro-unit-missing-input-carbs"
                          onGramsCommitted={syncTargetKcalFromMacrosWhenEmpty}
                          pctAnnotation={
                            kcal > 0 && carbs > 0 ? (
                              <span className="font-medium text-blue-600 text-xs tabular-nums">
                                {m.nutrition_macro_energy_pct({ pct: cPct })}
                              </span>
                            ) : null
                          }
                        />
                      )}
                    </form.Field>
                    <form.Field name="fatG">
                      {(field) => (
                        <MacroUnitField
                          label={m.field_fat()}
                          placeholder={m.field_fat_placeholder()}
                          field={field}
                          macroFieldKey="fatG"
                          unit={macroUnits.fatG}
                          defaultUnit={preferredMacroUnit}
                          onUnitChange={setFatMacroUnit}
                          unitSelectItems={macroUnitSelectItems}
                          kcalPerGram={KCAL_PER_G.fat}
                          totalKcal={kcal}
                          weightKg={latestWeight}
                          grams={fat}
                          missingInputToastId="macro-unit-missing-input-fat"
                          onGramsCommitted={syncTargetKcalFromMacrosWhenEmpty}
                          pctAnnotation={
                            kcal > 0 && fat > 0 ? (
                              <span className="font-medium text-amber-600 text-xs tabular-nums">
                                {m.nutrition_macro_energy_pct({ pct: fPct })}
                              </span>
                            ) : null
                          }
                        />
                      )}
                    </form.Field>
                  </div>

                  {hasMacros && kcal > 0 ? (
                    <p
                      className={cn(
                        "text-center font-medium text-xs tabular-nums",
                        Math.abs(macroKcal - kcal) <= TOLERANCE_KCAL
                          ? "text-emerald-600"
                          : "text-destructive",
                      )}
                    >
                      {macroKcal} / {kcal} kcal
                    </p>
                  ) : null}
                </>
              );
            }}
          </form.Subscribe>

          <form.Subscribe selector={(s) => s.errors}>
            {(errors) =>
              errors.length > 0 ? (
                <FieldError
                  errors={
                    errors.map((e) => (typeof e === "string" ? { message: e } : e)) as Array<
                      { message?: string } | undefined
                    >
                  }
                />
              ) : null
            }
          </form.Subscribe>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => form.handleSubmit()} disabled={saving}>
            {saving ? m.common_saving() : m.common_add()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  type NutritionPlanFormData,
  createNutritionPlan,
} from "@/features/customers/api/nutrition-plans-api";
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
import { cn } from "@/shared/utils/utils";

// ─── Atwater constants & helpers ────────────────────────────────────

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;
const TOLERANCE_KCAL = 10;

function computeMacroPct(grams: number, kcalPerG: number, totalKcal: number): number {
  if (totalKcal <= 0 || !Number.isFinite(grams) || grams <= 0) return 0;
  return Math.round((grams * kcalPerG * 100) / totalKcal);
}

// ─── Zod schema ─────────────────────────────────────────────────────

const positiveInt = z.coerce
  .number({ message: m.validation_positive_number() })
  .int({ message: m.validation_positive_number() })
  .positive({ message: m.validation_positive_number() });

const nutritionPlanSchema = z
  .object({
    targetKcal: positiveInt,
    proteinG: positiveInt,
    carbsG: positiveInt,
    fatG: positiveInt,
  })
  .refine(
    (d) => {
      const macroKcal =
        d.proteinG * KCAL_PER_G.protein +
        d.carbsG * KCAL_PER_G.carbs +
        d.fatG * KCAL_PER_G.fat;
      return Math.abs(macroKcal - d.targetKcal) <= TOLERANCE_KCAL;
    },
    { message: m.validation_macro_balance() },
  );

// ─── IntegerField component ─────────────────────────────────────────

function IntegerField({
  field,
  label,
  placeholder,
  step,
  annotation,
  incrementDisabled,
}: {
  field: {
    state: { value: string; meta: { errors: unknown[] } };
    handleChange: (v: string) => void;
    handleBlur: () => void;
  };
  label: string;
  placeholder: string;
  step: number;
  annotation?: React.ReactNode;
  incrementDisabled?: boolean;
}) {
  const numValue = field.state.value ? Number(field.state.value) : 0;

  const handleIncrement = () => {
    if (incrementDisabled) {
      toast.warning(m.validation_macro_balance(), { id: "macro-limit" });
      return;
    }
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
          className="absolute inset-y-0 left-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Minus className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={handleIncrement}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center px-2.5",
            incrementDisabled
              ? "text-muted-foreground/30 cursor-not-allowed"
              : "text-muted-foreground hover:text-foreground",
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

// ─── BMR (Mifflin-St Jeor) ──────────────────────────────────────────

function computeBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: "MALE" | "FEMALE",
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return Math.round(sex === "MALE" ? base + 5 : base - 161);
}

function ageFromBirthDate(birthDate: string): number | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age > 0 ? age : null;
}

// ─── Dialog component ───────────────────────────────────────────────

interface NutritionPlanDialogProps {
  personId: string;
  patientId: string | null;
  latestWeight?: number;
  latestHeight?: number;
  birthDate?: string;
  gender?: string;
  children: React.ReactNode;
}

export function NutritionPlanDialog({
  personId,
  patientId,
  latestWeight,
  latestHeight,
  birthDate,
  gender,
  children,
}: NutritionPlanDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  // BMR availability check
  const age = birthDate ? ageFromBirthDate(birthDate) : null;
  const bmrSex = gender === "MALE" || gender === "FEMALE" ? gender : null;
  const canComputeBmr = Boolean(latestWeight && latestHeight && age && bmrSex);

  const missingBmrFields: string[] = [];
  if (!latestWeight) missingBmrFields.push(m.field_weight_kg());
  if (!latestHeight) missingBmrFields.push(m.field_height_cm());
  if (!age) missingBmrFields.push(m.field_birth_date());
  if (!bmrSex) missingBmrFields.push(m.field_gender());

  const form = useForm({
    defaultValues: {
      targetKcal: "",
      proteinG: "",
      carbsG: "",
      fatG: "",
    },
    validators: { onSubmit: nutritionPlanSchema },
    onSubmit: async ({ value }) => {
      const targetKcal = Number(value.targetKcal);
      const proteinG = Number(value.proteinG);
      const carbsG = Number(value.carbsG);
      const fatG = Number(value.fatG);

      if (!patientId) {
        toast.error(m.onboarding_error());
        return;
      }

      const data: NutritionPlanFormData = { targetKcal, proteinG, carbsG, fatG };

      setSaving(true);
      try {
        await createNutritionPlan(data, patientId, selectedOrg?.id ?? "");
        await queryClient.invalidateQueries({
          queryKey: ["person", personId, "nutritionPlans", selectedOrg?.id ?? ""],
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.nutrition_plan_add()}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          {/* Row 1: Target Kcal (full width, with auto-recalc listener) */}
          <form.Field
            name="targetKcal"
            listeners={{
              onChange: ({ value }) => {
                const newKcal = Number(value) || 0;
                if (newKcal <= 0) return;

                const protein = Number(form.getFieldValue("proteinG")) || 0;
                const carbs = Number(form.getFieldValue("carbsG")) || 0;
                const fat = Number(form.getFieldValue("fatG")) || 0;
                if (protein === 0 && carbs === 0 && fat === 0) return;

                const oldKcal =
                  protein * KCAL_PER_G.protein +
                  carbs * KCAL_PER_G.carbs +
                  fat * KCAL_PER_G.fat;
                if (oldKcal <= 0) return;

                const pRatio = (protein * KCAL_PER_G.protein) / oldKcal;
                const cRatio = (carbs * KCAL_PER_G.carbs) / oldKcal;

                const newProtein = Math.round((pRatio * newKcal) / KCAL_PER_G.protein);
                const newCarbs = Math.round((cRatio * newKcal) / KCAL_PER_G.carbs);
                const newFat = Math.round(
                  (newKcal - newProtein * KCAL_PER_G.protein - newCarbs * KCAL_PER_G.carbs) /
                    KCAL_PER_G.fat,
                );

                form.setFieldValue("proteinG", newProtein > 0 ? String(newProtein) : "");
                form.setFieldValue("carbsG", newCarbs > 0 ? String(newCarbs) : "");
                form.setFieldValue("fatG", newFat > 0 ? String(newFat) : "");
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
                        const bmr = computeBmr(latestWeight!, latestHeight!, age!, bmrSex!);
                        field.handleChange(String(bmr));
                      }}
                      className="text-left text-xs font-medium text-pink-600 hover:text-pink-700"
                    >
                      {m.nutrition_set_bmr()}
                    </button>
                  ) : (
                    <span
                      className="cursor-default text-xs font-medium text-neutral-400"
                      title={m.nutrition_bmr_missing_data({ fields: missingBmrFields.join(", ") })}
                    >
                      {m.nutrition_set_bmr()}
                    </span>
                  )
                }
              />
            )}
          </form.Field>

          {/* Row 2: Protein / Carbs / Fat with live % annotations */}
          <form.Subscribe selector={(s) => s.values}>
            {(values) => {
              const kcal = Number(values.targetKcal) || 0;
              const protein = Number(values.proteinG) || 0;
              const carbs = Number(values.carbsG) || 0;
              const fat = Number(values.fatG) || 0;

              const pPct = computeMacroPct(protein, KCAL_PER_G.protein, kcal);
              const cPct = computeMacroPct(carbs, KCAL_PER_G.carbs, kcal);
              const fPct = computeMacroPct(fat, KCAL_PER_G.fat, kcal);

              const macroKcal =
                protein * KCAL_PER_G.protein +
                carbs * KCAL_PER_G.carbs +
                fat * KCAL_PER_G.fat;
              const hasMacros = protein > 0 || carbs > 0 || fat > 0;
              const atBudget = kcal > 0 && macroKcal >= kcal;

              return (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <form.Field name="proteinG">
                      {(field) => (
                        <IntegerField
                          field={field}
                          label={m.field_protein_g()}
                          placeholder={m.field_protein_placeholder()}
                          step={10}
                          incrementDisabled={atBudget}
                          annotation={
                            kcal > 0 && protein > 0 ? (
                              <span className="text-xs font-medium text-emerald-600 tabular-nums">
                                {pPct}% kcal
                              </span>
                            ) : null
                          }
                        />
                      )}
                    </form.Field>
                    <form.Field name="carbsG">
                      {(field) => (
                        <IntegerField
                          field={field}
                          label={m.field_carbs_g()}
                          placeholder={m.field_carbs_placeholder()}
                          step={10}
                          incrementDisabled={atBudget}
                          annotation={
                            kcal > 0 && carbs > 0 ? (
                              <span className="text-xs font-medium text-blue-600 tabular-nums">
                                {cPct}% kcal
                              </span>
                            ) : null
                          }
                        />
                      )}
                    </form.Field>
                    <form.Field name="fatG">
                      {(field) => (
                        <IntegerField
                          field={field}
                          label={m.field_fat_g()}
                          placeholder={m.field_fat_placeholder()}
                          step={10}
                          incrementDisabled={atBudget}
                          annotation={
                            kcal > 0 && fat > 0 ? (
                              <span className="text-xs font-medium text-amber-600 tabular-nums">
                                {fPct}% kcal
                              </span>
                            ) : null
                          }
                        />
                      )}
                    </form.Field>
                  </div>

                  {/* Kcal summary */}
                  {hasMacros && kcal > 0 ? (
                    <p
                      className={cn(
                        "text-center text-xs font-medium tabular-nums",
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

          {/* Form-level validation errors */}
          <form.Subscribe selector={(s) => s.errors}>
            {(errors) =>
              errors.length > 0 ? (
                <FieldError
                  errors={errors.map((e) => (typeof e === "string" ? { message: e } : e)) as Array<{ message?: string } | undefined>}
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

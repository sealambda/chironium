import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import * as m from "@/paraglide/messages";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { createFieldValidator } from "@/shared/utils/form-utils";

import {
  defaultNutritionPlanValues,
  type NutritionPlanFormData,
  nutritionPlanSchema,
} from "../../model/detail-schemas";
import { DatePickerField } from "../date-picker-field";

const requiredPositive = z
  .number({ required_error: "validation_required" })
  .positive("validation_positive");

interface NutritionFormProps {
  id: string;
  onSubmit: (data: NutritionPlanFormData) => void;
}

function macroPct(grams: number, kcalPerGram: number, totalKcal: number): string {
  if (!totalKcal || totalKcal <= 0) {
    return "0";
  }
  return String(Math.round((grams * kcalPerGram * 100) / totalKcal));
}

export function NutritionForm({ id, onSubmit }: Readonly<NutritionFormProps>) {
  const form = useForm({
    defaultValues: defaultNutritionPlanValues,
    onSubmit: async ({ value }) => {
      const result = nutritionPlanSchema.safeParse(value);
      if (!result.success) {
        return;
      }
      onSubmit(value);
    },
  });

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-6 pt-4"
    >
      <FieldGroup>
        <form.Field name="startDate">
          {(field) => (
            <Field>
              <FieldLabel>
                {m.form_start_date()} <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <DatePickerField
                  value={field.state.value}
                  onChange={(date) => field.handleChange(date ?? new Date())}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="endDate">
          {(field) => (
            <Field>
              <FieldLabel>{m.form_end_date()}</FieldLabel>
              <FieldContent>
                <DatePickerField
                  value={field.state.value}
                  onChange={(date) => field.handleChange(date)}
                  placeholder={m.common_open()}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="kcal" validators={{ onBlur: createFieldValidator(requiredPositive) }}>
          {(field) => (
            <Field>
              <FieldLabel>
                {m.form_kcal()} <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  step="1"
                  placeholder={m.form_kcal_placeholder()}
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      {/* Macros with live % */}
      <FieldGroup>
        <form.Subscribe selector={(s) => s.values.kcal}>
          {(kcal) => (
            <>
              <form.Field
                name="protein"
                validators={{ onBlur: createFieldValidator(requiredPositive) }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel>
                      {m.form_protein()} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        step="1"
                        placeholder={m.form_protein_placeholder()}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        onBlur={field.handleBlur}
                      />
                      {field.state.value > 0 ? (
                        <FieldDescription>
                          {m.form_macro_pct({ pct: macroPct(field.state.value, 4, kcal) })}
                        </FieldDescription>
                      ) : null}
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="carbs"
                validators={{ onBlur: createFieldValidator(requiredPositive) }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel>
                      {m.form_carbs()} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        step="1"
                        placeholder={m.form_carbs_placeholder()}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        onBlur={field.handleBlur}
                      />
                      {field.state.value > 0 ? (
                        <FieldDescription>
                          {m.form_macro_pct({ pct: macroPct(field.state.value, 4, kcal) })}
                        </FieldDescription>
                      ) : null}
                    </FieldContent>
                  </Field>
                )}
              </form.Field>

              <form.Field
                name="fat"
                validators={{ onBlur: createFieldValidator(requiredPositive) }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel>
                      {m.form_fat()} <span className="text-destructive">*</span>
                    </FieldLabel>
                    <FieldContent>
                      <Input
                        type="number"
                        step="1"
                        placeholder={m.form_fat_placeholder()}
                        value={field.state.value || ""}
                        onChange={(e) => field.handleChange(Number(e.target.value))}
                        onBlur={field.handleBlur}
                      />
                      {field.state.value > 0 ? (
                        <FieldDescription>
                          {m.form_macro_pct({ pct: macroPct(field.state.value, 9, kcal) })}
                        </FieldDescription>
                      ) : null}
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
            </>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
}

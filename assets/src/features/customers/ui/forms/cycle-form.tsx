import { useForm } from "@tanstack/react-form";
import { z } from "zod";

import { CycleSymptomCatalog } from "@/mocks/data/catalogs";
import * as m from "@/paraglide/messages";
import { Badge } from "@/shared/ui/badge";
import { Field, FieldContent, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { createFieldValidator } from "@/shared/utils/form-utils";
import { cn } from "@/shared/utils/utils";

import {
  type CycleFormData,
  cycleFormSchema,
  defaultCycleValues,
} from "../../model/detail-schemas";
import { DatePickerField } from "../date-picker-field";

const positiveInt = z.number().int().positive("validation_positive");

interface CycleFormProps {
  id: string;
  onSubmit: (data: CycleFormData) => void;
}

export function CycleForm({ id, onSubmit }: Readonly<CycleFormProps>) {
  const form = useForm({
    defaultValues: defaultCycleValues,
    onSubmit: async ({ value }) => {
      const result = cycleFormSchema.safeParse(value);
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
                  placeholder={m.common_ongoing()}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field
          name="cycleLength"
          validators={{ onBlur: createFieldValidator(positiveInt.optional()) }}
        >
          {(field) => (
            <Field>
              <FieldLabel>{m.form_cycle_length()}</FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  step="1"
                  placeholder={m.form_cycle_length_placeholder()}
                  value={field.state.value ?? ""}
                  onChange={(e) =>
                    field.handleChange(e.target.value ? Number(e.target.value) : undefined)
                  }
                  onBlur={field.handleBlur}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="symptoms">
          {(field) => (
            <Field>
              <FieldLabel>{m.form_symptoms()}</FieldLabel>
              <FieldContent>
                <div className="flex flex-wrap gap-2">
                  {CycleSymptomCatalog.map((symptom) => {
                    const isSelected = field.state.value.includes(symptom.id);
                    return (
                      <button
                        key={symptom.id}
                        type="button"
                        onClick={() => {
                          const next = isSelected
                            ? field.state.value.filter((s) => s !== symptom.id)
                            : [...field.state.value, symptom.id];
                          field.handleChange(next);
                        }}
                      >
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer transition-colors",
                            isSelected && "bg-primary text-primary-foreground",
                          )}
                        >
                          {symptom.name}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </form>
  );
}

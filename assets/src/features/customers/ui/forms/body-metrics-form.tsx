import { useForm } from "@tanstack/react-form";
import { ChevronRightIcon } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import * as m from "@/paraglide/messages";
import { Field, FieldContent, FieldGroup, FieldLabel, FieldSeparator } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { createFieldValidator } from "@/shared/utils/form-utils";

import {
  type BodyMetricsFormData,
  bodyMetricsSchema,
  defaultBodyMetricsValues,
} from "../../model/detail-schemas";
import { DatePickerField } from "../date-picker-field";

const positiveNumber = z.number().positive("validation_positive");
const requiredPositive = z
  .number({ required_error: "validation_required" })
  .positive("validation_positive");

const measurementLabels: Record<string, () => string> = {
  chest: m.form_chest,
  waist: m.form_waist,
  hip: m.form_hip,
  biceps: m.form_biceps,
  quadriceps: m.form_quadriceps,
};

interface BodyMetricsFormProps {
  id: string;
  onSubmit: (data: BodyMetricsFormData) => void;
}

export function BodyMetricsForm({ id, onSubmit }: Readonly<BodyMetricsFormProps>) {
  const [showMeasurements, setShowMeasurements] = useState(false);
  const form = useForm({
    defaultValues: defaultBodyMetricsValues,
    onSubmit: async ({ value }) => {
      const result = bodyMetricsSchema.safeParse(value);
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
        <form.Field name="date">
          {(field) => (
            <Field>
              <FieldLabel>
                {m.form_date()} <span className="text-destructive">*</span>
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

        <form.Field name="weight" validators={{ onBlur: createFieldValidator(requiredPositive) }}>
          {(field) => (
            <Field>
              <FieldLabel>
                {m.form_weight()} <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  step="0.1"
                  placeholder={m.form_weight_placeholder()}
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>

        <form.Field name="heightCm" validators={{ onBlur: createFieldValidator(requiredPositive) }}>
          {(field) => (
            <Field>
              <FieldLabel>
                {m.form_height()} <span className="text-destructive">*</span>
              </FieldLabel>
              <FieldContent>
                <Input
                  type="number"
                  step="1"
                  placeholder={m.form_height_placeholder()}
                  value={field.state.value || ""}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                  onBlur={field.handleBlur}
                />
              </FieldContent>
            </Field>
          )}
        </form.Field>
      </FieldGroup>

      <FieldSeparator />

      <button
        type="button"
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setShowMeasurements((prev) => !prev)}
      >
        <ChevronRightIcon
          className={`size-4 text-muted-foreground transition-transform ${showMeasurements ? "rotate-90" : ""}`}
        />
        <span className="font-semibold text-base text-foreground">{m.form_measurements()}</span>
      </button>

      {showMeasurements ? (
        <FieldGroup>
          {(["chest", "waist", "hip", "biceps", "quadriceps"] as const).map((key) => (
            <form.Field
              key={key}
              name={key}
              validators={{ onBlur: createFieldValidator(positiveNumber.optional()) }}
            >
              {(field) => (
                <Field>
                  <FieldLabel>{measurementLabels[key]()}</FieldLabel>
                  <FieldContent>
                    <Input
                      type="number"
                      step="0.1"
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
          ))}
        </FieldGroup>
      ) : null}
    </form>
  );
}

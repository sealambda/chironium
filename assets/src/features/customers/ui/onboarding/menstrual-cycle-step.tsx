import { useForm } from "@tanstack/react-form";
import { useEffect } from "react";

import type { MenstrualCycleFormData } from "@/features/customers/api/observations-api";
import { menstrualCycleSchema } from "@/features/customers/model/onboarding-schemas";
import * as m from "@/paraglide/messages";
import type { AdministrativeGender } from "@/shared/types/schema-enums";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface MenstrualCycleStepProps {
  readonly initialData?: MenstrualCycleFormData;
  readonly gender?: AdministrativeGender;
  readonly onSubmit: (data: MenstrualCycleFormData) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: MenstrualCycleFormData) => void;
}

/**
 * Step 4: Capture last menstrual cycle dates and notes.
 * All fields are optional — the user can skip this step.
 * Auto-skips when gender is MALE.
 */
export function MenstrualCycleStep({
  initialData,
  gender,
  onSubmit,
  onBack,
  onSaveDraft,
}: MenstrualCycleStepProps) {
  // Auto-advance for male patients — menstrual cycle data is not applicable.
  useEffect(() => {
    if (gender === "MALE") {
      onSubmit({ startDate: "", endDate: "", notes: "" });
    }
  }, [gender, onSubmit]);

  const form = useForm({
    defaultValues: {
      startDate: initialData?.startDate ?? "",
      endDate: initialData?.endDate ?? "",
      notes: initialData?.notes ?? "",
    },
    validators: { onSubmit: menstrualCycleSchema },
    onSubmit: ({ value }) => {
      onSubmit(value);
    },
  });

  if (gender === "MALE") {
    return null;
  }

  const handleBack = () => {
    onSaveDraft?.(form.state.values);
    onBack();
  };

  return (
    <StepLayout
      title={m.step_cycle_title()}
      description={m.step_cycle_desc()}
      onSubmit={() => form.handleSubmit()}
      onBack={handleBack}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <form.Field name="startDate">
            {(field) => (
              <Field>
                <FieldLabel>{m.field_cycle_start_date()}</FieldLabel>
                <DatePickerString
                  value={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                />
              </Field>
            )}
          </form.Field>

          <form.Field name="endDate">
            {(field) => (
              <Field>
                <FieldLabel>{m.field_cycle_end_date()}</FieldLabel>
                <DatePickerString
                  value={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                />
              </Field>
            )}
          </form.Field>
        </div>

        <form.Field name="notes">
          {(field) => (
            <Field>
              <FieldLabel>{m.field_cycle_notes()}</FieldLabel>
              <Textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={m.field_cycle_notes_placeholder()}
                rows={3}
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </StepLayout>
  );
}

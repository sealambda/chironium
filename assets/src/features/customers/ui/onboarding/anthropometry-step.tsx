import { useForm } from "@tanstack/react-form";

import type { AnthropometryFormData } from "@/features/customers/api/anthropometry-api";
import {
  AnthropometryMeasurementFields,
  buildAnthropometryMeasurementValues,
  hasAdvancedAnthropometryMeasurementValues,
  toAnthropometryMeasurementInput,
} from "@/features/customers/ui/shared/anthropometry-measurement-fields";
import * as m from "@/paraglide/messages";
import { FieldGroup } from "@/shared/ui/field";

import { StepLayout } from "./step-layout";

interface AnthropometryStepProps {
  readonly initialData?: AnthropometryFormData;
  readonly onSubmit: (data: AnthropometryFormData) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: AnthropometryFormData) => void;
}

/**
 * Capture height, weight, and circumference measurements.
 * All fields are optional — the user can skip this step.
 */
export function AnthropometryStep({
  initialData,
  onSubmit,
  onBack,
  onSaveDraft,
}: AnthropometryStepProps) {
  const form = useForm({
    defaultValues: buildAnthropometryMeasurementValues(initialData),
    onSubmit: ({ value }) => {
      onSubmit(toAnthropometryMeasurementInput(value));
    },
  });

  const handleBack = () => {
    onSaveDraft?.(toAnthropometryMeasurementInput(form.state.values));
    onBack();
  };

  const initialShowMore = hasAdvancedAnthropometryMeasurementValues(initialData);

  return (
    <StepLayout
      title={m.step_anthropometry_title()}
      description={m.step_anthropometry_desc()}
      onSubmit={() => form.handleSubmit()}
      onBack={handleBack}
    >
      <FieldGroup>
        <AnthropometryMeasurementFields
          form={form}
          withSteppers
          withValidation
          initialShowMore={initialShowMore}
        />
      </FieldGroup>
    </StepLayout>
  );
}

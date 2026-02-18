import { useState } from "react";

import type { BodyMeasurementsFormData } from "@/features/customers/api/onboarding-api";
import * as m from "@/paraglide/messages";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

import { StepLayout } from "./step-layout";

interface BodyMeasurementsStepProps {
  readonly onSubmit: (data: BodyMeasurementsFormData) => Promise<void>;
  readonly onBack: () => void;
}

/**
 * Step 5: Capture height and weight.
 * Both fields are optional — the user can skip this step.
 */
export function BodyMeasurementsStep({ onSubmit, onBack }: BodyMeasurementsStepProps) {
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (height && (Number.isNaN(Number(height)) || Number(height) <= 0)) {
      newErrors.height = m.validation_positive_number();
    }
    if (weight && (Number.isNaN(Number(weight)) || Number(weight) <= 0)) {
      newErrors.weight = m.validation_positive_number();
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        heightCm: height ? Number(height) : null,
        weightKg: weight ? Number(weight) : null,
      });
    } catch {
      // Error handling is done in the parent dialog.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StepLayout
      title={m.step_body_title()}
      description={m.step_body_desc()}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onBack={onBack}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field data-invalid={Boolean(errors.height)}>
            <FieldLabel>{m.field_height_cm()}</FieldLabel>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={height}
              onChange={(e) => {
                setHeight(e.target.value);
                if (errors.height) {
                  setErrors((prev) => ({ ...prev, height: "" }));
                }
              }}
              placeholder={m.field_height_placeholder()}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.height)}
            />
            {errors.height ? <FieldError>{errors.height}</FieldError> : null}
          </Field>

          <Field data-invalid={Boolean(errors.weight)}>
            <FieldLabel>{m.field_weight_kg()}</FieldLabel>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.1"
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                if (errors.weight) {
                  setErrors((prev) => ({ ...prev, weight: "" }));
                }
              }}
              placeholder={m.field_weight_placeholder()}
              disabled={isSubmitting}
              aria-invalid={Boolean(errors.weight)}
            />
            {errors.weight ? <FieldError>{errors.weight}</FieldError> : null}
          </Field>
        </div>
      </FieldGroup>
    </StepLayout>
  );
}

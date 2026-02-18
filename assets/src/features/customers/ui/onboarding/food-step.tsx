import { useState } from "react";

import type { FoodFormData } from "@/features/customers/api/onboarding-api";
import * as m from "@/paraglide/messages";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface FoodStepProps {
  readonly onSubmit: (data: FoodFormData) => Promise<void>;
  readonly onBack: () => void;
}

/**
 * Step 7: Capture dietary inclusions and exclusions as free text.
 * Both fields are optional — the user can skip this step.
 */
export function FoodStep({ onSubmit, onBack }: FoodStepProps) {
  const [included, setIncluded] = useState("");
  const [excluded, setExcluded] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ included, excluded });
    } catch {
      // Error handling is done in the parent dialog.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StepLayout
      title={m.step_food_title()}
      description={m.step_food_desc()}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onBack={onBack}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>{m.field_food_included()}</FieldLabel>
          <Textarea
            value={included}
            onChange={(e) => setIncluded(e.target.value)}
            placeholder={m.field_food_included_placeholder()}
            rows={3}
            disabled={isSubmitting}
          />
        </Field>

        <Field>
          <FieldLabel>{m.field_food_excluded()}</FieldLabel>
          <Textarea
            value={excluded}
            onChange={(e) => setExcluded(e.target.value)}
            placeholder={m.field_food_excluded_placeholder()}
            rows={3}
            disabled={isSubmitting}
          />
        </Field>
      </FieldGroup>
    </StepLayout>
  );
}

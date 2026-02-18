import { useState } from "react";

import type { FoodFormData } from "@/features/customers/api/onboarding-api";
import * as m from "@/paraglide/messages";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface FoodStepProps {
  readonly initialData?: FoodFormData;
  readonly onSubmit: (data: FoodFormData) => void;
  readonly onBack: () => void;
}

/**
 * Step 7: Capture dietary inclusions and exclusions as free text.
 * Both fields are optional — the user can skip this step.
 */
export function FoodStep({ initialData, onSubmit, onBack }: FoodStepProps) {
  const [included, setIncluded] = useState(initialData?.included ?? "");
  const [excluded, setExcluded] = useState(initialData?.excluded ?? "");

  const handleSubmit = () => {
    onSubmit({ included, excluded });
  };

  return (
    <StepLayout
      title={m.step_food_title()}
      description={m.step_food_desc()}
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
          />
        </Field>

        <Field>
          <FieldLabel>{m.field_food_excluded()}</FieldLabel>
          <Textarea
            value={excluded}
            onChange={(e) => setExcluded(e.target.value)}
            placeholder={m.field_food_excluded_placeholder()}
            rows={3}
          />
        </Field>
      </FieldGroup>
    </StepLayout>
  );
}

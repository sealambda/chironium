import { useState } from "react";

import type { AllergiesFormData } from "@/features/customers/api/onboarding-api";
import * as m from "@/paraglide/messages";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface AllergiesStepProps {
  readonly initialData?: AllergiesFormData;
  readonly onSubmit: (data: AllergiesFormData) => void;
  readonly onBack: () => void;
}

/**
 * Step 6: Capture allergies and intolerances as free text.
 * Both fields are optional — the user can skip this step.
 */
export function AllergiesStep({ initialData, onSubmit, onBack }: AllergiesStepProps) {
  const [allergies, setAllergies] = useState(initialData?.allergies ?? "");
  const [intolerances, setIntolerances] = useState(initialData?.intolerances ?? "");

  const handleSubmit = () => {
    onSubmit({ allergies, intolerances });
  };

  return (
    <StepLayout
      title={m.step_allergies_title()}
      description={m.step_allergies_desc()}
      onSubmit={handleSubmit}
      onBack={onBack}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>{m.field_allergies()}</FieldLabel>
          <Textarea
            value={allergies}
            onChange={(e) => setAllergies(e.target.value)}
            placeholder={m.field_allergies_placeholder()}
            rows={3}
          />
        </Field>

        <Field>
          <FieldLabel>{m.field_intolerances()}</FieldLabel>
          <Textarea
            value={intolerances}
            onChange={(e) => setIntolerances(e.target.value)}
            placeholder={m.field_intolerances_placeholder()}
            rows={3}
          />
        </Field>
      </FieldGroup>
    </StepLayout>
  );
}

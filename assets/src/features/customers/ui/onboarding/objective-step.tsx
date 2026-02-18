import { useState } from "react";

import * as m from "@/paraglide/messages";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface ObjectiveStepProps {
  readonly initialData?: string;
  readonly onSubmit: (note: string) => void;
  readonly onBack: () => void;
}

/**
 * Step 3: Capture the customer's main objective as a free text observation.
 */
export function ObjectiveStep({ initialData, onSubmit, onBack }: ObjectiveStepProps) {
  const [objective, setObjective] = useState(initialData ?? "");
  const [error, setError] = useState("");

  const validate = (): boolean => {
    if (!objective.trim()) {
      setError(m.validation_required());
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) {
      return;
    }

    onSubmit(objective.trim());
  };

  return (
    <StepLayout
      title={m.step_objective_title()}
      description={m.step_objective_desc()}
      onSubmit={handleSubmit}
      onBack={onBack}
    >
      <FieldGroup>
        <Field data-invalid={Boolean(error)}>
          <FieldLabel>{m.field_objective()}</FieldLabel>
          <Textarea
            value={objective}
            onChange={(e) => {
              setObjective(e.target.value);
              if (error) {
                setError("");
              }
            }}
            placeholder={m.field_objective_placeholder()}
            rows={4}
            aria-invalid={Boolean(error)}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </FieldGroup>
    </StepLayout>
  );
}

import { useState } from "react";

import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { DialogFooter } from "@/shared/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Textarea } from "@/shared/ui/textarea";

interface ObjectiveStepProps {
  readonly onSubmit: (note: string) => Promise<void>;
  readonly onBack: () => void;
}

/**
 * Step 3: Capture the customer's main objective as a free text observation.
 */
export function ObjectiveStep({ onSubmit, onBack }: ObjectiveStepProps) {
  const [objective, setObjective] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const validate = (): boolean => {
    if (!objective.trim()) {
      setError(m.validation_required());
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(objective.trim());
    } catch {
      // Error handling is done in the parent dialog.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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
            disabled={isSubmitting}
            aria-invalid={Boolean(error)}
          />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
      </FieldGroup>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
          {m.common_back()}
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? m.common_creating() : m.common_finish()}
        </Button>
      </DialogFooter>
    </>
  );
}

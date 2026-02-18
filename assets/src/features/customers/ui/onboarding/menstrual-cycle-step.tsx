import { useState } from "react";

import type { MenstrualCycleFormData } from "@/features/customers/api/onboarding-api";
import * as m from "@/paraglide/messages";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface MenstrualCycleStepProps {
  readonly onSubmit: (data: MenstrualCycleFormData) => Promise<void>;
  readonly onBack: () => void;
}

/**
 * Step 4: Capture last menstrual cycle dates and notes.
 * All fields are optional — the user can skip this step.
 */
export function MenstrualCycleStep({ onSubmit, onBack }: MenstrualCycleStepProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ startDate, endDate, notes });
    } catch {
      // Error handling is done in the parent dialog.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StepLayout
      title={m.step_cycle_title()}
      description={m.step_cycle_desc()}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onBack={onBack}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{m.field_cycle_start_date()}</FieldLabel>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>

          <Field>
            <FieldLabel>{m.field_cycle_end_date()}</FieldLabel>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={isSubmitting}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel>{m.field_cycle_notes()}</FieldLabel>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={m.field_cycle_notes_placeholder()}
            rows={3}
            disabled={isSubmitting}
          />
        </Field>
      </FieldGroup>
    </StepLayout>
  );
}

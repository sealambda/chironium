import { useState } from "react";

import type { MenstrualCycleFormData } from "@/features/customers/api/observations-api";
import * as m from "@/paraglide/messages";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import { StepLayout } from "./step-layout";

interface MenstrualCycleStepProps {
  readonly initialData?: MenstrualCycleFormData;
  readonly onSubmit: (data: MenstrualCycleFormData) => void;
  readonly onBack: () => void;
}

/**
 * Step 4: Capture last menstrual cycle dates and notes.
 * All fields are optional — the user can skip this step.
 */
export function MenstrualCycleStep({ initialData, onSubmit, onBack }: MenstrualCycleStepProps) {
  const [startDate, setStartDate] = useState(initialData?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialData?.endDate ?? "");
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const handleSubmit = () => {
    onSubmit({ startDate, endDate, notes });
  };

  return (
    <StepLayout
      title={m.step_cycle_title()}
      description={m.step_cycle_desc()}
      onSubmit={handleSubmit}
      onBack={onBack}
    >
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel>{m.field_cycle_start_date()}</FieldLabel>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </Field>

          <Field>
            <FieldLabel>{m.field_cycle_end_date()}</FieldLabel>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </Field>
        </div>

        <Field>
          <FieldLabel>{m.field_cycle_notes()}</FieldLabel>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={m.field_cycle_notes_placeholder()}
            rows={3}
          />
        </Field>
      </FieldGroup>
    </StepLayout>
  );
}

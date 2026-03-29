import { useState } from "react";

import type { MedicationsFormData } from "@/features/customers/api/medications-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import type { TerminologyTag } from "@/shared/types/terminology";
import { FieldGroup } from "@/shared/ui/field";
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";

import { StepLayout } from "./step-layout";

interface MedicationsStepProps {
  readonly initialData?: MedicationsFormData;
  readonly onSubmit: (data: MedicationsFormData) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: MedicationsFormData) => void;
}

/**
 * Optional coded medications (FHIR MedicationStatement).
 */
export function MedicationsStep({
  initialData,
  onSubmit,
  onBack,
  onSaveDraft,
}: MedicationsStepProps) {
  const { selectedOrg } = useOrg();
  const [medications, setMedications] = useState<TerminologyTag[]>(initialData?.medications ?? []);
  const [pending, setPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (pending) {
      setPendingError(m.validation_pending_input());
      return;
    }
    setPendingError(null);
    onSubmit({ medications });
  };

  const handleBack = () => {
    onSaveDraft?.({ medications });
    onBack();
  };

  return (
    <StepLayout
      title={m.step_medications_title()}
      description={m.step_medications_desc()}
      onSubmit={handleSubmit}
      onBack={handleBack}
    >
      <FieldGroup>
        <TerminologyTagInput
          label={m.medication_list_label()}
          placeholder={m.medication_field_placeholder()}
          tags={medications}
          onAdd={(tag) => setMedications((prev) => [...prev, tag])}
          onRemove={(index) => setMedications((prev) => prev.filter((_, i) => i !== index))}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="MEDICATION"
          addLabel={m.common_add()}
          onPendingChange={(isPending) => {
            setPending(isPending);
            if (!isPending) {
              setPendingError(null);
            }
          }}
          error={pending && pendingError ? pendingError : undefined}
        />
      </FieldGroup>
    </StepLayout>
  );
}

import type { MedicationsFormData } from "@/features/customers/api/medications-api";
import {
  useTerminologyPendingFields,
  useTerminologyTagList,
} from "@/features/customers/hooks/use-terminology-tag-list";
import * as m from "@/paraglide/messages";
import { useOrg } from "@/shared/session/use-org";
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
  const medications = useTerminologyTagList(initialData?.medications ?? []);
  const pendingFields = useTerminologyPendingFields<"medications">();

  const handleSubmit = () => {
    if (pendingFields.hasPendingInput) {
      pendingFields.setPendingError(m.validation_pending_input());
      return;
    }
    pendingFields.clearPendingError();
    onSubmit({ medications: medications.tags });
  };

  const handleBack = () => {
    onSaveDraft?.({ medications: medications.tags });
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
          tags={medications.tags}
          onAdd={medications.addTag}
          onRemove={medications.removeTag}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="MEDICATION"
          addLabel={m.common_add()}
          onPendingChange={(pending) => pendingFields.setFieldPending("medications", pending)}
          error={pendingFields.getFieldError("medications")}
        />
      </FieldGroup>
    </StepLayout>
  );
}

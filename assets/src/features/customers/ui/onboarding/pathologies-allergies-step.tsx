import type { AllergiesFormData } from "@/features/customers/api/allergy-intolerance-api";
import type { PathologiesFormData } from "@/features/customers/api/condition-api";
import {
  useTerminologyPendingFields,
  useTerminologyTagList,
} from "@/features/customers/hooks/use-terminology-tag-list";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { FieldGroup } from "@/shared/ui/field";
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";

import { StepLayout } from "./step-layout";

/** Payload for the combined pathologies, allergies, and intolerances onboarding step. */
export interface PathologiesAllergiesStepData {
  pathologies: PathologiesFormData;
  allergies: AllergiesFormData;
}

interface PathologiesAllergiesStepProps {
  readonly initialPathologies?: PathologiesFormData;
  readonly initialAllergies?: AllergiesFormData;
  readonly onSubmit: (data: PathologiesAllergiesStepData) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: PathologiesAllergiesStepData) => void;
}

/**
 * Capture pathologies, allergies, and intolerances as tagged items (optional).
 */
export function PathologiesAllergiesStep({
  initialPathologies,
  initialAllergies,
  onSubmit,
  onBack,
  onSaveDraft,
}: PathologiesAllergiesStepProps) {
  const { selectedOrg } = useOrg();
  const pathologies = useTerminologyTagList(initialPathologies?.pathologies ?? []);
  const allergies = useTerminologyTagList(initialAllergies?.allergies ?? []);
  const intolerances = useTerminologyTagList(initialAllergies?.intolerances ?? []);
  const pendingFields = useTerminologyPendingFields<"pathologies" | "allergies" | "intolerances">();

  const handleSubmit = () => {
    if (pendingFields.hasPendingInput) {
      pendingFields.setPendingError(m.validation_pending_input());
      return;
    }
    pendingFields.clearPendingError();
    onSubmit({
      pathologies: { pathologies: pathologies.tags },
      allergies: { allergies: allergies.tags, intolerances: intolerances.tags },
    });
  };

  const handleBack = () => {
    onSaveDraft?.({
      pathologies: { pathologies: pathologies.tags },
      allergies: { allergies: allergies.tags, intolerances: intolerances.tags },
    });
    onBack();
  };

  return (
    <StepLayout
      title={m.step_pathologies_allergies_title()}
      description={m.step_pathologies_allergies_desc()}
      onSubmit={handleSubmit}
      onBack={handleBack}
    >
      <FieldGroup>
        <TerminologyTagInput
          label={m.condition_list_label()}
          placeholder={m.condition_field_placeholder()}
          tags={pathologies.tags}
          onAdd={pathologies.addTag}
          onRemove={pathologies.removeTag}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="CONDITION"
          addLabel={m.common_add()}
          onPendingChange={(pending) => pendingFields.setFieldPending("pathologies", pending)}
          error={pendingFields.getFieldError("pathologies")}
        />
        <TerminologyTagInput
          label={m.field_allergies()}
          placeholder={m.field_allergies_placeholder()}
          tags={allergies.tags}
          onAdd={allergies.addTag}
          onRemove={allergies.removeTag}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="ALLERGY_INTOLERANCE"
          addLabel={m.common_add()}
          onPendingChange={(pending) => pendingFields.setFieldPending("allergies", pending)}
          error={pendingFields.getFieldError("allergies")}
        />
        <TerminologyTagInput
          label={m.field_intolerances()}
          placeholder={m.field_intolerances_placeholder()}
          tags={intolerances.tags}
          onAdd={intolerances.addTag}
          onRemove={intolerances.removeTag}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="ALLERGY_INTOLERANCE"
          addLabel={m.common_add()}
          onPendingChange={(pending) => pendingFields.setFieldPending("intolerances", pending)}
          error={pendingFields.getFieldError("intolerances")}
        />
      </FieldGroup>
    </StepLayout>
  );
}

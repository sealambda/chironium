import { useState } from "react";

import type { AllergiesFormData } from "@/features/customers/api/allergy-intolerance-api";
import type { PathologiesFormData } from "@/features/customers/api/condition-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import type { TerminologyTag } from "@/shared/types/terminology";
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
  const [pathologies, setPathologies] = useState<TerminologyTag[]>(
    initialPathologies?.pathologies ?? [],
  );
  const [allergies, setAllergies] = useState<TerminologyTag[]>(initialAllergies?.allergies ?? []);
  const [intolerances, setIntolerances] = useState<TerminologyTag[]>(
    initialAllergies?.intolerances ?? [],
  );
  const [pathologiesPending, setPathologiesPending] = useState(false);
  const [allergiesPending, setAllergiesPending] = useState(false);
  const [intolerancesPending, setIntolerancesPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (pathologiesPending || allergiesPending || intolerancesPending) {
      setPendingError(m.validation_pending_input());
      return;
    }
    setPendingError(null);
    onSubmit({
      pathologies: { pathologies },
      allergies: { allergies, intolerances },
    });
  };

  const handleBack = () => {
    onSaveDraft?.({
      pathologies: { pathologies },
      allergies: { allergies, intolerances },
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
          tags={pathologies}
          onAdd={(tag) => setPathologies((prev) => [...prev, tag])}
          onRemove={(index) => setPathologies((prev) => prev.filter((_, i) => i !== index))}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="CONDITION"
          addLabel={m.common_add()}
          onPendingChange={(pending) => {
            setPathologiesPending(pending);
            if (!pending) {
              setPendingError(null);
            }
          }}
          error={pathologiesPending && pendingError ? pendingError : undefined}
        />
        <TerminologyTagInput
          label={m.field_allergies()}
          placeholder={m.field_allergies_placeholder()}
          tags={allergies}
          onAdd={(tag) => setAllergies((prev) => [...prev, tag])}
          onRemove={(index) => setAllergies((prev) => prev.filter((_, i) => i !== index))}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="ALLERGY_INTOLERANCE"
          addLabel={m.common_add()}
          onPendingChange={(pending) => {
            setAllergiesPending(pending);
            if (!pending) {
              setPendingError(null);
            }
          }}
          error={allergiesPending && pendingError ? pendingError : undefined}
        />
        <TerminologyTagInput
          label={m.field_intolerances()}
          placeholder={m.field_intolerances_placeholder()}
          tags={intolerances}
          onAdd={(tag) => setIntolerances((prev) => [...prev, tag])}
          onRemove={(index) => setIntolerances((prev) => prev.filter((_, i) => i !== index))}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="ALLERGY_INTOLERANCE"
          addLabel={m.common_add()}
          onPendingChange={(pending) => {
            setIntolerancesPending(pending);
            if (!pending) {
              setPendingError(null);
            }
          }}
          error={intolerancesPending && pendingError ? pendingError : undefined}
        />
      </FieldGroup>
    </StepLayout>
  );
}

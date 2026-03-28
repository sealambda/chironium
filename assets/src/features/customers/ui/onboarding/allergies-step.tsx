import { useState } from "react";

import type { AllergiesFormData } from "@/features/customers/api/allergy-intolerance-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import type { TerminologyTag } from "@/shared/types/terminology";
import { FieldGroup } from "@/shared/ui/field";
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";

import { StepLayout } from "./step-layout";

interface AllergiesStepProps {
  readonly initialData?: AllergiesFormData;
  readonly onSubmit: (data: AllergiesFormData) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: AllergiesFormData) => void;
}

/**
 * Step 6: Capture allergies and intolerances as tagged items.
 * Both fields are optional — the user can skip this step.
 */
export function AllergiesStep({ initialData, onSubmit, onBack, onSaveDraft }: AllergiesStepProps) {
  const { selectedOrg } = useOrg();
  const [allergies, setAllergies] = useState<TerminologyTag[]>(initialData?.allergies ?? []);
  const [intolerances, setIntolerances] = useState<TerminologyTag[]>(
    initialData?.intolerances ?? [],
  );
  const [allergiesPending, setAllergiesPending] = useState(false);
  const [intolerancesPending, setIntolerancesPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (allergiesPending || intolerancesPending) {
      setPendingError(m.validation_pending_input());
      return;
    }
    setPendingError(null);
    onSubmit({ allergies, intolerances });
  };

  const handleBack = () => {
    onSaveDraft?.({ allergies, intolerances });
    onBack();
  };

  return (
    <StepLayout
      title={m.step_allergies_title()}
      description={m.step_allergies_desc()}
      onSubmit={handleSubmit}
      onBack={handleBack}
    >
      <FieldGroup>
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

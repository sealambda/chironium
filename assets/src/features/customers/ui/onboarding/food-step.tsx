import { useState } from "react";

import type { FoodFormData } from "@/features/customers/api/food-preferences-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import type { TerminologyTag } from "@/shared/types/terminology";
import { FieldGroup } from "@/shared/ui/field";
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";

import { StepLayout } from "./step-layout";

interface FoodStepProps {
  readonly initialData?: FoodFormData;
  readonly onSubmit: (data: FoodFormData) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: FoodFormData) => void;
}

/**
 * Step 7: Capture dietary inclusions and exclusions as tagged items.
 * Both fields are optional — the user can skip this step.
 */
export function FoodStep({ initialData, onSubmit, onBack, onSaveDraft }: FoodStepProps) {
  const { selectedOrg } = useOrg();
  const [included, setIncluded] = useState<TerminologyTag[]>(initialData?.included ?? []);
  const [excluded, setExcluded] = useState<TerminologyTag[]>(initialData?.excluded ?? []);
  const [includedPending, setIncludedPending] = useState(false);
  const [excludedPending, setExcludedPending] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);

  const handleSubmit = () => {
    if (includedPending || excludedPending) {
      setPendingError(m.validation_pending_input());
      return;
    }
    setPendingError(null);
    onSubmit({ included, excluded });
  };

  const handleBack = () => {
    onSaveDraft?.({ included, excluded });
    onBack();
  };

  return (
    <StepLayout
      title={m.step_food_title()}
      description={m.step_food_desc()}
      onSubmit={handleSubmit}
      onBack={handleBack}
    >
      <FieldGroup>
        <TerminologyTagInput
          label={m.field_food_included()}
          placeholder={m.field_food_included_placeholder()}
          tags={included}
          onAdd={(tag) => setIncluded((prev) => [...prev, tag])}
          onRemove={(index) => setIncluded((prev) => prev.filter((_, i) => i !== index))}
          organizationId={selectedOrg?.id ?? ""}
          addLabel={m.common_add()}
          onPendingChange={(pending) => {
            setIncludedPending(pending);
            if (!pending) {
              setPendingError(null);
            }
          }}
          error={includedPending && pendingError ? pendingError : undefined}
        />

        <TerminologyTagInput
          label={m.field_food_excluded()}
          placeholder={m.field_food_excluded_placeholder()}
          tags={excluded}
          onAdd={(tag) => setExcluded((prev) => [...prev, tag])}
          onRemove={(index) => setExcluded((prev) => prev.filter((_, i) => i !== index))}
          organizationId={selectedOrg?.id ?? ""}
          addLabel={m.common_add()}
          onPendingChange={(pending) => {
            setExcludedPending(pending);
            if (!pending) {
              setPendingError(null);
            }
          }}
          error={excludedPending && pendingError ? pendingError : undefined}
        />
      </FieldGroup>
    </StepLayout>
  );
}

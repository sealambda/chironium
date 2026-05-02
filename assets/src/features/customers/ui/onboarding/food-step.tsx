import type { FoodFormData } from "@/features/customers/api/food-preferences-api";
import {
  useTerminologyPendingFields,
  useTerminologyTagList,
} from "@/features/customers/hooks/use-terminology-tag-list";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
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
 * Capture dietary inclusions and exclusions as tagged items (optional).
 * Both fields are optional — the user can skip this step.
 */
export function FoodStep({ initialData, onSubmit, onBack, onSaveDraft }: FoodStepProps) {
  const { selectedOrg } = useOrg();
  const included = useTerminologyTagList(initialData?.included ?? []);
  const excluded = useTerminologyTagList(initialData?.excluded ?? []);
  const pendingFields = useTerminologyPendingFields<"included" | "excluded">();

  const handleSubmit = () => {
    if (pendingFields.hasPendingInput) {
      pendingFields.setPendingError(m.validation_pending_input());
      return;
    }
    pendingFields.clearPendingError();
    onSubmit({ included: included.tags, excluded: excluded.tags });
  };

  const handleBack = () => {
    onSaveDraft?.({ included: included.tags, excluded: excluded.tags });
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
          tags={included.tags}
          onAdd={included.addTag}
          onRemove={included.removeTag}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="FOOD"
          addLabel={m.common_add()}
          onPendingChange={(pending) => pendingFields.setFieldPending("included", pending)}
          error={pendingFields.getFieldError("included")}
        />

        <TerminologyTagInput
          label={m.field_food_excluded()}
          placeholder={m.field_food_excluded_placeholder()}
          tags={excluded.tags}
          onAdd={excluded.addTag}
          onRemove={excluded.removeTag}
          organizationId={selectedOrg?.id ?? ""}
          conceptContext="FOOD"
          addLabel={m.common_add()}
          onPendingChange={(pending) => pendingFields.setFieldPending("excluded", pending)}
          error={pendingFields.getFieldError("excluded")}
        />
      </FieldGroup>
    </StepLayout>
  );
}

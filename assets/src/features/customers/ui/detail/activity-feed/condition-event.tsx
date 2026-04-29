import type { ConditionItem } from "@/features/customers/api/condition-api";
import { ConditionPill } from "@/features/customers/ui/detail/condition-pill";
import { formatFhirClinicalStatusLabel } from "@/features/customers/utils/clinical-history-display";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";

interface ConditionEventProps {
  conditions: ConditionItem[];
}

export function ConditionEvent({ conditions }: Readonly<ConditionEventProps>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {conditions.map((condition) => {
        const name = displayTextFromCodeableConcept(condition.code);
        if (!name) {
          return null;
        }
        const statusLabel = condition.clinicalStatus
          ? formatFhirClinicalStatusLabel(condition.clinicalStatus)
          : null;

        return (
          <ConditionPill
            key={condition.id}
            clinicalStatus={condition.clinicalStatus}
            statusLabel={statusLabel}
          >
            {name}
          </ConditionPill>
        );
      })}
    </div>
  );
}

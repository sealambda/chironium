import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import type { MedicationItem } from "@/features/customers/api/medications-api";
import { MedicationPill } from "@/features/customers/ui/detail/medication-pill";
import { formatFhirMedicationStatusLabel } from "@/features/customers/utils/clinical-history-display";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import { Badge, type badgeVariants } from "@/shared/ui/badge";

interface MedicationEventProps {
  readonly medication: readonly MedicationItem[];
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const STATUS_BADGE_VARIANT = new Map<string, BadgeVariant>([
  ["COMPLETED", "info"],
  ["STOPPED", "secondary"],
  ["ON_HOLD", "warning"],
  ["ENTERED_IN_ERROR", "destructive"],
  ["UNKNOWN", "secondary"],
  ["NOT_TAKEN", "secondary"],
  ["INTENDED", "info"],
]);

// Statuses that don't warrant a visible badge — either default (RECORDED) or
// implied by the pill itself (ACTIVE).
const SILENT_STATUSES = new Set(["ACTIVE", "RECORDED"]);

export function MedicationEvent({ medication }: MedicationEventProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {medication.flatMap((item) => {
        const name = displayTextFromCodeableConcept(item.medication) ?? "";
        const statusKey = item.status?.toUpperCase() ?? "";
        const elements: ReactNode[] = [];

        if (name) {
          elements.push(<MedicationPill key={`${item.id}-name`}>{name}</MedicationPill>);
        }

        if (item.status && !SILENT_STATUSES.has(statusKey)) {
          elements.push(
            <Badge
              key={`${item.id}-status`}
              variant={STATUS_BADGE_VARIANT.get(statusKey) ?? "secondary"}
            >
              {formatFhirMedicationStatusLabel(item.status)}
            </Badge>,
          );
        }

        return elements;
      })}
    </div>
  );
}

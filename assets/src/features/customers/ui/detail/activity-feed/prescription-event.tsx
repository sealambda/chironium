import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import type { MedicationRequestItem } from "@/features/customers/api/medication-requests-api";
import { MedicationPill } from "@/features/customers/ui/detail/medication-pill";
import { formatFhirMedicationRequestStatusLabel } from "@/features/customers/utils/clinical-history-display";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import { Badge, type badgeVariants } from "@/shared/ui/badge";

interface PrescriptionEventProps {
  readonly prescriptions: readonly MedicationRequestItem[];
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const STATUS_BADGE_VARIANT = new Map<string, BadgeVariant>([
  ["COMPLETED", "info"],
  ["ON_HOLD", "warning"],
  ["STOPPED", "secondary"],
  ["ENDED", "secondary"],
  ["CANCELLED", "secondary"],
  ["ENTERED_IN_ERROR", "destructive"],
  ["DRAFT", "secondary"],
  ["UNKNOWN", "secondary"],
]);

// ACTIVE is the default state and is implied by the pill itself.
const SILENT_STATUSES = new Set(["ACTIVE"]);

export function PrescriptionEvent({ prescriptions }: PrescriptionEventProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {prescriptions.flatMap((item) => {
        const name = displayTextFromCodeableConcept(item.medication) ?? "";
        const statusKey = item.status?.toUpperCase() ?? "";
        const elements: ReactNode[] = [];

        if (name) {
          elements.push(
            <MedicationPill
              key={`${item.id}-name`}
              variant="recommended"
              isPast={item.status !== "ACTIVE"}
            >
              {name}
            </MedicationPill>,
          );
        }

        if (item.status && !SILENT_STATUSES.has(statusKey)) {
          elements.push(
            <Badge
              key={`${item.id}-status`}
              variant={STATUS_BADGE_VARIANT.get(statusKey) ?? "secondary"}
            >
              {formatFhirMedicationRequestStatusLabel(item.status)}
            </Badge>,
          );
        }

        return elements;
      })}
    </div>
  );
}

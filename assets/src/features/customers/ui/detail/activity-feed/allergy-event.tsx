import type { VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import { AllergyPill } from "@/features/customers/ui/detail/allergy-pill";
import { formatFhirClinicalStatusLabel } from "@/features/customers/utils/clinical-history-display";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";
import { Badge, type badgeVariants } from "@/shared/ui/badge";

interface AllergyEventProps {
  readonly allergies: readonly AllergyIntoleranceItem[];
}

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const STATUS_BADGE_VARIANT = new Map<string, BadgeVariant>([
  ["INACTIVE", "secondary"],
  ["RESOLVED", "success"],
]);

export function AllergyEvent({ allergies }: AllergyEventProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allergies.flatMap((allergy) => {
        const name = displayTextFromCodeableConcept(allergy.code) ?? "";
        const statusKey = allergy.clinicalStatus?.toUpperCase();
        const elements: ReactNode[] = [];

        if (name) {
          elements.push(
            <AllergyPill
              key={`${allergy.id}-name`}
              allergyType={allergy.type as "ALLERGY" | "INTOLERANCE"}
              clinicalStatus={allergy.clinicalStatus ?? undefined}
            >
              {name}
            </AllergyPill>,
          );
        }

        if (statusKey && statusKey !== "ACTIVE") {
          elements.push(
            <Badge
              key={`${allergy.id}-status`}
              variant={STATUS_BADGE_VARIANT.get(statusKey) ?? "secondary"}
            >
              {formatFhirClinicalStatusLabel(allergy.clinicalStatus)}
            </Badge>,
          );
        }

        return elements;
      })}
    </div>
  );
}

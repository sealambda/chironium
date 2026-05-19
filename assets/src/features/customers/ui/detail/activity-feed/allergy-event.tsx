import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import { AllergyPill } from "@/features/customers/ui/detail/allergy-pill";
import { displayTextFromCodeableConcept } from "@/features/customers/utils/codeable-concept-display";

interface AllergyEventProps {
  readonly allergies: readonly AllergyIntoleranceItem[];
}

export function AllergyEvent({ allergies }: AllergyEventProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {allergies.map((allergy) => {
        const name = displayTextFromCodeableConcept(allergy.code) ?? "";
        if (!name) {
          return null;
        }
        return (
          <AllergyPill
            key={allergy.id}
            allergyType={allergy.type as "ALLERGY" | "INTOLERANCE"}
            clinicalStatus={allergy.clinicalStatus ?? undefined}
          >
            {name}
          </AllergyPill>
        );
      })}
    </div>
  );
}

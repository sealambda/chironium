import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { TagPill, type TagPillTone } from "@/features/customers/ui/detail/tag-pill";

type AllergyType = "ALLERGY" | "INTOLERANCE";

const toneFor = (allergyType: AllergyType): TagPillTone =>
  allergyType === "INTOLERANCE" ? "orange" : "red";

interface AllergyPillProps extends Omit<ComponentPropsWithoutRef<"button">, "type" | "onClick"> {
  readonly allergyType: AllergyType;
  readonly clinicalStatus?: string | null;
  readonly children: ReactNode;
  readonly onClick?: () => void;
}

const isResolved = (status: string | null | undefined) => status?.toUpperCase() === "RESOLVED";

/**
 * Pill representing a single allergy or intolerance record. Resolved entries
 * use the muted tone to de-emphasise them; otherwise allergies are red and
 * intolerances are orange. Renders as a button when `onClick` is provided.
 */
export function AllergyPill({ allergyType, clinicalStatus, ...props }: Readonly<AllergyPillProps>) {
  const tone: TagPillTone = isResolved(clinicalStatus) ? "muted" : toneFor(allergyType);
  return <TagPill tone={tone} {...props} />;
}

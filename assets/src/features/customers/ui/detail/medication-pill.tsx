import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { TagPill } from "@/features/customers/ui/detail/tag-pill";

interface MedicationPillProps extends Omit<ComponentPropsWithoutRef<"button">, "type" | "onClick"> {
  readonly variant?: "recommended" | "other";
  readonly isPast?: boolean;
  readonly children: ReactNode;
  readonly onClick?: () => void;
}

function toneFor(variant: "recommended" | "other", isPast?: boolean) {
  if (isPast) {
    return "muted";
  }
  return variant === "recommended" ? "violet" : "blue";
}

/**
 * Pill representing a medication or supplement. Past use renders muted to
 * distinguish discontinued entries from current treatment.
 */
export function MedicationPill({
  variant = "recommended",
  isPast,
  ...props
}: Readonly<MedicationPillProps>) {
  return <TagPill tone={toneFor(variant, isPast)} {...props} />;
}

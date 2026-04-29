import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { TagPill } from "@/features/customers/ui/detail/tag-pill";

interface MedicationPillProps extends Omit<ComponentPropsWithoutRef<"button">, "type" | "onClick"> {
  readonly isPast?: boolean;
  readonly children: ReactNode;
  readonly onClick?: () => void;
}

/**
 * Pill representing a medication or supplement. Past use renders muted to
 * distinguish discontinued entries from current treatment.
 */
export function MedicationPill({ isPast, ...props }: Readonly<MedicationPillProps>) {
  return <TagPill tone={isPast ? "muted" : "violet"} {...props} />;
}

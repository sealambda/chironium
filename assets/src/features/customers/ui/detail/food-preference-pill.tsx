import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { TagPill } from "@/features/customers/ui/detail/tag-pill";

interface FoodPreferencePillProps
  extends Omit<ComponentPropsWithoutRef<"button">, "type" | "onClick"> {
  readonly variant: "inclusion" | "exclusion";
  readonly children: ReactNode;
  readonly onClick?: () => void;
}

/**
 * Pill representing a food preference (inclusion) or aversion (exclusion).
 */
export function FoodPreferencePill({ variant, ...props }: Readonly<FoodPreferencePillProps>) {
  return <TagPill tone={variant === "inclusion" ? "emerald" : "yellow"} {...props} />;
}

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { TagPill } from "@/features/customers/ui/detail/tag-pill";

interface ConditionPillProps extends Omit<ComponentPropsWithoutRef<"button">, "type" | "onClick"> {
  readonly clinicalStatus?: string | null;
  readonly statusLabel?: string | null;
  readonly children: ReactNode;
  readonly onClick?: () => void;
}

const RESOLVED_STATUSES = new Set(["RESOLVED", "INACTIVE", "REMISSION"]);

/**
 * Pill representing a single condition. Resolved/inactive/remission states use
 * the muted tone to de-emphasise them. Renders as a button when `onClick` is
 * provided, otherwise as a span (for read-only timeline contexts).
 */
export function ConditionPill({
  clinicalStatus,
  statusLabel,
  ...props
}: Readonly<ConditionPillProps>) {
  const isResolved = clinicalStatus ? RESOLVED_STATUSES.has(clinicalStatus.toUpperCase()) : false;
  return (
    <TagPill
      tone={isResolved ? "muted" : "blue"}
      srLabel={isResolved ? statusLabel : null}
      {...props}
    />
  );
}

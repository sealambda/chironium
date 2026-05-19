import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { TagPill } from "@/features/customers/ui/detail/tag-pill";

interface ConditionPillProps extends Omit<ComponentPropsWithoutRef<"button">, "type" | "onClick"> {
  readonly clinicalStatus?: string | null;
  readonly statusLabel?: string | null;
  readonly children: ReactNode;
  readonly onClick?: () => void;
}

const INACTIVE_STATUSES = new Set(["RESOLVED", "INACTIVE", "REMISSION"]);

const isInactive = (status: string | null | undefined) =>
  status != null && INACTIVE_STATUSES.has(status.toUpperCase());

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
  const isResolved = isInactive(clinicalStatus);
  return (
    <TagPill
      tone={isResolved ? "muted" : "blue"}
      srLabel={isResolved ? statusLabel : null}
      {...props}
    />
  );
}

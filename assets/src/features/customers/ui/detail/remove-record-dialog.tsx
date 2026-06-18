import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import * as m from "@/paraglide/messages";
import { useOrg } from "@/shared/session/use-org";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";

/**
 * Optional reason picker for FHIR-style "remove with reason" flows.
 * Each option contributes a `<ToggleGroupItem>` and an active-state hint line.
 */
export interface RemoveReasonOption<TReason extends string> {
  readonly value: TReason;
  readonly label: string;
  readonly description: string;
}

export interface RemoveRecordDialogProps<TReason extends string = string> {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly title: string;
  readonly description: string;
  readonly confirmLabel: string;
  readonly successMessage: string;
  /**
   * Performs the actual removal. Receives the selected reason when reason
   * options are configured, otherwise `undefined`. The org id is resolved
   * upstream by the wrapper so domain-specific logic stays out of the dialog.
   */
  readonly onConfirm: (reason: TReason | undefined) => Promise<void>;
  readonly invalidateKeys: readonly QueryKey[];
  readonly reasonOptions?: readonly RemoveReasonOption<TReason>[];
}

/**
 * Generic confirm-and-delete dialog for clinical records. Centralises loading
 * state, optimistic-removal toasting, and TanStack Query cache invalidation
 * so each domain wrapper only supplies its messages, mutation, and reasons.
 */
export function RemoveRecordDialog<TReason extends string>({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  successMessage,
  onConfirm,
  invalidateKeys,
  reasonOptions,
}: RemoveRecordDialogProps<TReason>) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState<TReason | undefined>(reasonOptions?.[0]?.value);
  const activeReason = reasonOptions?.find((option) => option.value === reason);
  const actionLabel = loading ? m.common_saving() : confirmLabel;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm(reason);
      await Promise.all(
        invalidateKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
      toast.success(successMessage);
      onOpenChange(false);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setLoading(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>

        {reasonOptions && reasonOptions.length > 0 ? (
          <div className="space-y-3">
            <ToggleGroup
              value={reason ?? ""}
              onValueChange={(value) => value && setReason(value as TReason)}
              disabled={loading}
            >
              {reasonOptions.map((option) => (
                <ToggleGroupItem key={option.value} value={option.value}>
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            {activeReason ? (
              <p className="text-muted-foreground text-sm">{activeReason.description}</p>
            ) : null}
          </div>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)} disabled={loading}>
            {m.common_cancel()}
          </AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm} loading={loading}>
            {actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * Helper for callers using the org-scoped resolution pattern: prefers the
 * explicit organization id, falling back to the active org from `useOrg`.
 */
export function useResolvedOrganizationId(explicitOrganizationId: string) {
  const { selectedOrg } = useOrg();
  return explicitOrganizationId || selectedOrg?.id || "";
}

import type { ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import { DialogFooter } from "@/shared/ui/dialog";

interface RecordDetailDialogFooterProps {
  readonly cancelLabel: ReactNode;
  readonly onCancel: () => void;
  readonly removeLabel?: ReactNode;
  readonly onRemoveClick?: () => void;
  readonly submitLabel?: ReactNode;
  readonly onSubmit?: () => void;
  readonly saving?: boolean;
  readonly submitLoading?: boolean;
}

export function RecordDetailDialogFooter({
  cancelLabel,
  onCancel,
  removeLabel,
  onRemoveClick,
  submitLabel,
  onSubmit,
  saving = false,
  submitLoading = saving,
}: RecordDetailDialogFooterProps) {
  const hasRemoveAction = onRemoveClick != null && removeLabel != null;
  const hasSubmitAction = onSubmit != null && submitLabel != null;

  return (
    <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      {hasRemoveAction ? (
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive sm:mr-auto"
          onClick={onRemoveClick}
          disabled={saving}
          type="button"
        >
          {removeLabel}
        </Button>
      ) : null}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onCancel} disabled={saving} type="button">
          {cancelLabel}
        </Button>
        {hasSubmitAction ? (
          <Button onClick={onSubmit} loading={submitLoading} type="button">
            {submitLabel}
          </Button>
        ) : null}
      </div>
    </DialogFooter>
  );
}

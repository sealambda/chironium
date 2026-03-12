import type { ReactElement } from "react";

import { ObservationForm } from "@/features/customers/ui/observation-form";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";

interface ObservationDialogProps {
  title: string;
  submitLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  body: string;
  onBodyChange: (value: string) => void;
  effectiveDate: string;
  onEffectiveDateChange: (value: string) => void;
  effectiveTime: string;
  onEffectiveTimeChange: (value: string) => void;
  onSubmit: () => Promise<void>;
  saving: boolean;
  trigger?: ReactElement;
}

export function ObservationDialog({
  title,
  submitLabel,
  open,
  onOpenChange,
  body,
  onBodyChange,
  effectiveDate,
  onEffectiveDateChange,
  effectiveTime,
  onEffectiveTimeChange,
  onSubmit,
  saving,
  trigger,
}: Readonly<ObservationDialogProps>) {
  const hasContent = body.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <ObservationForm
          body={body}
          onBodyChange={onBodyChange}
          effectiveDate={effectiveDate}
          onEffectiveDateChange={onEffectiveDateChange}
          effectiveTime={effectiveTime}
          onEffectiveTimeChange={onEffectiveTimeChange}
          disabled={saving}
          rows={4}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => void onSubmit()} disabled={saving || !hasContent}>
            {saving ? m.common_saving() : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import type { ReactElement } from "react";

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
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { MarkdownEditor } from "@/shared/ui/markdown-editor";

interface ObservationDialogProps {
  title: string;
  submitLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  body: string;
  onBodyChange: (value: string) => void;
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

        <MarkdownEditor
          value={body}
          onChange={onBodyChange}
          placeholder={m.field_observation_body_placeholder()}
          rows={4}
          disabled={saving}
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

import { useRef, type ReactElement } from "react";

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
import { MarkdownToolbar } from "@/shared/ui/markdown-toolbar";
import { Textarea } from "@/shared/ui/textarea";

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
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const hasContent = body.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger render={trigger} /> : null}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div>
          <MarkdownToolbar textareaRef={bodyRef} value={body} onChange={onBodyChange} />
          <Textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            placeholder={m.field_observation_body_placeholder()}
            rows={4}
            disabled={saving}
            className="rounded-t-none border-t-0"
          />
        </div>

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

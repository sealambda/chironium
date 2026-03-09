import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  type ObservationItem,
  parseClinicalNote,
  updateClinicalNoteObservation,
} from "@/features/customers/api/observations-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { MarkdownToolbar } from "@/shared/ui/markdown-toolbar";
import { Textarea } from "@/shared/ui/textarea";

interface EditObservationDialogProps {
  observation: ObservationItem;
  personId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditObservationDialog({
  observation,
  personId,
  open,
  onOpenChange,
}: Readonly<EditObservationDialogProps>) {
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  // Reset form to the observation's current content each time the dialog opens.
  useEffect(() => {
    if (open) {
      const parsed = parseClinicalNote(observation);
      setTitle(parsed.title);
      setBody(parsed.body);
    }
  }, [open, observation]);

  const hasContent = title.trim() || body.trim();

  const handleSubmit = async () => {
    if (!hasContent) return;
    setSaving(true);
    try {
      await updateClinicalNoteObservation(
        observation.id,
        { title: title.trim(), body: body.trim() },
        selectedOrg?.id ?? "",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["person", personId, "observations"] }),
        queryClient.invalidateQueries({ queryKey: ["person", personId, "observationsList"] }),
      ]);
      toast.success(m.observations_edit_success());
      onOpenChange(false);
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.observations_edit_title()}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>{m.field_observation_title()}</FieldLabel>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={m.field_observation_title_placeholder()}
              disabled={saving}
            />
          </Field>

          <Field>
            <FieldLabel>{m.field_observation_body()}</FieldLabel>
            <div>
              <MarkdownToolbar textareaRef={bodyRef} value={body} onChange={(v) => setBody(v)} />
              <Textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={m.field_observation_body_placeholder()}
                rows={4}
                disabled={saving}
                className="rounded-t-none border-t-0"
              />
            </div>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !hasContent}>
            {saving ? m.common_saving() : m.common_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

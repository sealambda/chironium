import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { createClinicalNoteObservations } from "@/features/customers/api/observations-api";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
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
import { Input } from "@/shared/ui/input";
import { MarkdownToolbar } from "@/shared/ui/markdown-toolbar";
import { Textarea } from "@/shared/ui/textarea";

interface AddObservationDialogProps {
  personId: string;
  patientId: string | null;
  children: React.ReactNode;
}

export function AddObservationDialog({
  personId,
  patientId,
  children,
}: Readonly<AddObservationDialogProps>) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  const hasContent = title.trim() || body.trim();

  const handleSubmit = async () => {
    if (!hasContent || !patientId) {
      if (!patientId) {
        toast.error(m.onboarding_error());
      }
      return;
    }

    setSaving(true);
    try {
      await createClinicalNoteObservations(
        [{ title: title.trim(), body: body.trim() }],
        patientId,
        selectedOrg?.id ?? "",
        user?.id ?? "",
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["person", personId, "observations"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["person", personId, "observationsList"],
        }),
      ]);
      toast.success(m.observations_add_success());
      setOpen(false);
      setTitle("");
      setBody("");
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.observations_add()}</DialogTitle>
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
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !hasContent}>
            {saving ? m.common_saving() : m.common_add()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

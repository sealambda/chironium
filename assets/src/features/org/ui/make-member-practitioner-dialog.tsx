import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createPrincipalGrant } from "@/features/org/api/org-api";
import { createPractitioner } from "@/features/practitioners/api/practitioners-api";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";

export type PractitionerNamePreset = {
  givenName: string;
  familyName: string;
};

export type MakePractitionerTarget =
  | { type: "user"; userId: string; namePreset?: PractitionerNamePreset }
  | { type: "invitation"; invitationId: string; namePreset?: PractitionerNamePreset };

interface MakeMemberPractitionerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly target: MakePractitionerTarget | null;
  readonly onSaved: () => Promise<void>;
}

export function MakeMemberPractitionerDialog({
  open,
  onOpenChange,
  organizationId,
  target,
  onSaved,
}: Readonly<MakeMemberPractitionerDialogProps>) {
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setGivenName("");
    setFamilyName("");
    setError(null);
    setSaving(false);
  };

  useEffect(() => {
    if (open && target) {
      setGivenName(target.namePreset?.givenName ?? "");
      setFamilyName(target.namePreset?.familyName ?? "");
      setError(null);
    }
  }, [open, target]);

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      reset();
    }
  };

  const handleSubmit = async () => {
    if (!target) {
      return;
    }
    const g = givenName.trim();
    const f = familyName.trim();
    if (!g && !f) {
      setError(m.practitioner_create_error_name());
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const practitioner = await createPractitioner(organizationId, {
        givenName: g,
        familyName: f,
        birthDate: "",
      });
      const grantParams =
        target.type === "user"
          ? {
              organizationId,
              userId: target.userId,
              principalType: "PRACTITIONER" as const,
              principalId: practitioner.id,
            }
          : {
              organizationId,
              invitationId: target.invitationId,
              principalType: "PRACTITIONER" as const,
              principalId: practitioner.id,
            };
      await createPrincipalGrant(grantParams);
      toast.success(m.settings_member_practitioner_linked());
      handleOpenChange(false);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : m.settings_member_action_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.settings_make_practitioner_dialog_title()}</DialogTitle>
          <DialogDescription>{m.settings_make_practitioner_dialog_desc()}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel required>{m.practitioner_create_given_label()}</FieldLabel>
              <Input
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                autoComplete="given-name"
              />
            </Field>
            <Field>
              <FieldLabel required>{m.practitioner_create_family_label()}</FieldLabel>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                autoComplete="family-name"
              />
            </Field>
          </div>
        </FieldGroup>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            {m.common_cancel()}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={saving || !target}>
            {saving ? m.common_saving() : m.settings_make_practitioner_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

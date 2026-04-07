import { useState } from "react";
import { toast } from "sonner";

import { type InvitationRole, inviteUserToOrganization } from "@/features/org/api/org-api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { emailRequiredSchema } from "@/shared/utils/email-validation";

interface InviteMemberDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly onInvited: () => Promise<void>;
}

const INVITATION_ROLE_OPTIONS: Array<{ value: InvitationRole; label: () => string }> = [
  { value: "member", label: m.settings_invite_role_member },
  { value: "power_user", label: m.settings_invite_role_power_user },
];

export function InviteMemberDialog({
  open,
  onOpenChange,
  organizationId,
  onInvited,
}: Readonly<InviteMemberDialogProps>) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InvitationRole>("member");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const reset = () => {
    setInviteError(null);
    setEmail("");
    setInviteRole("member");
    setIsInviting(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      reset();
    }
  };

  const handleInvite = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const parsedEmail = emailRequiredSchema.safeParse(normalizedEmail);
    if (!parsedEmail.success) {
      setInviteError(parsedEmail.error.issues[0]?.message ?? m.validation_email_format());
      return;
    }

    setInviteError(null);
    setIsInviting(true);
    try {
      await inviteUserToOrganization({
        organizationId,
        email: normalizedEmail,
        role: inviteRole,
      });
      toast.success(m.settings_invite_success());
      handleOpenChange(false);
      await onInvited();
    } catch (error) {
      const message = error instanceof Error ? error.message : m.settings_invite_error();
      setInviteError(message);
      setIsInviting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.settings_invite_dialog_title()}</DialogTitle>
          <DialogDescription>{m.settings_invite_dialog_desc()}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>{m.settings_invite_email_label()}</FieldLabel>
            <Input
              type="email"
              placeholder={m.settings_invite_email_placeholder()}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </Field>

          <Field>
            <FieldLabel>{m.settings_invite_role_label()}</FieldLabel>
            <Select
              value={inviteRole}
              onValueChange={(value) => setInviteRole((value as InvitationRole | null) ?? "member")}
              items={INVITATION_ROLE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label(),
              }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={m.settings_invite_role_placeholder()} />
              </SelectTrigger>
              <SelectPositioner>
                <SelectContent>
                  {INVITATION_ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPositioner>
            </Select>
          </Field>
        </FieldGroup>

        {inviteError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {inviteError}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            {m.common_cancel()}
          </Button>
          <Button type="button" onClick={handleInvite} disabled={isInviting}>
            {isInviting ? m.common_saving() : m.settings_invite_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

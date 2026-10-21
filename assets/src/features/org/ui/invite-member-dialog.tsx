import { useState } from "react";

import {
  type InvitationLink,
  inviteUserToOrganization,
  inviteUserWithPrincipalGrants,
} from "@/features/org/api/org-api";
import { ORGANIZATION_MEMBER_ROLE_OPTIONS } from "@/features/org/constants/organization-member-role-options";
import { InvitationLinkResult } from "@/features/org/ui/invitation-link-result";
import { createPractitioner } from "@/features/practitioners/api/practitioners-api";
import * as m from "@/paraglide/messages";
import type { OrganizationUserRole } from "@/shared/types/schema-enums";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
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
  readonly organizationName: string;
  readonly onInvited: () => Promise<void>;
}

interface SentInvitation {
  email: string;
  boundToEmail: boolean;
  link: InvitationLink;
}

export function InviteMemberDialog({
  open,
  onOpenChange,
  organizationId,
  organizationName,
  onInvited,
}: Readonly<InviteMemberDialogProps>) {
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationUserRole>("MEMBER");
  const [inviteAsPractitioner, setInviteAsPractitioner] = useState(false);
  const [practitionerGivenName, setPractitionerGivenName] = useState("");
  const [practitionerFamilyName, setPractitionerFamilyName] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [sent, setSent] = useState<SentInvitation | null>(null);

  // Reset after the close animation so the link never outlives the dialog.
  const reset = () => {
    setInviteError(null);
    setEmail("");
    setInviteRole("MEMBER");
    setInviteAsPractitioner(false);
    setPractitionerGivenName("");
    setPractitionerFamilyName("");
    setIsInviting(false);
    setSent(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen && sent) {
      void onInvited();
    }
  };

  const handleInvite = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const parsedEmail = emailRequiredSchema.safeParse(normalizedEmail);
    if (!parsedEmail.success) {
      setInviteError(parsedEmail.error.issues[0]?.message ?? m.validation_email_format());
      return;
    }

    const givenName = practitionerGivenName.trim();
    const familyName = practitionerFamilyName.trim();
    if (inviteAsPractitioner && !givenName && !familyName) {
      setInviteError(m.practitioner_create_error_name());
      return;
    }

    setInviteError(null);
    setIsInviting(true);
    try {
      let link: InvitationLink;
      if (inviteAsPractitioner) {
        const practitioner = await createPractitioner(organizationId, {
          givenName,
          familyName,
          birthDate: "",
        });
        link = await inviteUserWithPrincipalGrants({
          organizationId,
          email: normalizedEmail,
          role: inviteRole,
          principalGrants: [{ principalType: "PRACTITIONER", principalId: practitioner.id }],
        });
      } else {
        link = await inviteUserToOrganization({
          organizationId,
          email: normalizedEmail,
          role: inviteRole,
        });
      }
      setSent({
        email: normalizedEmail,
        boundToEmail: inviteRole === "POWER_USER" || inviteAsPractitioner,
        link,
      });
      setIsInviting(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : m.settings_invite_error();
      setInviteError(message);
      setIsInviting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
      onOpenChangeComplete={(isOpen) => {
        if (!isOpen) {
          reset();
        }
      }}
    >
      <DialogContent data-testid="invite-member-dialog">
        {sent ? (
          <>
            <DialogHeader>
              <DialogTitle>{m.settings_invite_link_title()}</DialogTitle>
              <DialogDescription>
                {m.settings_invite_link_desc({ email: sent.email })}
              </DialogDescription>
            </DialogHeader>

            <InvitationLinkResult
              link={sent.link}
              email={sent.email}
              boundToEmail={sent.boundToEmail}
              organizationName={organizationName}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                data-testid="invite-member-close-button"
              >
                {m.common_close()}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{m.settings_invite_dialog_title()}</DialogTitle>
              <DialogDescription>{m.settings_invite_dialog_desc()}</DialogDescription>
            </DialogHeader>

            <FieldGroup>
              <Field>
                <FieldLabel>{m.settings_invite_email_label()}</FieldLabel>
                <Input
                  data-testid="invite-member-email-input"
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
                  onValueChange={(value) =>
                    setInviteRole((value ?? "MEMBER") as OrganizationUserRole)
                  }
                  items={ORGANIZATION_MEMBER_ROLE_OPTIONS.map((option) => ({
                    value: option.value,
                    label: option.label(),
                  }))}
                >
                  <SelectTrigger className="w-full" data-testid="invite-member-role-trigger">
                    <SelectValue placeholder={m.settings_invite_role_placeholder()} />
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectContent>
                      {ORGANIZATION_MEMBER_ROLE_OPTIONS.map((option) => (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          data-testid={`invite-member-role-option-${option.value.toLowerCase()}`}
                        >
                          {option.label()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPositioner>
                </Select>
              </Field>

              <Field>
                <div className="flex items-center gap-2 text-sm">
                  <Checkbox
                    data-testid="invite-member-practitioner-checkbox"
                    checked={inviteAsPractitioner}
                    onCheckedChange={(value) => setInviteAsPractitioner(Boolean(value))}
                  />
                  <span>{m.settings_invite_as_practitioner()}</span>
                </div>
              </Field>

              {inviteAsPractitioner ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field>
                    <FieldLabel required>{m.practitioner_create_given_label()}</FieldLabel>
                    <Input
                      data-testid="invite-member-practitioner-given-name-input"
                      value={practitionerGivenName}
                      onChange={(event) => setPractitionerGivenName(event.target.value)}
                      autoComplete="given-name"
                    />
                  </Field>
                  <Field>
                    <FieldLabel required>{m.practitioner_create_family_label()}</FieldLabel>
                    <Input
                      data-testid="invite-member-practitioner-family-name-input"
                      value={practitionerFamilyName}
                      onChange={(event) => setPractitionerFamilyName(event.target.value)}
                      autoComplete="family-name"
                    />
                  </Field>
                </div>
              ) : null}
            </FieldGroup>

            {inviteError ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {inviteError}
              </div>
            ) : null}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                {m.common_cancel()}
              </Button>
              <Button
                type="button"
                onClick={handleInvite}
                loading={isInviting}
                data-testid="invite-member-submit-button"
              >
                {isInviting ? m.common_saving() : m.settings_invite_submit()}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

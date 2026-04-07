import { useForm } from "@tanstack/react-form";
import { type QueryClient, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CONSECUTIVE_SPECIALS, NAME_PATTERN } from "@/features/customers/model/onboarding-schemas";
import {
  createPrincipalGrant,
  fetchOrganizationSettings,
  getOrgMemberEmailToUserIdMap,
  inviteUserWithPrincipalGrants,
  ORG_SETTINGS_QUERY_KEY,
} from "@/features/org/api/org-api";
import { createPractitioner } from "@/features/practitioners/api/practitioners-api";
import {
  practitionerCreateFormEmpty,
  practitionerCreateFormSchema,
} from "@/features/practitioners/model/practitioner-create-form-schema";
import * as m from "@/paraglide/messages";
import { Button } from "@/shared/ui/button";
import { DatePickerString } from "@/shared/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { emailOptionalSchema } from "@/shared/utils/email-validation";

interface CreatePractitionerDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
}

type InviteFollowUp = "none" | "linked" | "invite";

async function resolveOrgMemberMap(
  queryClient: QueryClient,
  organizationId: string,
  inviteEmail: string,
  fallback: Map<string, string>,
): Promise<Map<string, string>> {
  if (!inviteEmail) {
    return fallback;
  }
  const fresh = await queryClient.ensureQueryData({
    queryKey: [...ORG_SETTINGS_QUERY_KEY, organizationId],
    queryFn: () => fetchOrganizationSettings(organizationId),
  });
  return fresh ? getOrgMemberEmailToUserIdMap(fresh) : fallback;
}

async function linkOrInviteByEmail(params: {
  organizationId: string;
  inviteEmail: string;
  practitionerId: string;
  memberMap: Map<string, string>;
}): Promise<Exclude<InviteFollowUp, "none">> {
  const userId = params.memberMap.get(params.inviteEmail);
  if (userId) {
    await createPrincipalGrant({
      organizationId: params.organizationId,
      userId,
      principalType: "PRACTITIONER",
      principalId: params.practitionerId,
    });
    return "linked";
  }
  await inviteUserWithPrincipalGrants({
    organizationId: params.organizationId,
    email: params.inviteEmail,
    principalGrants: [{ principalType: "PRACTITIONER", principalId: params.practitionerId }],
  });
  return "invite";
}

function toastAfterPractitionerCreate(followUp: InviteFollowUp) {
  if (followUp === "linked") {
    toast.success(m.practitioner_create_success_linked());
    return;
  }
  if (followUp === "invite") {
    toast.success(m.practitioner_create_success_invite());
    return;
  }
  toast.success(m.practitioner_create_success());
}

export function CreatePractitionerDialog({
  open,
  onOpenChange,
  organizationId,
}: CreatePractitionerDialogProps) {
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: orgSettings } = useQuery({
    queryKey: [...ORG_SETTINGS_QUERY_KEY, organizationId],
    queryFn: () => fetchOrganizationSettings(organizationId),
    enabled: open && Boolean(organizationId),
  });

  const memberByEmail = useMemo(
    () => (orgSettings ? getOrgMemberEmailToUserIdMap(orgSettings) : new Map<string, string>()),
    [orgSettings],
  );

  const form = useForm({
    defaultValues: practitionerCreateFormEmpty,
    validators: { onSubmit: practitionerCreateFormSchema },
    onSubmit: async ({ value }) => {
      setFormError(null);
      setIsSaving(true);
      try {
        const inviteEmail = value.email.trim().toLowerCase();
        const memberMap = await resolveOrgMemberMap(
          queryClient,
          organizationId,
          inviteEmail,
          memberByEmail,
        );
        const practitioner = await createPractitioner(organizationId, {
          givenName: value.givenName.trim(),
          familyName: value.familyName.trim(),
          birthDate: value.birthDate.trim(),
        });
        let followUp: InviteFollowUp = "none";
        if (inviteEmail) {
          followUp = await linkOrInviteByEmail({
            organizationId,
            inviteEmail,
            practitionerId: practitioner.id,
            memberMap,
          });
        }
        toastAfterPractitionerCreate(followUp);
        await queryClient.invalidateQueries({ queryKey: ["practitioners", organizationId] });
        await queryClient.invalidateQueries({
          queryKey: [...ORG_SETTINGS_QUERY_KEY, organizationId],
        });
        form.reset();
        onOpenChange(false);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : m.practitioner_create_error_generic();
        setFormError(message);
      } finally {
        setIsSaving(false);
      }
    },
  });

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    form.reset();
    setFormError(null);
    if (!nextOpen) {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.practitioner_create_dialog_title()}</DialogTitle>
          <DialogDescription>{m.practitioner_create_dialog_desc()}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <form.Field
              name="givenName"
              validators={{
                onBlur: ({ value }) => {
                  if (!value || value.trim().length < 2) {
                    return m.validation_given_name_min();
                  }
                  if (!NAME_PATTERN.test(value)) {
                    return m.validation_given_name_format();
                  }
                  if (CONSECUTIVE_SPECIALS.test(value)) {
                    return m.validation_given_name_consecutive();
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel required>{m.practitioner_create_given_label()}</FieldLabel>
                  <Input
                    maxLength={50}
                    value={field.state.value}
                    onChange={(e) => {
                      let filtered = e.target.value.replaceAll(/[^\p{L}\s'.-]/gu, "");
                      filtered = filtered.replaceAll(/([\s'.-])([\s'.-]+)/gu, "$1");
                      filtered = filtered.replace(/^[\s'.-]+/, "");
                      filtered = filtered.slice(0, 50);
                      field.handleChange(filtered);
                    }}
                    onBlur={() => {
                      const trimmed = field.state.value.replace(/[\s'.-]+$/, "").trim();
                      if (trimmed !== field.state.value) {
                        field.handleChange(trimmed);
                      }
                      field.handleBlur();
                    }}
                    autoComplete="given-name"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <FieldError
                      errors={field.state.meta.errors.map((e) =>
                        typeof e === "string" ? { message: e } : e,
                      )}
                    />
                  ) : null}
                </Field>
              )}
            </form.Field>

            <form.Field
              name="familyName"
              validators={{
                onBlur: ({ value }) => {
                  if (!value || value.trim().length < 2) {
                    return m.validation_family_name_min();
                  }
                  if (!NAME_PATTERN.test(value)) {
                    return m.validation_family_name_format();
                  }
                  if (CONSECUTIVE_SPECIALS.test(value)) {
                    return m.validation_family_name_consecutive();
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel required>{m.practitioner_create_family_label()}</FieldLabel>
                  <Input
                    maxLength={50}
                    value={field.state.value}
                    onChange={(e) => {
                      let filtered = e.target.value.replaceAll(/[^\p{L}\s'.-]/gu, "");
                      filtered = filtered.replaceAll(/([\s'.-])([\s'.-]+)/gu, "$1");
                      filtered = filtered.replace(/^[\s'.-]+/, "");
                      filtered = filtered.slice(0, 50);
                      field.handleChange(filtered);
                    }}
                    onBlur={() => {
                      const trimmed = field.state.value.replace(/[\s'.-]+$/, "").trim();
                      if (trimmed !== field.state.value) {
                        field.handleChange(trimmed);
                      }
                      field.handleBlur();
                    }}
                    autoComplete="family-name"
                    aria-invalid={field.state.meta.errors.length > 0}
                  />
                  {field.state.meta.errors.length > 0 ? (
                    <FieldError
                      errors={field.state.meta.errors.map((e) =>
                        typeof e === "string" ? { message: e } : e,
                      )}
                    />
                  ) : null}
                </Field>
              )}
            </form.Field>
          </div>

          <form.Field name="birthDate">
            {(field) => (
              <Field>
                <FieldLabel>{m.practitioner_create_birth_label()}</FieldLabel>
                <DatePickerString
                  value={field.state.value}
                  onChange={(v) => field.handleChange(v)}
                />
              </Field>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onBlur: ({ value }) => {
                const parsed = emailOptionalSchema.safeParse(value ?? "");
                if (!parsed.success) {
                  return m.validation_email_format();
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel>{m.practitioner_create_email_label()}</FieldLabel>
                <Input
                  type="email"
                  value={field.state.value}
                  placeholder={m.practitioner_create_email_placeholder()}
                  onChange={(e) => {
                    const filtered = e.target.value.replaceAll(/[^a-zA-Z0-9.@_+-]/g, "");
                    field.handleChange(filtered);
                  }}
                  onBlur={field.handleBlur}
                  autoComplete="email"
                  aria-invalid={field.state.meta.errors.length > 0}
                />
                {field.state.meta.errors.length > 0 ? (
                  <FieldError
                    errors={field.state.meta.errors.map((e) =>
                      typeof e === "string" ? { message: e } : e,
                    )}
                  />
                ) : null}
              </Field>
            )}
          </form.Field>
        </FieldGroup>

        {formError ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {formError}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
            {m.common_cancel()}
          </Button>
          <Button type="button" onClick={() => void form.handleSubmit()} disabled={isSaving}>
            {isSaving ? m.common_saving() : m.practitioner_create_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

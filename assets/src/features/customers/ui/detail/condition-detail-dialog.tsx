import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  type ConditionFormInput,
  type ConditionItem,
  updateCondition,
} from "@/features/customers/api/condition-api";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { DatePickerString } from "@/shared/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { isoToDateInput } from "@/shared/utils/date-time-input";

import { RecordDetailDialogFooter } from "./record-detail-dialog-footer";

// ─── Types ───────────────────────────────────────────────────────────

type ClinicalStatus = "ACTIVE" | "INACTIVE" | "REMISSION" | "RESOLVED";
type VerificationStatus = ConditionFormInput["verificationStatus"];

const ABATED_STATUSES: readonly ClinicalStatus[] = ["INACTIVE", "REMISSION", "RESOLVED"];
const CLINICAL_STATUSES: readonly ClinicalStatus[] = [
  "ACTIVE",
  "INACTIVE",
  "REMISSION",
  "RESOLVED",
];
const VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  "CONFIRMED",
  "DIFFERENTIAL",
  "PROVISIONAL",
  "UNCONFIRMED",
  "ENTERED_IN_ERROR",
  "REFUTED",
];
const EDITABLE_VERIFICATION_STATUSES: readonly VerificationStatus[] = [
  "CONFIRMED",
  "PROVISIONAL",
  "DIFFERENTIAL",
  "UNCONFIRMED",
];

interface ConditionDetailDialogProps {
  readonly mode: "edit";
  readonly item?: ConditionItem;
  readonly personId: string;
  readonly organizationId: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onRemoveClick?: () => void;
}

// ─── Form values ─────────────────────────────────────────────────────

interface ConditionFormValues {
  name: string;
  clinicalStatus: ClinicalStatus;
  verificationStatus: VerificationStatus;
  onsetDate: string;
  abatementDate: string;
}

function itemToFormValues(item: ConditionItem): ConditionFormValues {
  const clinical = (item.clinicalStatus ?? "ACTIVE") as ClinicalStatus;
  const safeClinical: ClinicalStatus = CLINICAL_STATUSES.includes(clinical) ? clinical : "ACTIVE";

  const verification = item.verificationStatus as VerificationStatus | null | undefined;
  let safeVerification: VerificationStatus = "CONFIRMED";
  if (verification && VERIFICATION_STATUSES.includes(verification)) {
    safeVerification = verification;
  } else if (verification) {
    safeVerification = "UNCONFIRMED";
  }

  return {
    name: item.code?.text ?? item.code?.coding?.[0]?.display ?? "",
    clinicalStatus: safeClinical,
    verificationStatus: safeVerification,
    onsetDate: isoToDateInput(item.onsetDateTime),
    abatementDate: isoToDateInput(item.abatementDateTime),
  };
}

function isRemovedVerificationStatus(status: VerificationStatus): boolean {
  return status === "ENTERED_IN_ERROR" || status === "REFUTED";
}

function verificationLabel(status: VerificationStatus): string {
  switch (status) {
    case "CONFIRMED":
      return m.fhir_verification_confirmed();
    case "PROVISIONAL":
      return m.fhir_verification_provisional();
    case "DIFFERENTIAL":
      return m.fhir_verification_differential();
    case "UNCONFIRMED":
      return m.fhir_verification_unconfirmed();
    case "ENTERED_IN_ERROR":
      return m.fhir_verification_entered_in_error();
    case "REFUTED":
      return m.fhir_verification_refuted();
  }
}

function verificationDescription(status: VerificationStatus): string {
  switch (status) {
    case "CONFIRMED":
      return m.condition_verification_confirmed_desc();
    case "PROVISIONAL":
      return m.condition_verification_provisional_desc();
    case "DIFFERENTIAL":
      return m.condition_verification_differential_desc();
    case "UNCONFIRMED":
      return m.condition_verification_unconfirmed_desc();
    case "ENTERED_IN_ERROR":
      return m.condition_remove_reason_error_desc();
    case "REFUTED":
      return m.condition_remove_reason_refuted_desc();
  }
}

const EMPTY_VALUES: ConditionFormValues = {
  name: "",
  clinicalStatus: "ACTIVE",
  verificationStatus: "CONFIRMED",
  onsetDate: "",
  abatementDate: "",
};

function toApiInput(values: ConditionFormValues): ConditionFormInput {
  return {
    name: values.name.trim(),
    clinicalStatus: values.clinicalStatus,
    verificationStatus: values.verificationStatus,
    onsetDate: values.onsetDate,
    abatementDate: values.abatementDate,
  };
}

// ─── Component ───────────────────────────────────────────────────────

export function ConditionDetailDialog({
  item,
  personId,
  organizationId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onRemoveClick,
}: ConditionDetailDialogProps) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();
  const orgId = organizationId || selectedOrg?.id || "";
  const readOnly = item
    ? isRemovedVerificationStatus(itemToFormValues(item).verificationStatus)
    : false;

  const form = useForm({
    defaultValues: (item ? itemToFormValues(item) : EMPTY_VALUES) as ConditionFormValues,
    onSubmit: async ({ value }) => {
      if (!value.name.trim() || !item) {
        return;
      }

      setSaving(true);
      try {
        await updateCondition(item.id, toApiInput(value), orgId);
        toast.success(m.condition_edit_success());
        await invalidatePersonDetail(queryClient, personId);
        setOpen(false);
        form.reset();
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  const title = m.condition_edit_title({ name: item?.code?.text ?? "" });
  const submitLabel = saving ? m.common_saving() : m.common_save();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{m.condition_edit_desc()}</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {/* Name */}
          <form.Field
            name="name"
            validators={{ onSubmit: ({ value }) => (!value.trim() ? "Required" : undefined) }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel required>{m.condition_field_name()}</FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={m.condition_field_name_placeholder()}
                  disabled={saving || readOnly}
                  autoFocus
                />
              </Field>
            )}
          </form.Field>

          {/* Clinical status */}
          <form.Field name="clinicalStatus">
            {(field) => (
              <Field>
                <FieldLabel>{m.common_clinical_status()}</FieldLabel>
                <FieldDescription>{m.condition_field_clinical_status_desc()}</FieldDescription>
                <div className="flex flex-col gap-2">
                  <ToggleGroup
                    value={field.state.value}
                    onValueChange={(v) => v && field.handleChange(v as ClinicalStatus)}
                    disabled={saving || readOnly}
                  >
                    <ToggleGroupItem value="ACTIVE">{m.fhir_clinical_active()}</ToggleGroupItem>
                    <ToggleGroupItem value="REMISSION">
                      {m.fhir_clinical_remission()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="INACTIVE">{m.fhir_clinical_inactive()}</ToggleGroupItem>
                    <ToggleGroupItem value="RESOLVED">{m.fhir_clinical_resolved()}</ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription>
                    {field.state.value === "ACTIVE" && m.condition_clinical_active_desc()}
                    {field.state.value === "REMISSION" && m.condition_clinical_remission_desc()}
                    {field.state.value === "INACTIVE" && m.condition_clinical_inactive_desc()}
                    {field.state.value === "RESOLVED" && m.condition_clinical_resolved_desc()}
                  </FieldDescription>
                </div>
              </Field>
            )}
          </form.Field>

          {/* Verification status */}
          <form.Field name="verificationStatus">
            {(field) => (
              <Field>
                <FieldLabel>{m.common_verification_status()}</FieldLabel>
                <FieldDescription>{m.condition_field_verification_status_desc()}</FieldDescription>
                <div className="flex flex-col gap-2">
                  <ToggleGroup
                    value={field.state.value}
                    onValueChange={(v) => v && field.handleChange(v as VerificationStatus)}
                    disabled={saving || readOnly}
                  >
                    {EDITABLE_VERIFICATION_STATUSES.map((status) => (
                      <ToggleGroupItem key={status} value={status}>
                        {verificationLabel(status)}
                      </ToggleGroupItem>
                    ))}
                    {isRemovedVerificationStatus(field.state.value) ? (
                      <ToggleGroupItem value={field.state.value} disabled>
                        {verificationLabel(field.state.value)}
                      </ToggleGroupItem>
                    ) : null}
                  </ToggleGroup>
                  <FieldDescription>{verificationDescription(field.state.value)}</FieldDescription>
                </div>
              </Field>
            )}
          </form.Field>

          {/* Onset date */}
          <form.Field name="onsetDate">
            {(field) => (
              <Field>
                <FieldLabel>{m.condition_field_onset()}</FieldLabel>
                <FieldDescription>{m.condition_field_onset_subtitle()}</FieldDescription>
                <DatePickerString
                  value={field.state.value}
                  onChange={field.handleChange}
                  disabled={saving || readOnly}
                  endMonth={new Date()}
                />
              </Field>
            )}
          </form.Field>

          {/* Abatement date — shown only when status implies the condition has ended. */}
          <form.Subscribe selector={(s) => s.values.clinicalStatus}>
            {(clinicalStatus) =>
              ABATED_STATUSES.includes(clinicalStatus) ? (
                <form.Field name="abatementDate">
                  {(field) => (
                    <Field>
                      <FieldLabel>{m.condition_field_abatement()}</FieldLabel>
                      <FieldDescription>{m.condition_field_abatement_subtitle()}</FieldDescription>
                      <DatePickerString
                        value={field.state.value}
                        onChange={field.handleChange}
                        disabled={saving || readOnly}
                        endMonth={new Date()}
                      />
                    </Field>
                  )}
                </form.Field>
              ) : null
            }
          </form.Subscribe>
        </FieldGroup>

        <RecordDetailDialogFooter
          cancelLabel={m.common_cancel()}
          onCancel={() => setOpen(false)}
          removeLabel={m.common_remove()}
          onRemoveClick={readOnly ? undefined : onRemoveClick}
          submitLabel={readOnly ? undefined : submitLabel}
          onSubmit={readOnly ? undefined : () => form.handleSubmit()}
          saving={saving}
        />
      </DialogContent>
    </Dialog>
  );
}

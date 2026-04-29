import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  type ConditionFormInput,
  type ConditionItem,
  updateCondition,
} from "@/features/customers/api/condition-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { personQueryKeys } from "@/shared/utils/query-keys";

// ─── Types ───────────────────────────────────────────────────────────

type ClinicalStatus = "ACTIVE" | "INACTIVE" | "REMISSION" | "RESOLVED";
type VerificationStatus = "CONFIRMED" | "DIFFERENTIAL" | "PROVISIONAL" | "UNCONFIRMED";

const ABATED_STATUSES: readonly ClinicalStatus[] = ["INACTIVE", "REMISSION", "RESOLVED"];

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
  recordedDate: string;
}

function isoToDateInput(value: string | null | undefined): string {
  return value ? String(value).slice(0, 10) : "";
}

function itemToFormValues(item: ConditionItem): ConditionFormValues {
  const clinical = (item.clinicalStatus ?? "ACTIVE") as ClinicalStatus;
  // Map deprecated statuses we don't expose in the toggle to ACTIVE.
  const safeClinical: ClinicalStatus = ["ACTIVE", "INACTIVE", "REMISSION", "RESOLVED"].includes(
    clinical,
  )
    ? clinical
    : "ACTIVE";

  const verification = (item.verificationStatus ?? "CONFIRMED") as VerificationStatus;
  const safeVerification: VerificationStatus = [
    "CONFIRMED",
    "DIFFERENTIAL",
    "PROVISIONAL",
    "UNCONFIRMED",
  ].includes(verification)
    ? verification
    : "CONFIRMED";

  return {
    name: item.code?.text ?? item.code?.coding?.[0]?.display ?? "",
    clinicalStatus: safeClinical,
    verificationStatus: safeVerification,
    onsetDate: isoToDateInput(item.onsetDateTime),
    abatementDate: isoToDateInput(item.abatementDateTime),
    recordedDate: isoToDateInput(item.recordedDate),
  };
}

const EMPTY_VALUES: ConditionFormValues = {
  name: "",
  clinicalStatus: "ACTIVE",
  verificationStatus: "CONFIRMED",
  onsetDate: "",
  abatementDate: "",
  recordedDate: "",
};

function toApiInput(values: ConditionFormValues): ConditionFormInput {
  return {
    name: values.name.trim(),
    clinicalStatus: values.clinicalStatus,
    verificationStatus: values.verificationStatus,
    onsetDate: values.onsetDate,
    abatementDate: values.abatementDate,
    recordedDate: values.recordedDate,
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
        await queryClient.invalidateQueries({
          queryKey: personQueryKeys.conditionsScope(personId),
        });
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
  const submitLabel = saving ? m.common_saving() : m.condition_dialog_submit();

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
                  disabled={saving}
                  autoFocus
                />
              </Field>
            )}
          </form.Field>

          {/* Clinical status */}
          <form.Field name="clinicalStatus">
            {(field) => (
              <Field>
                <FieldLabel>{m.condition_field_clinical_status()}</FieldLabel>
                <FieldDescription>{m.condition_field_clinical_status_desc()}</FieldDescription>
                <div className="space-y-2">
                  <ToggleGroup
                    value={field.state.value}
                    onValueChange={(v) => v && field.handleChange(v as ClinicalStatus)}
                    disabled={saving}
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
                <FieldLabel>{m.condition_field_verification_status()}</FieldLabel>
                <FieldDescription>{m.condition_field_verification_status_desc()}</FieldDescription>
                <div className="space-y-2">
                  <ToggleGroup
                    value={field.state.value}
                    onValueChange={(v) => v && field.handleChange(v as VerificationStatus)}
                    disabled={saving}
                  >
                    <ToggleGroupItem value="CONFIRMED">
                      {m.fhir_verification_confirmed()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="PROVISIONAL">
                      {m.fhir_verification_provisional()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="DIFFERENTIAL">
                      {m.fhir_verification_differential()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="UNCONFIRMED">
                      {m.fhir_verification_unconfirmed()}
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription>
                    {field.state.value === "CONFIRMED" && m.condition_verification_confirmed_desc()}
                    {field.state.value === "PROVISIONAL" &&
                      m.condition_verification_provisional_desc()}
                    {field.state.value === "DIFFERENTIAL" &&
                      m.condition_verification_differential_desc()}
                    {field.state.value === "UNCONFIRMED" &&
                      m.condition_verification_unconfirmed_desc()}
                  </FieldDescription>
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
                  disabled={saving}
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
                        disabled={saving}
                        endMonth={new Date()}
                      />
                    </Field>
                  )}
                </form.Field>
              ) : null
            }
          </form.Subscribe>

          {/* Recorded date */}
          <form.Field name="recordedDate">
            {(field) => (
              <Field>
                <FieldLabel>{m.condition_field_recorded()}</FieldLabel>
                <FieldDescription>{m.condition_field_recorded_subtitle()}</FieldDescription>
                <DatePickerString
                  value={field.state.value}
                  onChange={field.handleChange}
                  disabled={saving}
                  endMonth={new Date()}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {onRemoveClick ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={onRemoveClick}
              disabled={saving}
              type="button"
            >
              {m.condition_remove_btn()}
            </Button>
          ) : null}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
              type="button"
            >
              {m.common_cancel()}
            </Button>
            <Button onClick={() => form.handleSubmit()} loading={saving} type="button">
              {submitLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  createPrescription,
  type MedicationRequestCourseOfTherapy,
  type MedicationRequestItem,
  type MedicationRequestStatus,
  type PrescriptionFormInput,
  SUBSTITUTION_CODES,
  type SubstitutionChoice,
  type SubstitutionCode,
  updatePrescription,
} from "@/features/customers/api/medication-requests-api";
import {
  formatFhirCourseOfTherapyLabel,
  formatFhirMedicationRequestStatusLabel,
  formatFhirSubstitutionLabel,
} from "@/features/customers/utils/clinical-history-display";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { useOrg } from "@/shared/session/use-org";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";

// ─── Types ───────────────────────────────────────────────────────────

interface PrescriptionDetailDialogProps {
  readonly mode: "create" | "edit";
  readonly item?: MedicationRequestItem;
  readonly personId: string;
  readonly patientId?: string | null;
  readonly organizationId: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onRemoveClick?: () => void;
}

/** Statuses a practitioner can set from the UI. */
const STATUS_OPTIONS: readonly MedicationRequestStatus[] = [
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "STOPPED",
  "CANCELLED",
];

/** Course-of-therapy values, with a sentinel for "not specified". */
const COURSE_NONE = "NONE";
const COURSE_OPTIONS: readonly MedicationRequestCourseOfTherapy[] = [
  "CONTINUOUS",
  "ACUTE",
  "SEASONAL",
];

/** Sentinel for the "not specified" option (distinct from the "N" = none code). */
const SUBSTITUTION_UNSET = "UNSET";

// ─── Helpers ─────────────────────────────────────────────────────────

function nameOf(item: MedicationRequestItem): string {
  return item.medication?.text ?? item.medication?.coding?.[0]?.display ?? "";
}

function substitutionToChoice(item: MedicationRequestItem): SubstitutionChoice {
  const code = item.substitution?.allowedCodeableConcept?.coding?.[0]?.code;
  return code && (SUBSTITUTION_CODES as readonly string[]).includes(code)
    ? (code as SubstitutionCode)
    : "";
}

function itemToFormValues(item: MedicationRequestItem): PrescriptionFormInput {
  const refills = item.dispenseRequest?.numberOfRepeatsAllowed;
  return {
    name: nameOf(item),
    status: (item.status ?? "ACTIVE") as MedicationRequestStatus,
    courseOfTherapy: item.courseOfTherapyType ?? "",
    dosageText: item.dosageInstruction?.[0]?.text ?? "",
    refills: refills == null ? "" : String(refills),
    substitution: substitutionToChoice(item),
    note: item.note?.[0]?.text ?? "",
  };
}

const EMPTY_VALUES: PrescriptionFormInput = {
  name: "",
  status: "ACTIVE",
  courseOfTherapy: "",
  dosageText: "",
  refills: "",
  substitution: "",
  note: "",
};

// ─── Component ───────────────────────────────────────────────────────

export function PrescriptionDetailDialog({
  mode,
  item,
  personId,
  patientId,
  organizationId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onRemoveClick,
}: PrescriptionDetailDialogProps) {
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
    defaultValues: mode === "edit" && item ? itemToFormValues(item) : EMPTY_VALUES,
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) {
        return;
      }

      setSaving(true);
      try {
        const input = { ...value, name: value.name.trim() };
        if (mode === "create") {
          if (!patientId) {
            toast.error(m.onboarding_error());
            return;
          }
          await createPrescription(input, patientId, orgId);
          toast.success(m.prescription_add_success());
        } else if (item) {
          await updatePrescription(item, input, orgId);
          toast.success(m.prescription_edit_success());
        }
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

  const title =
    mode === "create"
      ? m.prescription_dialog_title()
      : m.prescription_edit_title({ name: item ? nameOf(item) : "" });
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description={
        mode === "create" ? m.add_record_prescription_desc() : m.prescription_edit_desc()
      }
      contentClassName="sm:max-w-md"
      onDelete={mode === "edit" ? onRemoveClick : undefined}
      onSubmit={() => form.handleSubmit()}
      saving={saving}
    >
      <FieldGroup>
        {/* Name */}
        <form.Field
          name="name"
          validators={{
            onSubmit: ({ value }) => (!value.trim() ? m.validation_required() : undefined),
          }}
        >
          {(field) => (
            <Field data-invalid={field.state.meta.errors.length > 0}>
              <FieldLabel required>{m.prescription_field_name()}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={m.prescription_field_name_placeholder()}
                disabled={saving}
                autoFocus
              />
            </Field>
          )}
        </form.Field>

        {/* Status */}
        <form.Field name="status">
          {(field) => (
            <Field>
              <FieldLabel>{m.prescription_field_status()}</FieldLabel>
              <Select
                value={field.state.value}
                onValueChange={(value) =>
                  value && field.handleChange(value as MedicationRequestStatus)
                }
                disabled={saving}
                items={STATUS_OPTIONS.map((value) => ({
                  value,
                  label: formatFhirMedicationRequestStatusLabel(value),
                }))}
              >
                <SelectTrigger className="w-full" disabled={saving}>
                  <SelectValue />
                </SelectTrigger>
                <SelectPositioner>
                  <SelectContent>
                    {STATUS_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {formatFhirMedicationRequestStatusLabel(value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectPositioner>
              </Select>
            </Field>
          )}
        </form.Field>

        {/* Course of therapy */}
        <form.Field name="courseOfTherapy">
          {(field) => {
            const value = field.state.value || COURSE_NONE;
            return (
              <Field>
                <FieldLabel>{m.prescription_field_course()}</FieldLabel>
                <Select
                  value={value}
                  onValueChange={(next) =>
                    field.handleChange(
                      next === COURSE_NONE ? "" : (next as MedicationRequestCourseOfTherapy),
                    )
                  }
                  disabled={saving}
                  items={[
                    { value: COURSE_NONE, label: m.prescription_field_course_none() },
                    ...COURSE_OPTIONS.map((v) => ({
                      value: v,
                      label: formatFhirCourseOfTherapyLabel(v),
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full" disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectContent>
                      <SelectItem value={COURSE_NONE}>
                        {m.prescription_field_course_none()}
                      </SelectItem>
                      {COURSE_OPTIONS.map((v) => (
                        <SelectItem key={v} value={v}>
                          {formatFhirCourseOfTherapyLabel(v)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPositioner>
                </Select>
              </Field>
            );
          }}
        </form.Field>

        {/* Dosage instructions */}
        <form.Field name="dosageText">
          {(field) => (
            <Field>
              <FieldLabel>{m.prescription_field_dosage()}</FieldLabel>
              <Textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={m.prescription_field_dosage_placeholder()}
                disabled={saving}
                rows={2}
              />
            </Field>
          )}
        </form.Field>

        {/* Refills */}
        <form.Field name="refills">
          {(field) => (
            <Field>
              <FieldLabel>{m.prescription_field_refills()}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder={m.prescription_field_refills_placeholder()}
                inputMode="numeric"
                disabled={saving}
              />
            </Field>
          )}
        </form.Field>

        {/* Substitution */}
        <form.Field name="substitution">
          {(field) => {
            const value = field.state.value || SUBSTITUTION_UNSET;
            return (
              <Field>
                <FieldLabel>{m.prescription_field_substitution()}</FieldLabel>
                <Select
                  value={value}
                  onValueChange={(next) =>
                    field.handleChange(
                      next === SUBSTITUTION_UNSET ? "" : (next as SubstitutionChoice),
                    )
                  }
                  disabled={saving}
                  items={[
                    { value: SUBSTITUTION_UNSET, label: m.prescription_field_course_none() },
                    ...SUBSTITUTION_CODES.map((code) => ({
                      value: code,
                      label: formatFhirSubstitutionLabel(code),
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full" disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPositioner>
                    <SelectContent>
                      <SelectItem value={SUBSTITUTION_UNSET}>
                        {m.prescription_field_course_none()}
                      </SelectItem>
                      {SUBSTITUTION_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {formatFhirSubstitutionLabel(code)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectPositioner>
                </Select>
              </Field>
            );
          }}
        </form.Field>

        {/* Note */}
        <form.Field name="note">
          {(field) => (
            <Field>
              <FieldLabel>{m.prescription_field_note()}</FieldLabel>
              <Textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={m.prescription_field_note_placeholder()}
                disabled={saving}
                rows={3}
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </FormDialog>
  );
}

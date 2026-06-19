import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  type MedicationRequestItem,
  type MedicationRequestStatus,
  type PrescriptionFormInput,
  updatePrescription,
} from "@/features/customers/api/medication-requests-api";
import { formatFhirMedicationRequestStatusLabel } from "@/features/customers/utils/clinical-history-display";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
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
  readonly item?: MedicationRequestItem;
  readonly personId: string;
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

// ─── Helpers ─────────────────────────────────────────────────────────

function nameOf(item: MedicationRequestItem): string {
  return item.medication?.text ?? item.medication?.coding?.[0]?.display ?? "";
}

function itemToFormValues(item: MedicationRequestItem): PrescriptionFormInput {
  return {
    name: nameOf(item),
    status: (item.status ?? "ACTIVE") as MedicationRequestStatus,
    note: item.note?.[0]?.text ?? "",
  };
}

const EMPTY_VALUES: PrescriptionFormInput = {
  name: "",
  status: "ACTIVE",
  note: "",
};

// ─── Component ───────────────────────────────────────────────────────

export function PrescriptionDetailDialog({
  item,
  personId,
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
    defaultValues: item ? itemToFormValues(item) : EMPTY_VALUES,
    onSubmit: async ({ value }) => {
      if (!value.name.trim() || !item) {
        return;
      }

      setSaving(true);
      try {
        await updatePrescription(item.id, { ...value, name: value.name.trim() }, orgId);
        toast.success(m.prescription_edit_success());
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

  const title = m.prescription_edit_title({ name: item ? nameOf(item) : "" });
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description={m.prescription_edit_desc()}
      contentClassName="sm:max-w-md"
      onDelete={onRemoveClick}
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

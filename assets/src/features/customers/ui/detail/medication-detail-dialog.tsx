import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  type MedicationFormInput,
  type MedicationItem,
  updateMedication,
} from "@/features/customers/api/medications-api";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input } from "@/shared/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/shared/ui/toggle-group";
import { isoToDateInput } from "@/shared/utils/date-time-input";

// ─── Types ───────────────────────────────────────────────────────────

type Course = "current" | "past";

interface MedicationDetailDialogProps {
  readonly mode: "edit";
  readonly item?: MedicationItem;
  readonly personId: string;
  readonly organizationId: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onRemoveClick?: () => void;
}

interface MedicationFormValues {
  name: string;
  course: Course;
  startDate: string;
  endDate: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function nameOf(item: MedicationItem): string {
  return item.medication?.text ?? item.medication?.coding?.[0]?.display ?? "";
}

function itemToFormValues(item: MedicationItem): MedicationFormValues {
  const start =
    isoToDateInput(item.effectivePeriod?.start) || isoToDateInput(item.effectiveDateTime);
  const end = isoToDateInput(item.effectivePeriod?.end);
  const course: Course = end ? "past" : "current";

  return {
    name: nameOf(item),
    course,
    startDate: start,
    endDate: end,
  };
}

const EMPTY_VALUES: MedicationFormValues = {
  name: "",
  course: "current",
  startDate: "",
  endDate: "",
};

function toApiInput(values: MedicationFormValues): MedicationFormInput {
  return {
    name: values.name.trim(),
    course: values.course,
    startDate: values.startDate,
    endDate: values.endDate,
  };
}

// ─── Component ───────────────────────────────────────────────────────

export function MedicationDetailDialog({
  item,
  personId,
  organizationId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onRemoveClick,
}: MedicationDetailDialogProps) {
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
    defaultValues: (item ? itemToFormValues(item) : EMPTY_VALUES) as MedicationFormValues,
    onSubmit: async ({ value }) => {
      if (!value.name.trim() || !item) {
        return;
      }

      setSaving(true);
      try {
        await updateMedication(item.id, toApiInput(value), orgId);
        toast.success(m.medication_edit_success());
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

  const title = m.medication_edit_title({ name: item ? nameOf(item) : "" });
  return (
    <FormDialog
      open={open}
      onOpenChange={setOpen}
      title={title}
      description={m.medication_edit_desc()}
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
              <FieldLabel required>{m.medication_field_name()}</FieldLabel>
              <Input
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                placeholder={m.medication_field_name_placeholder()}
                disabled={saving}
                autoFocus
              />
            </Field>
          )}
        </form.Field>

        {/* Course */}
        <form.Field name="course">
          {(field) => (
            <Field>
              <FieldLabel>{m.medication_field_course()}</FieldLabel>
              <FieldDescription>{m.medication_field_course_subtitle()}</FieldDescription>
              <div className="flex flex-col gap-2">
                <ToggleGroup
                  value={field.state.value}
                  onValueChange={(v) => v && field.handleChange(v as Course)}
                  disabled={saving}
                >
                  <ToggleGroupItem value="current">{m.medication_usage_current()}</ToggleGroupItem>
                  <ToggleGroupItem value="past">{m.medication_usage_past()}</ToggleGroupItem>
                </ToggleGroup>
                <FieldDescription>
                  {field.state.value === "current" && m.medication_usage_current_desc()}
                  {field.state.value === "past" && m.medication_usage_past_desc()}
                </FieldDescription>
              </div>
            </Field>
          )}
        </form.Field>

        {/* Start date */}
        <form.Field name="startDate">
          {(field) => (
            <Field>
              <FieldLabel>{m.medication_field_start()}</FieldLabel>
              <FieldDescription>{m.medication_field_start_subtitle()}</FieldDescription>
              <DatePickerString
                value={field.state.value}
                onChange={field.handleChange}
                disabled={saving}
                endMonth={new Date()}
              />
            </Field>
          )}
        </form.Field>

        {/* End date — only for past use. */}
        <form.Subscribe selector={(s) => s.values.course}>
          {(course) =>
            course === "past" ? (
              <form.Field name="endDate">
                {(field) => (
                  <Field>
                    <FieldLabel>{m.medication_field_end()}</FieldLabel>
                    <FieldDescription>{m.medication_field_end_subtitle()}</FieldDescription>
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
      </FieldGroup>
    </FormDialog>
  );
}

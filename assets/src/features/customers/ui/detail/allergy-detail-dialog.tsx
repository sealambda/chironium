import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import type { AllergyIntoleranceItem } from "@/features/customers/api/allergy-intolerance-api";
import {
  type AllergyIntoleranceFormInput,
  createAllergyIntolerance,
  updateAllergyIntolerance,
} from "@/features/customers/api/allergy-intolerance-api";
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

interface AllergyDetailDialogProps {
  readonly mode: "create" | "edit";
  readonly item?: AllergyIntoleranceItem;
  readonly personId: string;
  readonly patientId: string | null;
  readonly organizationId: string;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onRemoveClick?: () => void;
}

// ─── Form values ─────────────────────────────────────────────────────

interface AllergyFormValues {
  name: string;
  type: "ALLERGY" | "INTOLERANCE";
  clinicalStatus: "ACTIVE" | "INACTIVE" | "RESOLVED";
  verificationStatus: "CONFIRMED" | "PRESUMED" | "UNCONFIRMED";
  onsetMode: "none" | "date" | "age" | "period";
  onsetDateTime: string;
  onsetAgeValue: string;
  onsetAgeUnit: "A";
  onsetPeriodStart: string;
  onsetPeriodEnd: string;
}

function itemToFormValues(item: AllergyIntoleranceItem): AllergyFormValues {
  let onsetMode: AllergyFormValues["onsetMode"] = "none";
  if (item.onsetDateTime) {
    onsetMode = "date";
  } else if (item.onsetAge?.value !== undefined && item.onsetAge?.value !== null) {
    onsetMode = "age";
  } else if (item.onsetPeriod) {
    onsetMode = "period";
  }

  return {
    name: item.code?.text ?? "",
    type: (item.type as AllergyFormValues["type"]) ?? "ALLERGY",
    clinicalStatus: (item.clinicalStatus as AllergyFormValues["clinicalStatus"]) ?? "ACTIVE",
    verificationStatus:
      (item.verificationStatus as AllergyFormValues["verificationStatus"]) ?? "CONFIRMED",
    onsetMode,
    onsetDateTime: item.onsetDateTime ? String(item.onsetDateTime).slice(0, 10) : "",
    onsetAgeValue: item.onsetAge?.value !== undefined ? String(item.onsetAge.value) : "",
    onsetAgeUnit: "A",
    onsetPeriodStart: item.onsetPeriod?.start ? String(item.onsetPeriod.start).slice(0, 10) : "",
    onsetPeriodEnd: item.onsetPeriod?.end ? String(item.onsetPeriod.end).slice(0, 10) : "",
  };
}

const EMPTY_VALUES: AllergyFormValues = {
  name: "",
  type: "ALLERGY",
  clinicalStatus: "ACTIVE",
  verificationStatus: "CONFIRMED",
  onsetMode: "none",
  onsetDateTime: "",
  onsetAgeValue: "",
  onsetAgeUnit: "A",
  onsetPeriodStart: "",
  onsetPeriodEnd: "",
};

function toApiInput(values: AllergyFormValues): AllergyIntoleranceFormInput {
  const {
    onsetMode,
    onsetDateTime,
    onsetAgeValue,
    onsetAgeUnit,
    onsetPeriodStart,
    onsetPeriodEnd,
  } = values;

  let onset: Partial<AllergyIntoleranceFormInput> = {};
  if (onsetMode === "date") {
    onset = { onsetDateTime: onsetDateTime || undefined };
  } else if (onsetMode === "age" && onsetAgeValue) {
    onset = { onsetAge: { value: onsetAgeValue, unit: onsetAgeUnit } };
  } else if (onsetMode === "period") {
    onset = {
      onsetPeriod: {
        start: onsetPeriodStart || undefined,
        end: onsetPeriodEnd || undefined,
      },
    };
  }

  return {
    type: values.type,
    name: values.name.trim(),
    clinicalStatus: values.clinicalStatus,
    verificationStatus: values.verificationStatus,
    onsetMode,
    ...onset,
  };
}

// ─── Component ───────────────────────────────────────────────────────

export function AllergyDetailDialog({
  mode,
  item,
  personId,
  patientId,
  organizationId,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  onRemoveClick,
}: AllergyDetailDialogProps) {
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
    defaultValues: (mode === "edit" && item
      ? itemToFormValues(item)
      : EMPTY_VALUES) as AllergyFormValues,
    onSubmit: async ({ value }) => {
      if (!value.name.trim()) {
        return;
      }

      setSaving(true);
      try {
        if (mode === "create") {
          if (!patientId) {
            toast.error(m.onboarding_error());
            return;
          }
          await createAllergyIntolerance(toApiInput(value), patientId, orgId);
          toast.success(m.allergy_intolerance_add_success());
        } else if (item) {
          await updateAllergyIntolerance(item.id, toApiInput(value), orgId);
          toast.success(m.allergy_intolerance_edit_success());
        }
        await queryClient.invalidateQueries({
          queryKey: personQueryKeys.allergyIntolerancesScope(personId),
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

  const title =
    mode === "create"
      ? m.allergy_intolerance_create_title()
      : m.allergy_intolerance_edit_title({ name: item?.code?.text ?? "" });

  let submitLabel: string;
  if (saving) {
    submitLabel = m.common_saving();
  } else if (mode === "create") {
    submitLabel = m.common_add();
  } else {
    submitLabel = m.allergy_intolerance_dialog_submit();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? m.allergy_intolerance_create_desc()
              : m.allergy_intolerance_edit_desc()}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          {/* Name */}
          <form.Field
            name="name"
            validators={{ onSubmit: ({ value }) => (!value.trim() ? "Required" : undefined) }}
          >
            {(field) => (
              <Field data-invalid={field.state.meta.errors.length > 0}>
                <FieldLabel required>{m.allergy_intolerance_field_name()}</FieldLabel>
                <Input
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder={m.allergy_intolerance_field_name_placeholder()}
                  disabled={saving}
                  autoFocus
                />
              </Field>
            )}
          </form.Field>

          {/* Type */}
          <form.Field name="type">
            {(field) => (
              <Field>
                <FieldLabel>{m.allergy_intolerance_field_type()}</FieldLabel>
                <FieldDescription>{m.allergy_intolerance_field_type_desc()}</FieldDescription>
                <div className="space-y-2">
                  <ToggleGroup
                    value={field.state.value}
                    onValueChange={(v) => field.handleChange(v as AllergyFormValues["type"])}
                    disabled={saving}
                  >
                    <ToggleGroupItem value="ALLERGY">
                      {m.allergy_intolerance_type_allergy()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="INTOLERANCE">
                      {m.allergy_intolerance_type_intolerance()}
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription>
                    {field.state.value === "ALLERGY" && m.allergy_intolerance_type_allergy_desc()}
                    {field.state.value === "INTOLERANCE" &&
                      m.allergy_intolerance_type_intolerance_desc()}
                  </FieldDescription>
                </div>
              </Field>
            )}
          </form.Field>

          {/* Clinical status */}
          <form.Field name="clinicalStatus">
            {(field) => (
              <Field>
                <FieldLabel>{m.allergy_intolerance_field_clinical_status()}</FieldLabel>
                <FieldDescription>
                  {m.allergy_intolerance_field_clinical_status_desc()}
                </FieldDescription>
                <div className="space-y-2">
                  <ToggleGroup
                    value={field.state.value}
                    onValueChange={(v) =>
                      field.handleChange(v as AllergyFormValues["clinicalStatus"])
                    }
                    disabled={saving}
                  >
                    <ToggleGroupItem value="ACTIVE">
                      {m.allergy_intolerance_clinical_active()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="INACTIVE">
                      {m.allergy_intolerance_clinical_inactive()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="RESOLVED">
                      {m.allergy_intolerance_clinical_resolved()}
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription>
                    {field.state.value === "ACTIVE" && m.allergy_intolerance_clinical_active_desc()}
                    {field.state.value === "INACTIVE" &&
                      m.allergy_intolerance_clinical_inactive_desc()}
                    {field.state.value === "RESOLVED" &&
                      m.allergy_intolerance_clinical_resolved_desc()}
                  </FieldDescription>
                </div>
              </Field>
            )}
          </form.Field>

          {/* Verification status */}
          <form.Field name="verificationStatus">
            {(field) => (
              <Field>
                <FieldLabel>{m.allergy_intolerance_field_verification_status()}</FieldLabel>
                <FieldDescription>
                  {m.allergy_intolerance_field_verification_status_desc()}
                </FieldDescription>
                <div className="space-y-2">
                  <ToggleGroup
                    value={field.state.value}
                    onValueChange={(v) =>
                      v && field.handleChange(v as AllergyFormValues["verificationStatus"])
                    }
                    disabled={saving}
                  >
                    <ToggleGroupItem value="CONFIRMED">
                      {m.allergy_intolerance_verification_confirmed()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="PRESUMED">
                      {m.allergy_intolerance_verification_presumed()}
                    </ToggleGroupItem>
                    <ToggleGroupItem value="UNCONFIRMED">
                      {m.allergy_intolerance_verification_unconfirmed()}
                    </ToggleGroupItem>
                  </ToggleGroup>
                  <FieldDescription>
                    {field.state.value === "CONFIRMED" &&
                      m.allergy_intolerance_verification_confirmed_desc()}
                    {field.state.value === "PRESUMED" &&
                      m.allergy_intolerance_verification_presumed_desc()}
                    {field.state.value === "UNCONFIRMED" &&
                      m.allergy_intolerance_verification_unconfirmed_desc()}
                  </FieldDescription>
                </div>
              </Field>
            )}
          </form.Field>

          {/* Onset mode selector */}
          <form.Subscribe selector={(s) => s.values.onsetMode}>
            {(onsetMode) => (
              <>
                <form.Field name="onsetMode">
                  {(field) => (
                    <Field>
                      <FieldLabel>{m.allergy_intolerance_field_onset()}</FieldLabel>
                      <FieldDescription>
                        {m.allergy_intolerance_field_onset_subtitle()}
                      </FieldDescription>
                      <div className="space-y-2">
                        <ToggleGroup
                          value={field.state.value}
                          onValueChange={(v) =>
                            field.handleChange(v as AllergyFormValues["onsetMode"])
                          }
                          disabled={saving}
                        >
                          <ToggleGroupItem value="none">
                            {m.allergy_intolerance_onset_none()}
                          </ToggleGroupItem>
                          <ToggleGroupItem value="date">
                            {m.allergy_intolerance_onset_date()}
                          </ToggleGroupItem>
                          <ToggleGroupItem value="age">
                            {m.allergy_intolerance_onset_age()}
                          </ToggleGroupItem>
                          <ToggleGroupItem value="period">
                            {m.allergy_intolerance_onset_period()}
                          </ToggleGroupItem>
                        </ToggleGroup>
                        <FieldDescription>
                          {onsetMode === "none" && m.allergy_intolerance_onset_none_desc()}
                          {onsetMode === "date" && m.allergy_intolerance_onset_date_desc()}
                          {onsetMode === "age" && m.allergy_intolerance_onset_age_desc()}
                          {onsetMode === "period" && m.allergy_intolerance_field_onset_desc()}
                        </FieldDescription>
                      </div>
                    </Field>
                  )}
                </form.Field>

                {onsetMode === "date" && (
                  <form.Field name="onsetDateTime">
                    {(field) => (
                      <Field>
                        <FieldLabel>{m.allergy_intolerance_onset_date()}</FieldLabel>
                        <DatePickerString
                          value={field.state.value}
                          onChange={field.handleChange}
                          disabled={saving}
                          endMonth={new Date()}
                        />
                      </Field>
                    )}
                  </form.Field>
                )}

                {onsetMode === "age" && (
                  <form.Field name="onsetAgeValue">
                    {(field) => (
                      <Field>
                        <FieldLabel>{m.allergy_intolerance_onset_age_value()}</FieldLabel>
                        <Input
                          type="number"
                          min="0"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          disabled={saving}
                        />
                      </Field>
                    )}
                  </form.Field>
                )}

                {onsetMode === "period" && (
                  <div className="grid grid-cols-2 gap-3">
                    <form.Field name="onsetPeriodStart">
                      {(field) => (
                        <Field>
                          <FieldLabel>{m.allergy_intolerance_onset_period_start()}</FieldLabel>
                          <DatePickerString
                            value={field.state.value}
                            onChange={field.handleChange}
                            disabled={saving}
                            endMonth={new Date()}
                          />
                        </Field>
                      )}
                    </form.Field>
                    <form.Field name="onsetPeriodEnd">
                      {(field) => (
                        <Field>
                          <FieldLabel>{m.allergy_intolerance_onset_period_end()}</FieldLabel>
                          <DatePickerString
                            value={field.state.value}
                            onChange={field.handleChange}
                            disabled={saving}
                          />
                        </Field>
                      )}
                    </form.Field>
                  </div>
                )}
              </>
            )}
          </form.Subscribe>
        </FieldGroup>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          {mode === "edit" && onRemoveClick ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive sm:mr-auto"
              onClick={onRemoveClick}
              disabled={saving}
              type="button"
            >
              {m.allergy_intolerance_remove_btn()}
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

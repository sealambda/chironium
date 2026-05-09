import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInDays, isValid, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  deleteObservation,
  logMenstrualCycle,
  type MenstrualCycleRecordFormData,
  type MenstrualCycleSummary,
  updateMenstrualCycle,
} from "@/features/customers/api/observations-api";
import { DeleteHistoryEntryDialog } from "@/features/customers/ui/detail/delete-history-entry-dialog";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { FormDialog } from "@/shared/ui/form-dialog";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { toDateInput, todayDateInput } from "@/shared/utils/date-time-input";

// ─── Props ────────────────────────────────────────────────────────────

interface AddMenstrualCycleDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly mode?: "create" | "edit";
  readonly initialCycle?: MenstrualCycleSummary | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

interface MenstrualCycleFormValues {
  startDate: string;
  durationDays: string;
  notes: string;
}

// ─── Pure helpers ─────────────────────────────────────────────────────

function initialDurationDays(cycle: MenstrualCycleSummary): string {
  if (cycle.durationDays != null) {
    return String(cycle.durationDays);
  }

  if (!cycle.startDate || !cycle.endDate) {
    return "";
  }

  const start = parseISO(cycle.startDate);
  const end = parseISO(cycle.endDate);
  if (!isValid(start) || !isValid(end)) {
    return "";
  }

  return String(differenceInDays(end, start) + 1);
}

function defaultValues(cycle?: MenstrualCycleSummary | null): MenstrualCycleFormValues {
  if (cycle) {
    return {
      startDate: cycle.startDate ?? todayDateInput(),
      durationDays: initialDurationDays(cycle),
      notes: cycle.notes ?? "",
    };
  }

  return {
    startDate: todayDateInput(),
    durationDays: "",
    notes: "",
  };
}

function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const durationDays = Number.parseInt(trimmed, 10);
  return Number.isFinite(durationDays) ? durationDays : null;
}

/** Compute end-date string (yyyy-MM-dd) from startDate + durationDays. */
function computeEndDateFromDuration(startDate: string, durationValue: string): string | null {
  const days = parseDurationInput(durationValue);
  if (!startDate || days == null || days < 1) {
    return null;
  }

  const parsed = parseISO(startDate);
  if (!isValid(parsed)) {
    return null;
  }

  return toDateInput(addDays(parsed, days - 1));
}

// ─── Validators ───────────────────────────────────────────────────────

function validateStartDate(value: string): string | undefined {
  return value.trim() ? undefined : m.validation_cycle_start_required();
}

function validateDurationDays(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const durationDays = parseDurationInput(trimmed);
  return /^\d+$/.test(trimmed) && durationDays != null && durationDays >= 1 && durationDays <= 30
    ? undefined
    : m.validation_cycle_duration_range();
}

/** Cross-field validation: end date must not be before start date. */
function validateEndBeforeStart(startDate: string, durationValue: string): string | undefined {
  if (!startDate || !durationValue) {
    return undefined;
  }
  const days = parseDurationInput(durationValue);
  if (days == null || days < 1) {
    return undefined;
  }
  const start = parseISO(startDate);
  if (!isValid(start)) {
    return undefined;
  }
  const end = addDays(start, days - 1);
  // If end < start, it's invalid (shouldn't happen with days >= 1, but defensive)
  if (end < start) {
    return m.validation_cycle_end_before_start();
  }
  return undefined;
}

/** End-date picker validation: picked end date must not be before start date. */
function validatePickedEndDateBeforeStart(startDate: string, endDate: string): string | undefined {
  if (!startDate || !endDate) {
    return undefined;
  }

  const start = parseISO(startDate);
  const end = parseISO(endDate);
  if (!isValid(start) || !isValid(end)) {
    return undefined;
  }

  return end < start ? m.validation_cycle_end_before_start() : undefined;
}

// ─── Error helper ─────────────────────────────────────────────────────

function toFieldErrors(errors: readonly unknown[]): Array<{ message?: string }> {
  return errors.flatMap((error) => {
    if (typeof error === "string") {
      return [{ message: error }];
    }
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return [{ message: error.message }];
    }
    return [];
  });
}

// ─── Component ────────────────────────────────────────────────────────

export function AddMenstrualCycleDialog({
  personId,
  patientId,
  mode = "create",
  initialCycle,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: Readonly<AddMenstrualCycleDialogProps>) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Track the last user-picked end date so the picker retains its visual state
  // even when the user switches to typing duration directly.
  const [pickedEndDate, setPickedEndDate] = useState<string>("");
  // Ref to track whether the user is currently editing end date (vs duration)
  // to avoid updating the picker value while they're interacting with it.
  const isEditingEndDate = useRef(false);
  const isEditing = mode === "edit";

  const form = useForm({
    defaultValues: defaultValues(isEditing ? initialCycle : null),
    onSubmit: async ({ value }) => {
      if (!patientId) {
        toast.error(m.onboarding_error());
        return;
      }

      setSaving(true);
      try {
        const payload = {
          startDate: value.startDate,
          durationDays: parseDurationInput(value.durationDays),
          notes: value.notes,
        } satisfies MenstrualCycleRecordFormData;

        if (isEditing) {
          await updateMenstrualCycle(
            payload,
            {
              startObservationId: initialCycle?.startObservationId,
              durationObservationId: initialCycle?.durationObservationId,
            },
            patientId,
            selectedOrg?.id ?? "",
            user?.id ?? "",
            user?.name ?? "",
          );
        } else {
          await logMenstrualCycle(
            payload,
            patientId,
            selectedOrg?.id ?? "",
            user?.id ?? "",
            user?.name ?? "",
          );
        }

        await invalidatePersonDetail(queryClient, personId);
        toast.success(m.menstrual_cycle_add_success());
        setOpen(false);
        setPickedEndDate("");
        form.reset(defaultValues(isEditing ? initialCycle : null));
      } catch {
        toast.error(m.onboarding_error());
      } finally {
        setSaving(false);
      }
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    setPickedEndDate("");
    isEditingEndDate.current = false;
    form.reset(defaultValues(isEditing ? initialCycle : null));
  }, [
    form,
    initialCycle,
    isEditing,
    open,
    initialCycle?.durationDays,
    initialCycle?.endDate,
    initialCycle?.notes,
    initialCycle?.startDate,
  ]);

  /** Called when the user picks a date in the End Date picker. */
  function handleEndDatePick(dateStr: string) {
    isEditingEndDate.current = true;
    setPickedEndDate(dateStr);

    const startDate = form.getFieldValue("startDate");
    if (startDate && dateStr) {
      const start = parseISO(startDate);
      const end = parseISO(dateStr);
      if (isValid(start) && isValid(end)) {
        const days = differenceInDays(end, start) + 1;
        if (days >= 1 && days <= 30) {
          form.setFieldValue("durationDays", String(days));
          return;
        }
      }
    }
    // If start date not set or end before start, clear duration
    form.setFieldValue("durationDays", "");
  }

  /** Called when the user types in the Duration input. */
  function handleDurationChange(value: string) {
    isEditingEndDate.current = false;
    setPickedEndDate(""); // Clear the picker — user is now entering duration directly
    form.setFieldValue("durationDays", value);
  }

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        trigger={children === undefined ? undefined : (children as React.ReactElement)}
        title={isEditing ? m.menstrual_cycle_edit_dialog_title() : m.menstrual_cycle_dialog_title()}
        description={m.menstrual_cycle_dialog_desc()}
        contentClassName="sm:max-w-lg"
        saving={saving}
        onDelete={
          isEditing && initialCycle?.startObservationId ? () => setDeleteOpen(true) : undefined
        }
        onSubmit={() => form.handleSubmit()}
      >
        <FieldGroup>
          {/* ── Start Date (required) ── */}
          <form.Field
            name="startDate"
            validators={{ onSubmit: ({ value }) => validateStartDate(value) }}
          >
            {(field) => {
              const errors = toFieldErrors(field.state.meta.errors);
              const isInvalid = errors.length > 0;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel required>{m.field_cycle_start_date()}</FieldLabel>
                  <DatePickerString
                    value={field.state.value}
                    onChange={(dateStr) => {
                      field.handleChange(dateStr);
                      // Recompute end-date-derived duration if user already picked an end date
                      if (isEditingEndDate.current && pickedEndDate && dateStr) {
                        const start = parseISO(dateStr);
                        const end = parseISO(pickedEndDate);
                        if (isValid(start) && isValid(end)) {
                          const days = differenceInDays(end, start) + 1;
                          if (days >= 1 && days <= 30) {
                            form.setFieldValue("durationDays", String(days));
                            return;
                          }
                        }
                      }
                    }}
                    disabled={saving}
                    endMonth={new Date()}
                  />
                  {isInvalid ? <FieldError errors={errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          {/* ── Period End — linked End Date + Duration ── */}
          <form.Subscribe
            selector={(state) => [state.values.startDate, state.values.durationDays] as const}
          >
            {([startDate, durationDays]) => {
              const computedEndDate = computeEndDateFromDuration(startDate, durationDays);
              const displayEndDate =
                isEditingEndDate.current && pickedEndDate
                  ? pickedEndDate
                  : (computedEndDate ?? pickedEndDate);

              return (
                <div className="space-y-2">
                  {/* Two-column layout: End Date | Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* End Date Picker */}
                    <Field>
                      <FieldLabel>{m.field_cycle_end_date()}</FieldLabel>
                      <DatePickerString
                        value={displayEndDate}
                        onChange={handleEndDatePick}
                        disabled={saving}
                        endMonth={new Date()}
                        startMonth={startDate ? parseISO(startDate) : undefined}
                      />
                    </Field>

                    {/* Duration Input */}
                    <form.Field
                      name="durationDays"
                      validators={{
                        onSubmit: ({ value }) => {
                          const start = form.getFieldValue("startDate");
                          const pickedEndDateErr = validatePickedEndDateBeforeStart(
                            start,
                            pickedEndDate,
                          );
                          return (
                            validateDurationDays(value) ??
                            pickedEndDateErr ??
                            validateEndBeforeStart(start, value)
                          );
                        },
                      }}
                    >
                      {(field) => {
                        const errors = toFieldErrors(field.state.meta.errors);
                        const isInvalid = errors.length > 0;

                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel>{m.field_cycle_duration_days()}</FieldLabel>
                            <Input
                              type="number"
                              inputMode="numeric"
                              min={1}
                              max={30}
                              value={field.state.value}
                              onChange={(event) => handleDurationChange(event.target.value)}
                              onBlur={field.handleBlur}
                              placeholder={m.field_cycle_duration_placeholder()}
                              disabled={saving}
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                          </Field>
                        );
                      }}
                    </form.Field>
                  </div>

                  {/* End-before-start warning */}
                  {startDate && (pickedEndDate || durationDays)
                    ? (() => {
                        const endBeforeStartErr =
                          validatePickedEndDateBeforeStart(startDate, pickedEndDate) ??
                          validateEndBeforeStart(startDate, durationDays);
                        if (!endBeforeStartErr) {
                          return null;
                        }
                        return (
                          <p
                            role="alert"
                            className="flex items-center gap-1.5 text-destructive text-xs"
                          >
                            <span aria-hidden>&#9888;</span>
                            {endBeforeStartErr}
                          </p>
                        );
                      })()
                    : null}

                  <FieldDescription>{m.field_cycle_end_desc()}</FieldDescription>
                </div>
              );
            }}
          </form.Subscribe>

          {/* ── Notes ── */}
          <form.Field name="notes">
            {(field) => (
              <Field>
                <FieldLabel>{m.field_cycle_notes()}</FieldLabel>
                <Textarea
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={m.field_cycle_notes_placeholder()}
                  rows={3}
                  disabled={saving}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>
      </FormDialog>

      <DeleteHistoryEntryDialog
        open={deleteOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setDeleteOpen(false);
          }
        }}
        deleting={deleting}
        onConfirm={async () => {
          const orgId = selectedOrg?.id ?? "";
          setDeleting(true);
          try {
            const startId = initialCycle?.startObservationId;
            const durationId = initialCycle?.durationObservationId;
            if (startId) {
              await deleteObservation(startId, orgId);
            }
            if (durationId) {
              await deleteObservation(durationId, orgId);
            }
            await invalidatePersonDetail(queryClient, personId);
            toast.success(m.menstrual_cycle_delete_success());
            setDeleteOpen(false);
            setOpen(false);
          } catch {
            toast.error(m.onboarding_error());
          } finally {
            setDeleting(false);
          }
        }}
      />
    </>
  );
}

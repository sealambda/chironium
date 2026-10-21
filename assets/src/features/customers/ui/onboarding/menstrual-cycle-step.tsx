import { useForm } from "@tanstack/react-form";
import { addDays, differenceInDays, isValid, parseISO } from "date-fns";
import { useEffect, useRef, useState } from "react";

import type { MenstrualCycleRecordFormData } from "@/features/customers/api/observations-api";
import * as m from "@/paraglide/messages";
import type { AdministrativeGender } from "@/shared/types/schema-enums";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { toDateInput } from "@/shared/utils/date-time-input";

import { StepLayout } from "./step-layout";

interface MenstrualCycleStepProps {
  readonly initialData?: MenstrualCycleRecordFormData;
  readonly gender?: AdministrativeGender;
  readonly onSubmit: (data: MenstrualCycleRecordFormData) => void;
  readonly onBack: () => void;
  readonly onSaveDraft?: (data: MenstrualCycleRecordFormData) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function parseDurationInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const d = Number.parseInt(trimmed, 10);
  return Number.isFinite(d) ? d : null;
}

function validateDurationDays(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const d = parseDurationInput(trimmed);
  return /^\d+$/.test(trimmed) && d != null && d >= 1 && d <= 30
    ? undefined
    : m.validation_cycle_duration_range();
}

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

/**
 * Capture last menstrual cycle start date, duration, and notes.
 * Start date is now required. End date and duration are linked: changing
 * one auto-calculates the other.
 * Auto-skips when gender is MALE.
 */
export function MenstrualCycleStep({
  initialData,
  gender,
  onSubmit,
  onBack,
  onSaveDraft,
}: MenstrualCycleStepProps) {
  // Auto-advance for male patients — menstrual cycle data is not applicable.
  useEffect(() => {
    if (gender === "MALE") {
      onSubmit({ startDate: "", durationDays: null, notes: "" });
    }
  }, [gender, onSubmit]);

  const [pickedEndDate, setPickedEndDate] = useState<string>("");
  const isEditingEndDate = useRef(false);

  const form = useForm({
    defaultValues: {
      startDate: initialData?.startDate ?? "",
      durationDays: initialData?.durationDays != null ? String(initialData.durationDays) : "",
      notes: initialData?.notes ?? "",
    },
    onSubmit: ({ value }) => {
      onSubmit({
        startDate: value.startDate,
        durationDays: parseDurationInput(value.durationDays),
        notes: value.notes,
      });
    },
  });

  if (gender === "MALE") {
    return null;
  }

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
    form.setFieldValue("durationDays", "");
  }

  function handleDurationChange(value: string) {
    isEditingEndDate.current = false;
    setPickedEndDate("");
    form.setFieldValue("durationDays", value);
  }

  const handleBack = () => {
    const v = form.state.values;
    onSaveDraft?.({
      startDate: v.startDate,
      durationDays: parseDurationInput(v.durationDays),
      notes: v.notes,
    });
    onBack();
  };

  return (
    <StepLayout
      title={m.step_cycle_title()}
      description={m.step_cycle_desc()}
      onSubmit={() => form.handleSubmit()}
      onBack={handleBack}
    >
      <FieldGroup>
        {/* ── Start Date ── */}
        <form.Field name="startDate">
          {(field) => {
            const errors = toFieldErrors(field.state.meta.errors);
            const isInvalid = errors.length > 0;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel>{m.field_cycle_start_date()}</FieldLabel>
                <DatePickerString
                  value={field.state.value}
                  onChange={(dateStr) => {
                    field.handleChange(dateStr);
                    // Recompute duration if user already picked an end date
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
                  endMonth={new Date()}
                />
                {isInvalid ? <FieldError errors={errors} /> : null}
              </Field>
            );
          }}
        </form.Field>

        {/* ── Period End — linked End Date + Duration ── */}
        <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
          <p className="mb-3 text-xs font-medium tracking-wide text-foreground uppercase">
            {m.field_cycle_end_date()}
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* End Date Picker */}
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
                  <>
                    <Field>
                      <FieldLabel>{m.field_cycle_end_date()}</FieldLabel>
                      <DatePickerString
                        value={displayEndDate}
                        onChange={handleEndDatePick}
                        endMonth={new Date()}
                        startMonth={startDate ? parseISO(startDate) : undefined}
                      />
                    </Field>

                    {/* Duration Input */}
                    <form.Field
                      name="durationDays"
                      validators={{
                        onSubmit: ({ value }) => validateDurationDays(value),
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
                              onChange={(e) => handleDurationChange(e.target.value)}
                              onBlur={field.handleBlur}
                              placeholder={m.field_cycle_duration_placeholder()}
                            />
                            {isInvalid ? <FieldError errors={errors} /> : null}
                          </Field>
                        );
                      }}
                    </form.Field>

                    <div className="col-span-full">
                      <FieldDescription>{m.field_cycle_end_desc()}</FieldDescription>
                    </div>
                  </>
                );
              }}
            </form.Subscribe>
          </div>
        </div>

        {/* ── Notes ── */}
        <form.Field name="notes">
          {(field) => (
            <Field>
              <FieldLabel>{m.field_cycle_notes()}</FieldLabel>
              <Textarea
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                placeholder={m.field_cycle_notes_placeholder()}
                rows={3}
              />
            </Field>
          )}
        </form.Field>
      </FieldGroup>
    </StepLayout>
  );
}

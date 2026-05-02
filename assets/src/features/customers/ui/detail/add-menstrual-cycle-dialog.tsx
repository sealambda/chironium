import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, differenceInDays, format, isValid, parseISO } from "date-fns";
import { useRef, useState } from "react";
import { toast } from "sonner";

import {
  logMenstrualCycle,
  type MenstrualCycleRecordFormData,
} from "@/features/customers/api/observations-api";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import { useOrg } from "@/features/org/hooks/use-org";
import { useCurrentUser } from "@/features/user/hooks/use-current-user";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
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
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { getDateLocale } from "@/shared/utils/date-locale";
import { toDateInput, todayDateInput } from "@/shared/utils/date-time-input";

// ─── Props ────────────────────────────────────────────────────────────

interface AddMenstrualCycleDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

interface MenstrualCycleFormValues {
  startDate: string;
  durationDays: string;
  notes: string;
}

// ─── i18n helpers (bridge until all messages are generated) ────────────

type LocalizedFallback = { readonly en: string; readonly es: string };

function localizedFallback(copy: LocalizedFallback): string {
  return copy[getLocale()];
}

function messageText(message: unknown, fallback: LocalizedFallback): string {
  if (typeof message === "function") {
    return message();
  }
  return typeof message === "string" ? message : localizedFallback(fallback);
}

// ─── Pure helpers ─────────────────────────────────────────────────────

function defaultValues(): MenstrualCycleFormValues {
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

/** Format end date for display to the user. */
function formatComputedEndDate(startDate: string, durationValue: string): string | null {
  const computed = computeEndDateFromDuration(startDate, durationValue);
  if (!computed) {
    return null;
  }
  const parsed = parseISO(computed);
  if (!isValid(parsed)) {
    return null;
  }
  return format(parsed, "MMM d, yyyy", { locale: getDateLocale() });
}

// ─── Validators ───────────────────────────────────────────────────────

function validateStartDate(value: string): string | undefined {
  return value.trim()
    ? undefined
    : messageText(m.validation_cycle_start_required, {
        en: "Choose a period start date.",
        es: "Elige la fecha de inicio del periodo.",
      });
}

function validateDurationDays(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const durationDays = parseDurationInput(trimmed);
  return /^\d+$/.test(trimmed) && durationDays != null && durationDays >= 1 && durationDays <= 30
    ? undefined
    : messageText(m.validation_cycle_duration_range, {
        en: "Enter 1 to 30 days.",
        es: "Introduce entre 1 y 30 días.",
      });
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
    return messageText(m.validation_cycle_end_before_start, {
      en: "End date cannot be before start date.",
      es: "La fecha de fin no puede ser anterior a la de inicio.",
    });
  }
  return undefined;
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
  const { selectedOrg } = useOrg();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();

  // Track the last user-picked end date so the picker retains its visual state
  // even when the user switches to typing duration directly.
  const [pickedEndDate, setPickedEndDate] = useState<string>("");
  // Ref to track whether the user is currently editing end date (vs duration)
  // to avoid updating the picker value while they're interacting with it.
  const isEditingEndDate = useRef(false);

  const form = useForm({
    defaultValues: defaultValues(),
    onSubmit: async ({ value }) => {
      if (!patientId) {
        toast.error(
          messageText(m.onboarding_error, {
            en: "Something went wrong. Please try again.",
            es: "Algo salió mal. Inténtalo de nuevo.",
          }),
        );
        return;
      }

      setSaving(true);
      try {
        await logMenstrualCycle(
          {
            startDate: value.startDate,
            durationDays: parseDurationInput(value.durationDays),
            notes: value.notes,
          } satisfies MenstrualCycleRecordFormData,
          patientId,
          selectedOrg?.id ?? "",
          user?.id ?? "",
          user?.name ?? "",
        );
        await invalidatePersonDetail(queryClient, personId);
        toast.success(
          messageText(m.menstrual_cycle_add_success, {
            en: "Menstrual cycle saved.",
            es: "Ciclo menstrual guardado.",
          }),
        );
        setOpen(false);
        setPickedEndDate("");
        form.reset(defaultValues());
      } catch {
        toast.error(
          messageText(m.onboarding_error, {
            en: "Something went wrong. Please try again.",
            es: "Algo salió mal. Inténtalo de nuevo.",
          }),
        );
      } finally {
        setSaving(false);
      }
    },
  });

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
    <Dialog open={open} onOpenChange={setOpen}>
      {children !== undefined && <DialogTrigger render={children as React.ReactElement} />}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {messageText(m.menstrual_cycle_dialog_title, {
              en: "Add menstrual cycle",
              es: "Añadir ciclo menstrual",
            })}
          </DialogTitle>
          <DialogDescription>
            {messageText(m.menstrual_cycle_dialog_desc, {
              en: "Record the start date and duration of the latest period.",
              es: "Registra la fecha de inicio y la duración del último periodo.",
            })}
          </DialogDescription>
        </DialogHeader>

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
                  <FieldLabel required>
                    {messageText(m.field_cycle_start_date, {
                      en: "Start date",
                      es: "Fecha de inicio",
                    })}
                  </FieldLabel>
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
          <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
            <p className="mb-3 font-medium text-foreground text-xs uppercase tracking-wide">
              {messageText(m.field_cycle_end_date, {
                en: "Period end",
                es: "Fin del periodo",
              })}
            </p>

            <form.Subscribe
              selector={(state) => [state.values.startDate, state.values.durationDays] as const}
            >
              {([startDate, durationDays]) => {
                const computedEndDate = computeEndDateFromDuration(startDate, durationDays);
                const displayEndDate =
                  isEditingEndDate.current && pickedEndDate
                    ? pickedEndDate
                    : (computedEndDate ?? pickedEndDate);
                const formattedComputed = formatComputedEndDate(startDate, durationDays);

                return (
                  <>
                    {/* Two-column layout: End Date | Duration */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* End Date Picker */}
                      <Field>
                        <FieldLabel>
                          {messageText(m.field_cycle_end_date, {
                            en: "End date",
                            es: "Fecha de fin",
                          })}
                        </FieldLabel>
                        <DatePickerString
                          value={displayEndDate}
                          onChange={handleEndDatePick}
                          disabled={saving}
                          endMonth={new Date()}
                          startMonth={startDate ? parseISO(startDate) : undefined}
                        />
                        <FieldDescription>
                          {messageText(m.field_cycle_end_desc, {
                            en: "Pick an end date to calculate duration.",
                            es: "Elige una fecha de fin para calcular la duración.",
                          })}
                        </FieldDescription>
                      </Field>

                      {/* Duration Input */}
                      <form.Field
                        name="durationDays"
                        validators={{
                          onSubmit: ({ value }) => {
                            const start = form.getFieldValue("startDate");
                            return (
                              validateDurationDays(value) ?? validateEndBeforeStart(start, value)
                            );
                          },
                        }}
                      >
                        {(field) => {
                          const errors = toFieldErrors(field.state.meta.errors);
                          const isInvalid = errors.length > 0;

                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel>
                                {messageText(m.field_cycle_duration_days, {
                                  en: "Duration (days)",
                                  es: "Duración (días)",
                                })}
                              </FieldLabel>
                              <Input
                                type="number"
                                inputMode="numeric"
                                min={1}
                                max={30}
                                value={field.state.value}
                                onChange={(event) => handleDurationChange(event.target.value)}
                                onBlur={field.handleBlur}
                                placeholder={messageText(m.field_cycle_duration_placeholder, {
                                  en: "e.g. 5",
                                  es: "p. ej. 5",
                                })}
                                disabled={saving}
                              />
                              {isInvalid ? <FieldError errors={errors} /> : null}
                              <FieldDescription>
                                {messageText(m.field_cycle_duration_desc, {
                                  en: "Leave blank if the period is ongoing.",
                                  es: "Déjalo en blanco si el periodo sigue en curso.",
                                })}
                              </FieldDescription>
                            </Field>
                          );
                        }}
                      </form.Field>
                    </div>

                    {/* Computed end date display (from duration) */}
                    {!isEditingEndDate.current && formattedComputed ? (
                      <p className="mt-2 flex items-center gap-1.5 text-muted-foreground text-xs">
                        <span aria-hidden>&#8594;</span>
                        {m.menstrual_cycle_estimated_end({ date: formattedComputed })}
                      </p>
                    ) : null}

                    {/* End-before-start warning */}
                    {startDate && durationDays
                      ? (() => {
                          const endBeforeStartErr = validateEndBeforeStart(startDate, durationDays);
                          if (!endBeforeStartErr) {
                            return null;
                          }
                          return (
                            <p
                              role="alert"
                              className="mt-2 flex items-center gap-1.5 text-destructive text-xs"
                            >
                              <span aria-hidden>&#9888;</span>
                              {endBeforeStartErr}
                            </p>
                          );
                        })()
                      : null}
                  </>
                );
              }}
            </form.Subscribe>
          </div>

          {/* ── Notes ── */}
          <form.Field name="notes">
            {(field) => (
              <Field>
                <FieldLabel>
                  {messageText(m.field_cycle_notes, {
                    en: "Additional notes",
                    es: "Notas adicionales",
                  })}
                </FieldLabel>
                <Textarea
                  value={field.state.value}
                  onChange={(event) => field.handleChange(event.target.value)}
                  onBlur={field.handleBlur}
                  placeholder={messageText(m.field_cycle_notes_placeholder, {
                    en: "Any additional information about the menstrual cycle…",
                    es: "Información adicional sobre el ciclo menstrual…",
                  })}
                  rows={3}
                  disabled={saving}
                />
              </Field>
            )}
          </form.Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {messageText(m.common_cancel, { en: "Cancel", es: "Cancelar" })}
          </Button>
          <form.Subscribe selector={(state) => [state.canSubmit, state.values.startDate] as const}>
            {([canSubmit, startDate]) => (
              <Button
                onClick={() => form.handleSubmit()}
                loading={saving}
                disabled={!canSubmit || !startDate.trim()}
              >
                {messageText(m.menstrual_cycle_dialog_submit, {
                  en: "Save cycle",
                  es: "Guardar ciclo",
                })}
              </Button>
            )}
          </form.Subscribe>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

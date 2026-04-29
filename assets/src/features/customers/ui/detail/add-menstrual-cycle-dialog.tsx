import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, isValid, parseISO } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { logMenstrualCycle } from "@/features/customers/api/observations-api";
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
import { toDateInput } from "@/shared/utils/date-time-input";
import { personQueryKeys } from "@/shared/utils/query-keys";

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

function messageWithDate(message: unknown, date: string): string {
  if (typeof message === "function") {
    return message({ date });
  }
  return localizedFallback({
    en: `Estimated end: ${date}`,
    es: `Fin estimado: ${date}`,
  });
}

function defaultValues(): MenstrualCycleFormValues {
  return {
    startDate: toDateInput(new Date()),
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

function formatEstimatedEndDate(startDate: string, durationValue: string): string | null {
  const durationDays = parseDurationInput(durationValue);
  if (!startDate || durationDays == null || durationDays < 1) {
    return null;
  }

  const parsedStart = parseISO(startDate);
  if (!isValid(parsedStart)) {
    return null;
  }

  return format(addDays(parsedStart, durationDays - 1), "MMM d, yyyy", {
    locale: getDateLocale(),
  });
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
          },
          patientId,
          selectedOrg?.id ?? "",
          user?.id ?? "",
          user?.name ?? "",
        );
        await queryClient.invalidateQueries({
          queryKey: personQueryKeys.menstrualCycleScope(personId),
        });
        toast.success(
          messageText(m.menstrual_cycle_add_success, {
            en: "Menstrual cycle saved.",
            es: "Ciclo menstrual guardado.",
          }),
        );
        setOpen(false);
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
          <form.Field
            name="startDate"
            validators={{ onSubmit: ({ value }) => validateStartDate(value) }}
          >
            {(field) => {
              const errors = toFieldErrors(field.state.meta.errors);
              const isInvalid = errors.length > 0;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel>
                    {messageText(m.field_cycle_start_date, {
                      en: "Start date",
                      es: "Fecha de inicio",
                    })}
                  </FieldLabel>
                  <DatePickerString
                    value={field.state.value}
                    onChange={field.handleChange}
                    disabled={saving}
                    endMonth={new Date()}
                  />
                  {isInvalid ? <FieldError errors={errors} /> : null}
                </Field>
              );
            }}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.startDate}>
            {(startDate) => (
              <form.Field
                name="durationDays"
                validators={{ onSubmit: ({ value }) => validateDurationDays(value) }}
              >
                {(field) => {
                  const errors = toFieldErrors(field.state.meta.errors);
                  const isInvalid = errors.length > 0;
                  const estimatedEndDate = formatEstimatedEndDate(startDate, field.state.value);

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
                        onChange={(event) => field.handleChange(event.target.value)}
                        onBlur={field.handleBlur}
                        placeholder={messageText(m.field_cycle_duration_placeholder, {
                          en: "e.g. 5",
                          es: "p. ej. 5",
                        })}
                        disabled={saving}
                      />
                      {isInvalid ? <FieldError errors={errors} /> : null}
                      <FieldDescription>
                        {estimatedEndDate
                          ? messageWithDate(m.menstrual_cycle_estimated_end, estimatedEndDate)
                          : messageText(m.field_cycle_duration_desc, {
                              en: "Leave blank if the period is ongoing.",
                              es: "Déjalo en blanco si el periodo sigue en curso.",
                            })}
                      </FieldDescription>
                    </Field>
                  );
                }}
              </form.Field>
            )}
          </form.Subscribe>

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
                    en: "Any additional information about the menstrual cycle...",
                    es: "Información adicional sobre el ciclo menstrual...",
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

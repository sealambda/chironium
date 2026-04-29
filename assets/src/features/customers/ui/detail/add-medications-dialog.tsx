import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  createMedicationsFromTags,
  type MedicationCreateOptions,
} from "@/features/customers/api/medications-api";
import { useOrg } from "@/features/org/hooks/use-org";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import type { TerminologyTag } from "@/shared/types/terminology";
import { Button } from "@/shared/ui/button";
import { DatePickerString } from "@/shared/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { TerminologyTagInput } from "@/shared/ui/terminology-tag-input";
import { toDateInput } from "@/shared/utils/date-time-input";
import { personQueryKeys } from "@/shared/utils/query-keys";

type MedicationCourseState = "current" | "past";

const MEDICATION_COURSE_OPTIONS: readonly {
  value: MedicationCourseState;
  label: () => string;
}[] = [
  { value: "current", label: m.medication_usage_current },
  { value: "past", label: m.medication_usage_past },
];

function todayDateInput(): string {
  return toDateInput(new Date());
}

function toUtcDateTimeStart(date: string): string | undefined {
  return date ? `${date}T09:00:00.000Z` : undefined;
}

function toUtcDateTimeEnd(date: string): string | undefined {
  return date ? `${date}T23:59:59.999Z` : undefined;
}

interface MedicationDateErrors {
  startDate?: string;
  endDate?: string;
}

function getMedicationDateErrors(args: {
  courseState: MedicationCourseState;
  startDate: string;
  endDate: string;
  today: string;
}): MedicationDateErrors {
  const errors: MedicationDateErrors = {};

  if (args.startDate && args.startDate > args.today) {
    errors.startDate = m.medication_date_future_error();
  }

  if (args.courseState === "past") {
    if (!args.endDate) {
      errors.endDate = m.medication_end_required();
    } else if (args.endDate > args.today) {
      errors.endDate = m.medication_date_future_error();
    } else if (args.startDate && args.endDate < args.startDate) {
      errors.endDate = m.medication_end_before_start_error();
    }
  }

  return errors;
}

function buildEffectivePeriod(
  courseState: MedicationCourseState,
  startDate: string,
  endDate: string,
): MedicationCreateOptions["effectivePeriod"] {
  const start = toUtcDateTimeStart(startDate);
  const end = courseState === "past" ? toUtcDateTimeEnd(endDate) : undefined;

  if (!start && !end) {
    return undefined;
  }

  return { start, end };
}

interface AddMedicationsDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function AddMedicationsDialog({
  personId,
  patientId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddMedicationsDialogProps) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<TerminologyTag[]>([]);
  const [courseState, setCourseState] = useState<MedicationCourseState>("current");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const today = todayDateInput();
  const dateErrors = getMedicationDateErrors({
    courseState,
    startDate,
    endDate,
    today,
  });
  const hasDateErrors = Object.values(dateErrors).some(Boolean);
  const canSubmit = tags.length > 0 && !hasDateErrors;

  const resetForm = () => {
    setTags([]);
    setCourseState("current");
    setStartDate("");
    setEndDate("");
  };

  const handleSubmit = async () => {
    if (!canSubmit || !patientId) {
      if (!patientId) {
        toast.error(m.onboarding_error());
      }
      return;
    }

    setSaving(true);
    try {
      await createMedicationsFromTags(tags, patientId, selectedOrg?.id ?? "", {
        status: "RECORDED",
        effectivePeriod: buildEffectivePeriod(courseState, startDate, endDate),
      });

      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.medicationsScope(personId),
      });
      await queryClient.invalidateQueries({
        queryKey: personQueryKeys.patientDetailScope(personId),
      });

      toast.success(m.medication_add_success());
      setOpen(false);
      resetForm();
    } catch {
      toast.error(m.onboarding_error());
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children !== undefined && <DialogTrigger render={children as React.ReactElement} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.medication_dialog_title()}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <TerminologyTagInput
            label={m.medication_list_label()}
            placeholder={m.medication_field_placeholder()}
            tags={tags}
            onAdd={(tag) => setTags((prev) => [...prev, tag])}
            onRemove={(i) => setTags((prev) => prev.filter((_, idx) => idx !== i))}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="MEDICATION"
            addLabel={m.common_add()}
            disabled={saving}
          />

          <Field>
            <FieldLabel>{m.medication_usage_label()}</FieldLabel>
            <Select
              value={courseState}
              onValueChange={(value) => {
                const nextState = (value ?? "current") as MedicationCourseState;
                setCourseState(nextState);
                if (nextState === "current") {
                  setEndDate("");
                }
              }}
              disabled={saving}
              items={MEDICATION_COURSE_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label(),
              }))}
            >
              <SelectTrigger className="w-full" disabled={saving}>
                <SelectValue />
              </SelectTrigger>
              <SelectPositioner>
                <SelectContent>
                  {MEDICATION_COURSE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPositioner>
            </Select>
          </Field>

          <Field data-invalid={Boolean(dateErrors.startDate)}>
            <FieldLabel>{m.medication_start_date()}</FieldLabel>
            <DatePickerString
              value={startDate}
              onChange={setStartDate}
              disabled={saving}
              endMonth={new Date()}
            />
            {dateErrors.startDate ? <FieldError>{dateErrors.startDate}</FieldError> : null}
          </Field>

          {courseState === "past" ? (
            <Field data-invalid={Boolean(dateErrors.endDate)}>
              <FieldLabel>{m.medication_end_date()}</FieldLabel>
              <DatePickerString
                value={endDate}
                onChange={setEndDate}
                disabled={saving}
                endMonth={new Date()}
              />
              {dateErrors.endDate ? <FieldError>{dateErrors.endDate}</FieldError> : null}
            </Field>
          ) : null}
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => void handleSubmit()} loading={saving} disabled={!canSubmit}>
            {m.medication_dialog_submit()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

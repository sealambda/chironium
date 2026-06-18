import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  type ConditionClinicalStatus,
  createConditionsFromTags,
} from "@/features/customers/api/condition-api";
import { useTerminologyTagList } from "@/features/customers/hooks/use-terminology-tag-list";
import { invalidatePersonDetail } from "@/features/customers/utils/person-detail-cache";
import * as m from "@/paraglide/messages";
import { useControllableState } from "@/shared/hooks/use-controllable-state";
import { useOrg } from "@/shared/session/use-org";
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
import { toDateTimeStart, todayDateInput } from "@/shared/utils/date-time-input";

const ABATED_CONDITION_STATUSES: Set<ConditionClinicalStatus> = new Set([
  "INACTIVE",
  "REMISSION",
  "RESOLVED",
]);

const CONDITION_STATUS_OPTIONS: readonly {
  value: ConditionClinicalStatus;
  label: () => string;
}[] = [
  { value: "ACTIVE", label: m.fhir_clinical_active },
  { value: "RESOLVED", label: m.fhir_clinical_resolved },
  { value: "REMISSION", label: m.fhir_clinical_remission },
  { value: "INACTIVE", label: m.fhir_clinical_inactive },
];

function isAbatedStatus(status: ConditionClinicalStatus): boolean {
  return ABATED_CONDITION_STATUSES.has(status);
}

interface ConditionDateErrors {
  onsetDate?: string;
  abatementDate?: string;
}

function getConditionDateErrors(args: {
  onsetDate: string;
  abatementDate: string;
  clinicalStatus: ConditionClinicalStatus;
  today: string;
}): ConditionDateErrors {
  const errors: ConditionDateErrors = {};

  if (args.onsetDate && args.onsetDate > args.today) {
    errors.onsetDate = m.condition_date_future_error();
  }

  if (isAbatedStatus(args.clinicalStatus)) {
    if (!args.abatementDate) {
      errors.abatementDate = m.condition_resolution_required();
    } else if (args.abatementDate > args.today) {
      errors.abatementDate = m.condition_date_future_error();
    } else if (args.onsetDate && args.abatementDate < args.onsetDate) {
      errors.abatementDate = m.condition_resolution_before_onset_error();
    }
  }

  return errors;
}

interface AddConditionsDialogProps {
  readonly personId: string;
  readonly patientId: string | null;
  readonly children?: React.ReactNode;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export function AddConditionsDialog({
  personId,
  patientId,
  children,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: AddConditionsDialogProps) {
  const [open, setOpen] = useControllableState({
    value: controlledOpen,
    defaultValue: false,
    onChange: controlledOnOpenChange,
  });
  const [saving, setSaving] = useState(false);
  const tags = useTerminologyTagList();
  const [clinicalStatus, setClinicalStatus] = useState<ConditionClinicalStatus>("ACTIVE");
  const [onsetDate, setOnsetDate] = useState("");
  const [abatementDate, setAbatementDate] = useState("");
  const { selectedOrg } = useOrg();
  const queryClient = useQueryClient();

  const today = todayDateInput();
  const needsAbatementDate = isAbatedStatus(clinicalStatus);
  const dateErrors = getConditionDateErrors({
    onsetDate,
    abatementDate,
    clinicalStatus,
    today,
  });
  const hasDateErrors = Object.values(dateErrors).some(Boolean);
  const canSubmit = tags.tags.length > 0 && !hasDateErrors;

  const resetForm = () => {
    tags.resetTags();
    setClinicalStatus("ACTIVE");
    setOnsetDate("");
    setAbatementDate("");
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
      await createConditionsFromTags(tags.tags, patientId, selectedOrg?.id ?? "", {
        clinicalStatus,
        verificationStatus: "CONFIRMED",
        onsetDateTime: toDateTimeStart(onsetDate),
        abatementDateTime: needsAbatementDate ? toDateTimeStart(abatementDate) : undefined,
      });

      await invalidatePersonDetail(queryClient, personId);

      toast.success(m.condition_add_success());
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
          <DialogTitle>{m.condition_dialog_title()}</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <TerminologyTagInput
            label={m.condition_list_label()}
            placeholder={m.condition_field_placeholder()}
            tags={tags.tags}
            onAdd={tags.addTag}
            onRemove={tags.removeTag}
            organizationId={selectedOrg?.id ?? ""}
            conceptContext="CONDITION"
            addLabel={m.common_add()}
            disabled={saving}
          />

          <Field>
            <FieldLabel>{m.common_clinical_status()}</FieldLabel>
            <Select
              value={clinicalStatus}
              onValueChange={(status: ConditionClinicalStatus | null = "ACTIVE") => {
                if (!status) {
                  return;
                }

                setClinicalStatus(status);
                if (!isAbatedStatus(status)) {
                  setAbatementDate("");
                }
              }}
              disabled={saving}
              items={CONDITION_STATUS_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label(),
              }))}
            >
              <SelectTrigger className="w-full" disabled={saving}>
                <SelectValue />
              </SelectTrigger>
              <SelectPositioner>
                <SelectContent>
                  {CONDITION_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </SelectPositioner>
            </Select>
          </Field>

          <div className={needsAbatementDate ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
            <Field data-invalid={Boolean(dateErrors.onsetDate)}>
              <FieldLabel>{m.condition_diagnosis_date()}</FieldLabel>
              <DatePickerString
                value={onsetDate}
                onChange={setOnsetDate}
                disabled={saving}
                endMonth={new Date()}
              />
              {dateErrors.onsetDate ? <FieldError>{dateErrors.onsetDate}</FieldError> : null}
            </Field>

            {needsAbatementDate ? (
              <Field data-invalid={Boolean(dateErrors.abatementDate)}>
                <FieldLabel>{m.condition_resolution_date()}</FieldLabel>
                <DatePickerString
                  value={abatementDate}
                  onChange={setAbatementDate}
                  disabled={saving}
                  endMonth={new Date()}
                />
                {dateErrors.abatementDate ? (
                  <FieldError>{dateErrors.abatementDate}</FieldError>
                ) : null}
              </Field>
            ) : null}
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            {m.common_cancel()}
          </Button>
          <Button onClick={() => void handleSubmit()} loading={saving} disabled={!canSubmit}>
            {m.common_save()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

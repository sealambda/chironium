import { Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { PlanFormData } from "@/features/org/api/org-api";
import * as m from "@/paraglide/messages";
import { type DurationUnit, supportedDurationUnits } from "@/shared/types/schema-enums";
import { Button } from "@/shared/ui/button";
import { DialogFooter } from "@/shared/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  formatDurationWithUnit,
  getDurationUnitLabel,
  normalizeDuration,
} from "@/shared/utils/subscriptions-utils";

interface PlansStepProps {
  readonly initialData?: PlanFormData[];
  readonly isSubmitting?: boolean;
  readonly onFinish: (plans: PlanFormData[]) => void;
  readonly onBack: () => void;
}

const DURATION_UNITS = supportedDurationUnits.map((unit) => ({
  value: unit,
  label: getDurationUnitLabel(unit),
}));

interface LocalPlan extends PlanFormData {
  localId: string;
}

/**
 * Step 2: Define subscription plans for the new organization.
 * Plans are accumulated locally and submitted in batch on finish.
 */
export function PlansStep({ initialData, isSubmitting, onFinish, onBack }: PlansStepProps) {
  const idPrefix = useId();
  const counterRef = useRef(0);
  const nextId = () => `${idPrefix}-${++counterRef.current}`;

  const [name, setName] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [plans, setPlans] = useState<LocalPlan[]>(() =>
    (initialData ?? []).map((p) => ({ ...p, localId: nextId() })),
  );

  const submitting = isSubmitting ?? false;

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = m.validation_required();
    }
    if (!durationValue || Number(durationValue) <= 0) {
      newErrors.durationValue = m.validation_required();
    }
    if (!durationUnit) {
      newErrors.durationUnit = m.validation_required();
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setName("");
    setDurationValue("");
    setDurationUnit("");
    setPendingError("");
  };

  const handleAddPlan = () => {
    if (!validate()) {
      return;
    }

    const normalized = normalizeDuration(Number(durationValue), durationUnit as DurationUnit);
    setPlans((prev) => [
      ...prev,
      {
        localId: nextId(),
        name: name.trim(),
        durationValue: normalized.value,
        durationUnit: normalized.unit,
        priceAmount: 0,
        currency: "EUR",
      },
    ]);
    resetForm();
  };

  const handleRemovePlan = (localId: string) => {
    setPlans((prev) => prev.filter((p) => p.localId !== localId));
  };

  const [pendingError, setPendingError] = useState("");

  const handleFinish = () => {
    const hasInput = name.trim() || durationUnit || durationValue;
    if (hasInput) {
      setPendingError(m.validation_pending_input());
      return;
    }
    onFinish(plans.map(({ localId: _, ...data }) => data));
  };

  return (
    <>
      <div className="space-y-4">
        <FieldGroup>
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel>{m.plan_name()}</FieldLabel>
            <Input
              data-testid="create-org-plan-name-input"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: "" }));
                }
              }}
              placeholder={m.plan_name_placeholder()}
              disabled={submitting}
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name ? <FieldError>{errors.name}</FieldError> : null}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={Boolean(errors.durationValue)}>
              <FieldLabel>{m.plan_duration_value()}</FieldLabel>
              <Input
                data-testid="create-org-plan-duration-value-input"
                type="number"
                min="1"
                value={durationValue}
                onChange={(e) => {
                  setDurationValue(e.target.value);
                  if (errors.durationValue) {
                    setErrors((prev) => ({ ...prev, durationValue: "" }));
                  }
                }}
                disabled={submitting}
                aria-invalid={Boolean(errors.durationValue)}
              />
              {errors.durationValue ? <FieldError>{errors.durationValue}</FieldError> : null}
            </Field>

            <Field data-invalid={Boolean(errors.durationUnit)}>
              <FieldLabel>{m.plan_duration_unit()}</FieldLabel>
              <Select
                value={durationUnit}
                onValueChange={(value) => {
                  setDurationUnit(value as DurationUnit);
                  if (errors.durationUnit) {
                    setErrors((prev) => ({ ...prev, durationUnit: "" }));
                  }
                }}
                disabled={submitting}
                items={DURATION_UNITS}
              >
                <SelectTrigger
                  className="w-full"
                  data-testid="create-org-plan-duration-unit-trigger"
                >
                  <SelectValue placeholder={m.duration_placeholder()} />
                </SelectTrigger>
                <SelectPositioner>
                  <SelectContent>
                    {DURATION_UNITS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectPositioner>
              </Select>
              {errors.durationUnit ? <FieldError>{errors.durationUnit}</FieldError> : null}
            </Field>
          </div>
        </FieldGroup>

        <Button
          data-testid="create-org-add-plan-button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddPlan}
          disabled={submitting}
        >
          <Plus className="size-4" data-icon="inline-start" />
          {m.plan_add()}
        </Button>

        <PlanList plans={plans} onRemove={handleRemovePlan} />
        {pendingError ? <p className="text-sm text-destructive">{pendingError}</p> : null}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          {m.common_back()}
        </Button>
        <Button onClick={handleFinish} disabled={submitting} data-testid="create-org-finish-button">
          {submitting ? m.common_creating() : m.common_finish()}
        </Button>
      </DialogFooter>
    </>
  );
}

interface PlanListProps {
  readonly plans: LocalPlan[];
  readonly onRemove: (localId: string) => void;
}

function PlanList({ plans, onRemove }: PlanListProps) {
  if (plans.length === 0) {
    return <p className="py-2 text-center text-sm text-muted-foreground">{m.plan_empty_hint()}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{m.plan_added({ count: plans.length })}</p>
      {plans.map((plan) => (
        <div
          key={plan.localId}
          className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{plan.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatDurationWithUnit(plan.durationValue, plan.durationUnit)}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(plan.localId)}
            aria-label={m.common_delete()}
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}

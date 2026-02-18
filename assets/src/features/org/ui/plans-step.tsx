import { Plus, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";

import type { PlanFormData } from "@/features/org/api/org-api";
import * as m from "@/paraglide/messages";
import type { DurationUnit } from "@/shared/types/schema-enums";
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

interface PlansStepProps {
  readonly initialData?: PlanFormData[];
  readonly isSubmitting?: boolean;
  readonly onFinish: (plans: PlanFormData[]) => void;
  readonly onBack: () => void;
}

const DURATION_UNITS: { value: DurationUnit; label: () => string }[] = [
  { value: "D", label: () => m.duration_days() },
  { value: "WK", label: () => m.duration_weeks() },
  { value: "MO", label: () => m.duration_months() },
  { value: "A", label: () => m.duration_years() },
];

function formatDurationUnit(code: DurationUnit): string {
  const unit = DURATION_UNITS.find((u) => u.value === code);
  return unit ? unit.label() : code;
}

interface LocalPlan extends PlanFormData {
  localId: string;
}

/**
 * Step 2: Define subscription plans for the new organisation.
 * Plans are accumulated locally and submitted in batch on finish.
 */
export function PlansStep({ initialData, isSubmitting, onFinish, onBack }: PlansStepProps) {
  const idPrefix = useId();
  const counterRef = useRef(0);
  const nextId = () => `${idPrefix}-${++counterRef.current}`;

  const [name, setName] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit | "">("");
  const [priceAmount, setPriceAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
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
    if (!priceAmount || Number(priceAmount) < 0) {
      newErrors.priceAmount = m.validation_required();
    }
    if (!currency.trim()) {
      newErrors.currency = m.validation_required();
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setName("");
    setDurationValue("");
    setDurationUnit("");
    setPriceAmount("");
    // Keep currency since it's likely the same for all plans.
  };

  const handleAddPlan = () => {
    if (!validate()) {
      return;
    }

    setPlans((prev) => [
      ...prev,
      {
        localId: nextId(),
        name: name.trim(),
        durationValue: Number(durationValue),
        durationUnit: durationUnit as DurationUnit,
        priceAmount: Number(priceAmount),
        currency: currency.trim(),
      },
    ]);
    resetForm();
  };

  const handleRemovePlan = (localId: string) => {
    setPlans((prev) => prev.filter((p) => p.localId !== localId));
  };

  const handleFinish = () => {
    const committed: PlanFormData[] = plans.map(({ localId: _, ...data }) => data);

    // Include unsaved form content if the user forgot to click "Add".
    const hasInput = name.trim() && durationUnit && durationValue && priceAmount;
    if (hasInput && validate()) {
      committed.push({
        name: name.trim(),
        durationValue: Number(durationValue),
        durationUnit: durationUnit as DurationUnit,
        priceAmount: Number(priceAmount),
        currency: currency.trim(),
      });
    }

    onFinish(committed);
  };

  return (
    <>
      <div className="space-y-4">
        <FieldGroup>
          <Field data-invalid={Boolean(errors.name)}>
            <FieldLabel>{m.plan_name()}</FieldLabel>
            <Input
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
                items={DURATION_UNITS.map(({ value, label }) => ({ value, label: label() }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={m.duration_placeholder()} />
                </SelectTrigger>
                <SelectPositioner>
                  <SelectContent>
                    {DURATION_UNITS.map((unit) => (
                      <SelectItem key={unit.value} value={unit.value}>
                        {unit.label()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectPositioner>
              </Select>
              {errors.durationUnit ? <FieldError>{errors.durationUnit}</FieldError> : null}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field data-invalid={Boolean(errors.priceAmount)}>
              <FieldLabel>{m.plan_price()}</FieldLabel>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={priceAmount}
                onChange={(e) => {
                  setPriceAmount(e.target.value);
                  if (errors.priceAmount) {
                    setErrors((prev) => ({ ...prev, priceAmount: "" }));
                  }
                }}
                disabled={submitting}
                aria-invalid={Boolean(errors.priceAmount)}
              />
              {errors.priceAmount ? <FieldError>{errors.priceAmount}</FieldError> : null}
            </Field>

            <Field data-invalid={Boolean(errors.currency)}>
              <FieldLabel>{m.plan_currency()}</FieldLabel>
              <Input
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  if (errors.currency) {
                    setErrors((prev) => ({ ...prev, currency: "" }));
                  }
                }}
                placeholder={m.plan_currency_placeholder()}
                disabled={submitting}
                aria-invalid={Boolean(errors.currency)}
              />
              {errors.currency ? <FieldError>{errors.currency}</FieldError> : null}
            </Field>
          </div>
        </FieldGroup>

        <Button
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
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          {m.common_back()}
        </Button>
        <Button onClick={handleFinish} disabled={submitting}>
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
    return <p className="py-2 text-center text-muted-foreground text-sm">{m.plan_empty_hint()}</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-muted-foreground text-xs">{m.plan_added({ count: plans.length })}</p>
      {plans.map((plan) => (
        <div
          key={plan.localId}
          className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-sm">{plan.name}</p>
            <p className="text-muted-foreground text-xs">
              {plan.durationValue} {formatDurationUnit(plan.durationUnit)}
              {plan.priceAmount ? ` · ${plan.priceAmount} ${plan.currency}` : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onRemove(plan.localId)}
            aria-label={m.plan_remove()}
          >
            <Trash2 className="size-3.5 text-muted-foreground" />
          </Button>
        </div>
      ))}
    </div>
  );
}

import { useState } from "react";
import { toast } from "sonner";

import { createSubscriptionPlan, type PlanFormData } from "@/features/org/api/org-api";
import * as m from "@/paraglide/messages";
import type { DurationUnit } from "@/shared/types/schema-enums";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
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
import { normalizeDuration } from "@/shared/utils/duration-utils";

interface AddSubscriptionPlanDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly organizationId: string;
  readonly onCreated: () => void;
}

const DURATION_UNITS: { value: DurationUnit; label: () => string }[] = [
  { value: "D", label: () => m.duration_days() },
  { value: "WK", label: () => m.duration_weeks() },
  { value: "MO", label: () => m.duration_months() },
  { value: "A", label: () => m.duration_years() },
];

/**
 * Dialog to create a single subscription plan for the current organization.
 */
export function AddSubscriptionPlanDialog({
  open,
  onOpenChange,
  organizationId,
  onCreated,
}: Readonly<AddSubscriptionPlanDialogProps>) {
  const [name, setName] = useState("");
  const [durationValue, setDurationValue] = useState("");
  const [durationUnit, setDurationUnit] = useState<DurationUnit | "">("");
  const [priceAmount, setPriceAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDurationValue("");
    setDurationUnit("");
    setPriceAmount("");
    setCurrency("EUR");
    setErrors({});
    setIsSubmitting(false);
  };

  const handleDismiss = () => {
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!name.trim()) {
      next.name = m.validation_required();
    }
    if (!durationValue || Number(durationValue) <= 0) {
      next.durationValue = m.validation_required();
    }
    if (!durationUnit) {
      next.durationUnit = m.validation_required();
    }
    const price = Number(priceAmount);
    if (priceAmount.trim() === "" || Number.isNaN(price) || price < 0) {
      next.priceAmount = m.validation_required();
    }
    if (!currency.trim()) {
      next.currency = m.validation_required();
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate() || !durationUnit) {
      return;
    }

    const normalized = normalizeDuration(Number(durationValue), durationUnit);
    const payload: PlanFormData = {
      name: name.trim(),
      durationValue: normalized.value,
      durationUnit: normalized.unit,
      priceAmount: Number(priceAmount),
      currency: currency.trim().toUpperCase(),
    };

    setIsSubmitting(true);
    try {
      await createSubscriptionPlan(payload, organizationId);
      toast.success(m.subscriptions_plan_created());
      onCreated();
      handleDismiss();
    } catch (err) {
      const message = err instanceof Error ? err.message : m.plan_create_error();
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          handleDismiss();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.subscriptions_dialog_title()}</DialogTitle>
        </DialogHeader>

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
              disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                aria-invalid={Boolean(errors.currency)}
              />
              {errors.currency ? <FieldError>{errors.currency}</FieldError> : null}
            </Field>
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDismiss} disabled={isSubmitting}>
            {m.common_cancel()}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={isSubmitting}>
            {isSubmitting ? m.common_creating() : m.subscriptions_add_plan()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import * as m from "@/paraglide/messages";
import type { SubscriptionPlan } from "@/shared/types/subscriptions";
import { DatePickerString } from "@/shared/ui/date-picker";
import { Field, FieldGroup, FieldLabel } from "@/shared/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectPositioner,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Skeleton } from "@/shared/ui/skeleton";
import { getTranslatedPlanLabel } from "@/shared/utils/subscriptions-utils";

interface SubscriptionFormFieldsProps {
  readonly plans: SubscriptionPlan[];
  readonly plansLoading: boolean;
  readonly planId: string;
  readonly startDate: string;
  readonly onPlanChange: (value: string) => void;
  readonly onStartDateChange: (value: string) => void;
  readonly planTriggerTestId?: string;
  readonly planOptionTestIdPrefix?: string;
  readonly startDateInputTestId?: string;
}

export function SubscriptionFormFields({
  plans,
  plansLoading,
  planId,
  startDate,
  onPlanChange,
  onStartDateChange,
  planTriggerTestId,
  planOptionTestIdPrefix,
  startDateInputTestId,
}: Readonly<SubscriptionFormFieldsProps>) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel>{m.field_plan()}</FieldLabel>
        <PlanSelector
          plans={plans}
          loading={plansLoading}
          value={planId}
          onChange={onPlanChange}
          triggerTestId={planTriggerTestId}
          optionTestIdPrefix={planOptionTestIdPrefix}
        />
      </Field>

      <Field>
        <FieldLabel>{m.field_start_date()}</FieldLabel>
        <DatePickerString
          value={startDate}
          onChange={onStartDateChange}
          inputTestId={startDateInputTestId}
          endMonth={new Date(new Date().getFullYear() + 5, 11, 31)}
        />
      </Field>
    </FieldGroup>
  );
}

interface PlanSelectorProps {
  readonly plans: SubscriptionPlan[];
  readonly loading: boolean;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly triggerTestId?: string;
  readonly optionTestIdPrefix?: string;
}

function PlanSelector({
  plans,
  loading,
  value,
  onChange,
  triggerTestId,
  optionTestIdPrefix,
}: Readonly<PlanSelectorProps>) {
  if (loading) {
    return <Skeleton className="h-9 w-full rounded-md" />;
  }

  if (plans.length === 0) {
    return <p className="text-sm text-muted-foreground">{m.plan_no_plans()}</p>;
  }

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => onChange(nextValue ?? "")}
      items={plans.map((plan) => ({
        value: plan.id,
        label: getTranslatedPlanLabel(plan),
      }))}
    >
      <SelectTrigger className="w-full" data-testid={triggerTestId}>
        <SelectValue placeholder={m.plan_placeholder()} />
      </SelectTrigger>
      <SelectPositioner>
        <SelectContent>
          {plans.map((plan) => (
            <SelectItem
              key={plan.id}
              value={plan.id}
              data-testid={optionTestIdPrefix ? `${optionTestIdPrefix}${plan.id}` : undefined}
            >
              {getTranslatedPlanLabel(plan)}
            </SelectItem>
          ))}
        </SelectContent>
      </SelectPositioner>
    </Select>
  );
}
